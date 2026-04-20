const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdf() {
  const buf = fs.readFileSync('uploads/documents/1776583442995-83fdef26cdbc4cac.pdf');
  console.log("Got buf", buf.length);
  try {
    const fn = pdf.default || pdf;
    if (typeof fn === 'function') {
      const resp = await fn(buf);
      console.log("Success with function!");
    } else if (pdf.PDFParse && typeof pdf.PDFParse === 'function') {
      // what does it do?
      console.log("Trying PDFParse");
    } else {
        console.log("Keys:", Object.keys(pdf));
        console.log("pdf-parse is an object. Function might be somewhere else");
    }
  } catch(e) { console.error(e); }
}

testPdf();
