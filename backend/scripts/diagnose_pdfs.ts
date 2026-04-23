// @ts-nocheck
/**
 * Diagnostic: dump the first 3000 chars of each PDF
 * so we can see the actual formatting of headers
 */
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const DATA_DIR = path.resolve(__dirname, '../data');

async function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));

  for (const file of files) {
    const buf = fs.readFileSync(path.join(DATA_DIR, file));
    const data = await pdfParse(buf);
    const text = data.text;

    console.log('\n' + '='.repeat(70));
    console.log(`FILE: ${file}  (${text.length} chars total)`);
    console.log('='.repeat(70));

    // Show first 3000 chars
    console.log('\n--- FIRST 3000 CHARS ---');
    console.log(JSON.stringify(text.slice(0, 3000)));

    // Search for anything that looks like a section/article header
    console.log('\n--- LINES MATCHING article|section ---');
    const lines = text.split('\n');
    let found = 0;
    for (let i = 0; i < lines.length && found < 30; i++) {
      const l = lines[i];
      if (/\b(article|section)\b/i.test(l) && l.trim().length > 3) {
        console.log(`  [line ${i}] ${JSON.stringify(l)}`);
        found++;
      }
    }

    // Show first 20 non-empty lines
    console.log('\n--- FIRST 20 NON-EMPTY LINES ---');
    let shown = 0;
    for (let i = 0; i < lines.length && shown < 20; i++) {
      if (lines[i].trim()) {
        console.log(`  [${i}] ${JSON.stringify(lines[i])}`);
        shown++;
      }
    }
  }
}

main().catch(console.error);
