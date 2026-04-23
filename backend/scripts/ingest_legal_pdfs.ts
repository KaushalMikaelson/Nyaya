// @ts-nocheck
/**
 * ingest_legal_pdfs.ts  (v3 — format-aware)
 * ──────────────────────────────────────────────────────────────
 * Handles the REAL PDF formats:
 *
 *  BNS PDF   : sections as bare "N. text..." (e.g. "1. (1) This Act...")
 *  Const PDF : articles as bare "N. text..." with "ARTICLE N" or inline
 *
 * Strategy:
 *  1. Detect which PDF is BNS vs Constitution from filename / first-page text
 *  2. Split on bare numeric headers (N. or N.) per act type
 *  3. Insert cleanly into separate Act records
 *
 * Run: npx ts-node --transpile-only scripts/ingest_legal_pdfs.ts
 * ──────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { prisma } from '../src/prisma';

const DATA_DIR = path.resolve(__dirname, '../data');

// ─────────────────────────────────────────────────────────
// DETECT WHICH ACT A PDF BELONGS TO
// ─────────────────────────────────────────────────────────

function detectAct(text: string): 'BNS' | 'Constitution' | 'Unknown' {
  const top = text.slice(0, 2000).toUpperCase();
  if (top.includes('BHARATIYA NYAYA SANHITA')) return 'BNS';
  if (top.includes('CONSTITUTION OF INDIA'))   return 'Constitution';
  return 'Unknown';
}

// ─────────────────────────────────────────────────────────
// TEXT CLEANING
// ─────────────────────────────────────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove lone page numbers
    .replace(/^\s*\d{1,4}\s*$/gm, '')
    // Collapse excess whitespace runs within a line
    .replace(/[ \t]{2,}/g, ' ')
    // Strip trailing spaces per line
    .replace(/[ \t]+$/gm, '')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────
// BNS PARSING
// Sections look like:  "47. Whoever, by deception..."
//                   or "103. (1) Whoever commits..."
// We split on lines that START with "N." or "N. (N)"
// ─────────────────────────────────────────────────────────

interface BNSSection {
  number: string;
  title: string;
  content: string;
}

function parseBNS(text: string): BNSSection[] {
  const clean = cleanText(text);
  const lines = clean.split('\n');

  // A section header line: starts with "47." or "103." possibly with spaces
  // Must be followed by actual legal content (not just a chapter heading)
  const SECTION_START = /^(\d{1,3}[A-Z]?)\.\s+(.+)/;

  const sections: BNSSection[] = [];
  let curNum = '';
  let curLines: string[] = [];

  const flush = () => {
    if (!curNum || curLines.length === 0) return;
    const content = curLines.join('\n').trim();
    if (content.length < 30) return; // skip stubs
    // Use first line as title (truncated)
    const title = curLines[0].trim().replace(/^[\(\d\)]+\s*/, '').substring(0, 120) || `Section ${curNum}`;
    sections.push({ number: curNum, title, content });
  };

  for (const line of lines) {
    const m = line.match(SECTION_START);
    // Validate: number must be plausible (1–511 for BNS)
    if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 511) {
      flush();
      curNum = m[1];
      curLines = [m[2]];
    } else if (curNum) {
      curLines.push(line);
    }
  }
  flush();

  // Dedup: keep longest content per section number
  const dedup = new Map<string, BNSSection>();
  for (const s of sections) {
    const ex = dedup.get(s.number);
    if (!ex || s.content.length > ex.content.length) dedup.set(s.number, s);
  }

  return Array.from(dedup.values());
}

// ─────────────────────────────────────────────────────────
// CONSTITUTION PARSING
// Articles look like lines containing "N." or the word ARTICLE
// The Constitution PDF uses: "1. Name and territory of the Union.—"
//   or longer forms with Roman-numeral parts
// ─────────────────────────────────────────────────────────

interface ConstitutionArticle {
  number: string;
  title: string;
  content: string;
}

function parseConstitution(text: string): ConstitutionArticle[] {
  const clean = cleanText(text);
  const lines = clean.split('\n');

  // Article header: starts with a number, dot, and a capital letter (or opening parenthesis)
  // Max article number in Indian Constitution is ~395 (some lettered: 370A)
  const ARTICLE_START = /^(\d{1,3}[A-Z]?)\.\s+([A-Z\(].+)/;

  const articles: ConstitutionArticle[] = [];
  let curNum = '';
  let curLines: string[] = [];

  const flush = () => {
    if (!curNum || curLines.length === 0) return;
    const content = curLines.join('\n').trim();
    if (content.length < 30) return;
    // Title = first meaningful phrase up to an em-dash or newline
    const firstLine = curLines[0].trim();
    const title = firstLine.split(/[.\u2014—]/)[0].trim().substring(0, 150) || `Article ${curNum}`;
    articles.push({ number: curNum, title, content });
  };

  for (const line of lines) {
    const m = line.match(ARTICLE_START);
    if (m) {
      const num = parseInt(m[1]);
      // Constitution articles: 1–395 (some with suffix letters)
      if (num >= 1 && num <= 395) {
        flush();
        curNum = m[1];
        curLines = [m[2]];
        continue;
      }
    }
    if (curNum) {
      curLines.push(line);
    }
  }
  flush();

  // Dedup: keep longest content per article number
  const dedup = new Map<string, ConstitutionArticle>();
  for (const a of articles) {
    const ex = dedup.get(a.number);
    if (!ex || a.content.length > ex.content.length) dedup.set(a.number, a);
  }

  return Array.from(dedup.values());
}

// ─────────────────────────────────────────────────────────
// WIPE EXISTING LEGAL DATA
// ─────────────────────────────────────────────────────────

async function wipeLegalData() {
  console.log('\n🗑️  Wiping existing legal data...');
  await prisma.legalChunk.deleteMany({});
  await prisma.clause.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.act.deleteMany({});
  console.log('   ✅ Database wiped.\n');
}

// ─────────────────────────────────────────────────────────
// DB UPSERT HELPERS
// ─────────────────────────────────────────────────────────

async function getOrCreateAct(shortName: string, title: string) {
  return prisma.act.upsert({
    where: { shortName },
    update: { title },
    create: { title, shortName, year: 2024, description: `${title} — ingested by pipeline.` },
  });
}

async function insertSections(
  actId: string,
  sections: Array<{ number: string; title: string; content: string }>,
  label: string
) {
  const BATCH = 50;
  for (let i = 0; i < sections.length; i += BATCH) {
    const batch = sections.slice(i, i + BATCH);
    for (const s of batch) {
      await prisma.section.upsert({
        where:  { actId_number: { actId, number: s.number } },
        update: { title: s.title, content: s.content },
        create: { actId, number: s.number, title: s.title, content: s.content },
      });
    }
    const end = Math.min(i + BATCH, sections.length);
    process.stdout.write(`   ↳ [${label}] ${i + 1}–${end} / ${sections.length}\n`);
  }
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Legal Ingestion Pipeline v3 (format-aware)');

  const files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  if (!files.length) { console.log('❌ No PDFs found in backend/data/'); return; }

  console.log(`   Found ${files.length} PDF(s): ${files.join(', ')}`);

  await wipeLegalData();

  // Create Acts upfront
  const bnsAct = await getOrCreateAct('BNS', 'Bharatiya Nyaya Sanhita');
  const conAct = await getOrCreateAct('Constitution', 'Constitution of India');

  let totalBNS = 0;
  let totalCon = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    console.log(`\n📄 Extracting: ${file}`);
    const buf  = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    const text = data.text;
    const actType = detectAct(text);

    if (actType === 'Unknown') {
      console.log(`   ⚠️  Could not detect act type for ${file} — skipping`);
      continue;
    }

    console.log(`   Detected: ${actType}`);

    if (actType === 'BNS') {
      const sections = parseBNS(text);
      console.log(`   Parsed ${sections.length} BNS sections`);
      await insertSections(bnsAct.id, sections, 'BNS');
      totalBNS += sections.length;
    } else {
      const articles = parseConstitution(text);
      console.log(`   Parsed ${articles.length} Constitution articles`);
      await insertSections(conAct.id, articles, 'Constitution');
      totalCon += articles.length;
    }
  }

  // Final counts from DB
  const dbBNS = await prisma.section.count({ where: { actId: bnsAct.id } });
  const dbCon = await prisma.section.count({ where: { actId: conAct.id } });

  console.log('\n🎉 Ingestion complete!');
  console.log(`   [BNS]          Bharatiya Nyaya Sanhita : ${dbBNS} sections`);
  console.log(`   [Constitution] Constitution of India   : ${dbCon} articles`);
}

main()
  .catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
