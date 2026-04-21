// @ts-nocheck
/**
 * ingest_legal_pdfs.ts
 * ─────────────────────────────────────────────────────────
 * Pipeline: PDF files in /data → extract text → regex parse
 * articles → clean text → upsert into DB (Act / Section).
 *
 * Run: npx ts-node scripts/ingest_legal_pdfs.ts
 * ─────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { prisma } from '../src/prisma';

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, '../data');

// Default Act meta when we can't detect from filename
const DEFAULT_ACT = {
  title: 'The Constitution of India',
  shortName: 'Constitution',
  year: 1950,
  description: 'The supreme law of India, adopted on 26 November 1949.',
};

// Max content length per section chunk (chars). Sections longer than
// this are split into sub-chunks labelled "Article XX (Part N)".
const MAX_CHUNK_CHARS = 3000;

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface ParsedArticle {
  number: string;       // "21", "21A", "21 (Part 2)"
  title: string;        // e.g. "Protection of life and personal liberty"
  content: string;      // Cleaned full text
  clauses: ParsedClause[];
}

interface ParsedClause {
  number: string;       // "(1)", "(2)", "(a)", etc.
  content: string;
}

// ─────────────────────────────────────────────────────────
// STEP 1 — TEXT EXTRACTION
// ─────────────────────────────────────────────────────────

async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// ─────────────────────────────────────────────────────────
// STEP 2 — TEXT CLEANING
// ─────────────────────────────────────────────────────────

function cleanRawText(raw: string): string {
  return raw
    // Normalise line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove running headers / footers (lines with only digits or
    // common header keywords, e.g. "CONSTITUTION OF INDIA 47")
    .replace(/^[ \t]*(?:THE CONSTITUTION OF INDIA|CONSTITUTION OF INDIA|Schedule|SCHEDULE|PART [A-Z]+)?[ \t]*\d{1,4}[ \t]*$/gim, '')
    // Remove isolated page numbers
    .replace(/^\s*\d{1,4}\s*$/gm, '')
    // Remove lines that are purely dashes / underscores (dividers)
    .replace(/^[-_=]{3,}\s*$/gm, '')
    // Collapse 3+ consecutive blank lines into two
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing spaces on each line
    .replace(/[ \t]+$/gm, '')
    // Replace multiple spaces with one
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────
// STEP 3 — ARTICLE DETECTION
// ─────────────────────────────────────────────────────────

/**
 * The Constitution of India uses patterns like:
 *   "Article 21. Protection of life..."
 *   "21. Protection..."       (in some PDFs after the word "Article" is on own line)
 *   "Article 21A."
 *
 * We build a two-pass parse:
 *  Pass 1: Find all Article header positions
 *  Pass 2: Slice text between consecutive headers
 */

// Matches: optional leading "Article " then number+optional letter then "."
// Header examples:
//   "Article 21. Protection of life and personal liberty"
//   "21A. Right to education"
//   "Article 370."
//
// Capture groups: [1] = number+letter, [2] = title (may be empty)
const ARTICLE_HEADER_RE =
  /^[ \t]*(?:Article[ \t]+)?(\d{1,3}[A-Z]?)\.[ \t]*([^\n]*)/im;

// Global version for splitting
const ARTICLE_SPLIT_RE =
  /(?:^|\n)[ \t]*(?:Article[ \t]+)?(\d{1,3}[A-Z]?)\.[ \t]*([^\n]*)/g;

function detectArticles(text: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];

  // Collect all match start positions + captures
  interface Match {
    index: number;
    number: string;
    titleLine: string;
  }

  const matches: Match[] = [];
  let m: RegExpExecArray | null;

  // Reset regex lastIndex
  ARTICLE_SPLIT_RE.lastIndex = 0;

  while ((m = ARTICLE_SPLIT_RE.exec(text)) !== null) {
    const num = m[1].trim();
    const titleLine = m[2].trim();

    // Skip very small article numbers that are likely clause refs (0-9 alone)
    // but allow 1-399 range which covers all current Indian Constitution articles
    const numericPart = parseInt(num, 10);
    if (isNaN(numericPart) || numericPart < 1 || numericPart > 500) continue;

    matches.push({ index: m.index, number: num, titleLine });
  }

  if (matches.length === 0) return articles;

  // Slice body text for each article
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;

    // Raw body is everything after the header line until next header
    const rawBody = text.slice(current.index, nextIndex);

    // Remove the header line itself from the body
    const bodyLines = rawBody.split('\n').slice(1);
    const body = bodyLines.join('\n');

    const { title, content, clauses } = parseArticleBody(current.number, current.titleLine, body);

    // Long articles: split into parts
    if (content.length > MAX_CHUNK_CHARS) {
      const parts = splitIntoChunks(content, MAX_CHUNK_CHARS);
      parts.forEach((part, idx) => {
        articles.push({
          number: parts.length > 1 ? `${current.number} (Part ${idx + 1})` : current.number,
          title,
          content: part.trim(),
          clauses: idx === 0 ? clauses : [], // attach clauses to first chunk only
        });
      });
    } else {
      articles.push({ number: current.number, title, content: content.trim(), clauses });
    }
  }

  return articles;
}

// ─────────────────────────────────────────────────────────
// STEP 3a — ARTICLE BODY PARSER (title + clauses)
// ─────────────────────────────────────────────────────────

/**
 * Clause patterns in Constitution:
 *   "(1) The State shall..."
 *   "(a) any right..."
 *   "Explanation.—..."
 */
const CLAUSE_RE = /^[ \t]*(\(\d+\)|\([a-z]\)|Explanation\.?—?)[ \t](.+)/;

function parseArticleBody(
  num: string,
  headerTitle: string,
  body: string
): { title: string; content: string; clauses: ParsedClause[] } {
  const lines = body.split('\n');
  const clauses: ParsedClause[] = [];
  const contentLines: string[] = [];

  // The first non-empty line after the header may be a continuation of the title
  // if the header title was empty (some PDFs break title on next line)
  let title = headerTitle;
  let bodyStart = 0;

  if (!title) {
    // Grab first non-blank line as title
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l) {
        title = l;
        bodyStart = i + 1;
        break;
      }
    }
  }

  title = cleanInlineText(title || `Article ${num}`);

  // Parse remaining lines for clauses and general content
  let currentClause: ParsedClause | null = null;

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentClause) {
        clauses.push(currentClause);
        currentClause = null;
      }
      continue;
    }

    const clauseMatch = trimmed.match(/^(\(\d+\)|\([a-z]\)|Explanation\.?—?)[ \t](.+)/);
    if (clauseMatch) {
      if (currentClause) clauses.push(currentClause);
      currentClause = {
        number: clauseMatch[1],
        content: cleanInlineText(clauseMatch[2]),
      };
    } else if (currentClause) {
      // Continuation of current clause
      currentClause.content += ' ' + cleanInlineText(trimmed);
    } else {
      contentLines.push(trimmed);
    }
  }

  if (currentClause) clauses.push(currentClause);

  // Build clean full content = general prose + formatted clauses
  let content = contentLines.map(cleanInlineText).join(' ').replace(/\s+/g, ' ').trim();
  if (clauses.length > 0) {
    const clauseBlock = clauses
      .map(c => `${c.number} ${c.content}`)
      .join('\n');
    content = content ? `${content}\n\n${clauseBlock}` : clauseBlock;
  }

  return { title, content, clauses };
}

// ─────────────────────────────────────────────────────────
// STEP 3b — INLINE TEXT CLEANER
// ─────────────────────────────────────────────────────────

function cleanInlineText(text: string): string {
  return text
    // Remove soft hyphens / ligature artifacts common in PDFs
    .replace(/\u00ad/g, '')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    // Normalise em-dash / en-dash patterns
    .replace(/[ \t]*—[ \t]*/g, '—')
    // Collapse internal whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────
// STEP 3c — CHUNK SPLITTER
// ─────────────────────────────────────────────────────────

/**
 * Splits a long string into chunks of ~maxChars, breaking at sentence
 * boundaries (". " or "\n") to preserve meaning.
 */
function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    // Find last sentence break before maxChars
    let cutAt = remaining.lastIndexOf('. ', maxChars);
    if (cutAt === -1) cutAt = remaining.lastIndexOf('\n', maxChars);
    if (cutAt === -1) cutAt = maxChars; // Hard cut as fallback

    chunks.push(remaining.slice(0, cutAt + 1).trim());
    remaining = remaining.slice(cutAt + 1).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

// ─────────────────────────────────────────────────────────
// STEP 4 — ACT METADATA DETECTION FROM FILENAME
// ─────────────────────────────────────────────────────────

function detectActMeta(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.includes('constitution') || lower.includes('01042024') || lower.includes('890312')) {
    return DEFAULT_ACT;
  }
  if (lower.includes('bns') || lower.includes('nyaya sanhita')) {
    return {
      title: 'Bharatiya Nyaya Sanhita, 2023',
      shortName: 'BNS',
      year: 2023,
      description: 'The criminal code of India replacing the Indian Penal Code (IPC).',
    };
  }
  if (lower.includes('bnss') || lower.includes('nagarik suraksha')) {
    return {
      title: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
      shortName: 'BNSS',
      year: 2023,
      description: 'Procedural criminal law replacing the Code of Criminal Procedure (CrPC).',
    };
  }
  if (lower.includes('ipc') || lower.includes('penal code')) {
    return {
      title: 'Indian Penal Code, 1860',
      shortName: 'IPC',
      year: 1860,
      description: 'The principal criminal code of India (superseded by BNS in 2023).',
    };
  }
  // Default
  return {
    ...DEFAULT_ACT,
    title: `Legal Act — ${filename}`,
    shortName: filename.replace(/\.[^.]+$/, '').slice(0, 20),
  };
}

// ─────────────────────────────────────────────────────────
// STEP 5 — DB UPSERT
// ─────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

async function upsertArticles(actMeta: typeof DEFAULT_ACT, articles: ParsedArticle[]) {
  // Deduplicate: if the same article number appears multiple times
  // (e.g. two PDFs of the same Act), keep the one with the most content.
  const seen = new Map<string, ParsedArticle>();
  for (const a of articles) {
    const existing = seen.get(a.number);
    if (!existing || a.content.length > existing.content.length) {
      seen.set(a.number, a);
    }
  }
  const dedupedArticles = Array.from(seen.values())
    .filter(a => a.content && a.content.length >= 5);

  console.log(`\n💾 Upserting Act: "${actMeta.title}" (${dedupedArticles.length} unique articles)...`);

  // Upsert the Act row
  const act = await prisma.act.upsert({
    where: { shortName: actMeta.shortName },
    update: { title: actMeta.title, year: actMeta.year, description: actMeta.description },
    create: actMeta,
  });

  let seeded = 0;
  let skipped = 0;

  // Process in batches to reduce Neon round-trips
  for (let batchStart = 0; batchStart < dedupedArticles.length; batchStart += BATCH_SIZE) {
    const batch = dedupedArticles.slice(batchStart, batchStart + BATCH_SIZE);
    const batchEnd = Math.min(batchStart + BATCH_SIZE, dedupedArticles.length);
    process.stdout.write(`  ↳ Batch ${batchStart + 1}–${batchEnd} / ${dedupedArticles.length}...`);

    try {
      // Run the whole batch in a single transaction
      await prisma.$transaction(async (tx) => {
        for (const article of batch) {
          const section = await tx.section.upsert({
            where: { actId_number: { actId: act.id, number: article.number } },
            update: { title: article.title, content: article.content },
            create: { actId: act.id, number: article.number, title: article.title, content: article.content },
          });

          for (const clause of article.clauses) {
            if (!clause.content) continue;
            await tx.clause.upsert({
              where: { sectionId_number: { sectionId: section.id, number: clause.number } },
              update: { content: clause.content },
              create: { sectionId: section.id, number: clause.number, content: clause.content },
            });
          }
        }
      });

      seeded += batch.length;
      console.log(` ✓`);
    } catch (err: any) {
      // On batch failure, fall back to per-article upserts
      console.log(` ⚠️  batch failed, retrying individually...`);
      for (const article of batch) {
        try {
          const section = await prisma.section.upsert({
            where: { actId_number: { actId: act.id, number: article.number } },
            update: { title: article.title, content: article.content },
            create: { actId: act.id, number: article.number, title: article.title, content: article.content },
          });
          for (const clause of article.clauses) {
            if (!clause.content) continue;
            await prisma.clause.upsert({
              where: { sectionId_number: { sectionId: section.id, number: clause.number } },
              update: { content: clause.content },
              create: { sectionId: section.id, number: clause.number, content: clause.content },
            });
          }
          seeded++;
        } catch (innerErr: any) {
          console.warn(`    ⚠️  Skipping Article ${article.number}: ${innerErr.message}`);
          skipped++;
        }
      }
    }
  }

  console.log(`  ✅ Seeded: ${seeded} | Skipped/Empty: ${skipped}`);
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Nyaay Legal PDF Ingestion Pipeline\n' + '═'.repeat(50));

  // Gather PDF files from data/
  const allFiles = fs.readdirSync(DATA_DIR);
  const pdfFiles = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    console.error(`❌  No PDF files found in ${DATA_DIR}`);
    process.exit(1);
  }

  console.log(`📂 Found ${pdfFiles.length} PDF(s): ${pdfFiles.join(', ')}\n`);

  for (const filename of pdfFiles) {
    const filePath = path.join(DATA_DIR, filename);
    console.log(`\n📄 Processing: ${filename}`);
    console.log('─'.repeat(50));

    // 1. Extract raw text
    console.log('  [1/4] Extracting text from PDF...');
    let rawText: string;
    try {
      rawText = await extractTextFromPdf(filePath);
    } catch (err: any) {
      console.error(`  ❌  PDF extraction failed: ${err.message}`);
      continue;
    }
    console.log(`  ✔ Extracted ${rawText.length.toLocaleString()} characters`);

    // 2. Clean text
    console.log('  [2/4] Cleaning text...');
    const cleanedText = cleanRawText(rawText);
    console.log(`  ✔ Cleaned → ${cleanedText.length.toLocaleString()} characters`);

    // 3. Parse articles
    console.log('  [3/4] Parsing article structure...');
    const articles = detectArticles(cleanedText);
    console.log(`  ✔ Detected ${articles.length} article(s)`);

    if (articles.length === 0) {
      console.warn(`  ⚠️  No articles detected in ${filename}. Skipping DB seed.`);
      // Dump a preview for debugging
      console.log('\n  First 500 chars of cleaned text:');
      console.log(cleanedText.slice(0, 500));
      continue;
    }

    // Preview first 3 detected articles
    console.log('\n  Preview (first 3 articles):');
    articles.slice(0, 3).forEach(a => {
      console.log(`    Article ${a.number}: "${a.title}" — ${a.content.slice(0, 80)}...`);
    });

    // 4. Detect Act metadata and upsert
    console.log('\n  [4/4] Upserting to database...');
    const actMeta = detectActMeta(filename);
    await upsertArticles(actMeta, articles);
  }

  console.log('\n\n🎉 Ingestion complete!\n');
  console.log('Next step → run embeddings:');
  console.log('  npx ts-node scripts/generate_embeddings.ts\n');
}

main()
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
