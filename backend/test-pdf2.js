const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdf() {
  const buf = fs.readFileSync('uploads/documents/1776583442995-83fdef26cdbc4cac.pdf');
  try {
    const parser = new pdf.PDFParse();
    await parser.load(buf);
    const text = await parser.getText();
    console.log("Extracted text (first 100 chars):", text.substring(0, 100));
  } catch(e) { console.error(e); }
}

testPdf();
