// @ts-nocheck
import { prisma } from '../src/prisma';

async function main() {
  const acts = await prisma.act.findMany({
    include: { _count: { select: { sections: true, chunks: true } } }
  });

  console.log('\n=== Acts in Database ===');
  if (acts.length === 0) {
    console.log('  No Acts found.');
  } else {
    acts.forEach(a =>
      console.log(`  [${a.shortName}] "${a.title}" — ${a._count.sections} sections, ${a._count.chunks} chunks`)
    );
  }

  // Sample 5 sections from each act to show if they're mixed
  console.log('\n=== Sample Sections per Act ===');
  for (const act of acts) {
    const samples = await prisma.section.findMany({
      where: { actId: act.id },
      take: 5,
      orderBy: { number: 'asc' },
      select: { number: true, title: true, content: true }
    });
    console.log(`\n  Act: [${act.shortName}] ${act.title}`);
    samples.forEach(s =>
      console.log(`    § ${s.number} — ${s.title || '(no title)'} | snippet: "${s.content.substring(0, 80).replace(/\n/g, ' ')}..."`)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
