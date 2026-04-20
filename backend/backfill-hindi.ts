import { prisma } from './src/prisma';
import { processDocumentSync } from './src/workers/documentProcessor';

async function main() {
  const docs = await prisma.userDocument.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const doc of docs) {
    if (doc.status === 'READY' && (!doc.analysisReportHi || doc.summary === "Document classification unavailable.")) {
      console.log("Re-processing doc:", doc.id, doc.title);
      await processDocumentSync(doc.id);
    }
  }
  console.log("Done.");
}

main().finally(() => process.exit(0));
