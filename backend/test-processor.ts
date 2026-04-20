import { prisma } from './src/prisma';
import { processDocumentSync } from './src/workers/documentProcessor';

async function main() {
  const latestDoc = await prisma.userDocument.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  if (!latestDoc) {
    console.log("No docs found");
    return;
  }
  console.log("Processing doc:", latestDoc.id, "title:", latestDoc.title);
  try {
    await processDocumentSync(latestDoc.id);
    console.log("Success.");
  } catch(err) {
    console.error("Failed:", err);
  }
}

main().finally(() => process.exit(0));
