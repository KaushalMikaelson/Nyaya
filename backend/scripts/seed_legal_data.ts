// @ts-nocheck
import { prisma } from '../src/prisma';

const actsData = [
  {
    title: 'The Constitution of India',
    shortName: 'Constitution',
    year: 1950,
    description: 'The supreme law of India.',
    sections: [
      {
        number: '14',
        title: 'Equality before law',
        content: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.',
      },
      {
        number: '21',
        title: 'Protection of life and personal liberty',
        content: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.',
      }
    ]
  },
  {
    title: 'Bharatiya Nyaya Sanhita, 2023',
    shortName: 'BNS',
    year: 2023,
    description: 'The criminal code of India replacing the Indian Penal Code (IPC).',
    sections: [
      {
        number: '1',
        title: 'Short title, commencement and application.',
        content: 'This Act may be called the Bharatiya Nyaya Sanhita, 2023. It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.',
        clauses: [
          { number: '(1)', content: 'This Act may be called the Bharatiya Nyaya Sanhita, 2023.' },
          { number: '(2)', content: 'It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.' },
          { number: '(3)', content: 'Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India.' }
        ]
      },
      {
        number: '103',
        title: 'Punishment for murder.',
        content: 'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.',
        clauses: [
          { number: '(1)', content: 'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.' },
          { number: '(2)', content: 'When a group of five or more persons acting in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other similar ground each member of such group shall be punished with death or with imprisonment for life, and shall also be liable to fine.' }
        ]
      }
    ]
  },
  {
    title: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    shortName: 'BNSS',
    year: 2023,
    description: 'The procedural criminal law replacing the Code of Criminal Procedure (CrPC).',
    sections: [
      {
        number: '173',
        title: 'Information in cognizable cases.',
        content: 'Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction...',
        clauses: [
          { number: '(1)', content: 'Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant...' }
        ]
      }
    ]
  },
  {
    title: 'The Information Technology Act, 2000',
    shortName: 'IT Act',
    year: 2000,
    description: 'Law dealing with cybercrime and electronic commerce.',
    sections: [
      {
        number: '66',
        title: 'Computer related offences',
        content: 'If any person, dishonestly or fraudulently, does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both.'
      }
    ]
  },
  {
    title: 'The Consumer Protection Act, 2019',
    shortName: 'Consumer Act',
    year: 2019,
    description: 'An Act to provide for protection of the interests of consumers and for the said purpose, to establish authorities for timely and effective administration and settlement of consumers disputes.',
    sections: [
      {
        number: '2',
        title: 'Definitions',
        content: 'In this Act, unless the context otherwise requires,—...',
        clauses: [
          { number: '(7)', content: '"consumer" means any person who buys any goods for a consideration which has been paid or promised...' },
          { number: '(9)', content: '"consumer rights" includes the right to be protected against the marketing of goods, products or services which are hazardous to life and property...' }
        ]
      }
    ]
  }
];

async function main() {
  console.log('🌱 Starting Legal Data seeding...');

  for (const actBody of actsData) {
    const { sections, ...actMeta } = actBody;

    console.log(`Processing Act: ${actMeta.shortName}...`);
    const act = await prisma.act.upsert({
      where: { shortName: actMeta.shortName },
      update: actMeta,
      create: actMeta,
    });

    for (const sectionBody of sections) {
      const { clauses, ...sectionMeta } = sectionBody;

      const section = await prisma.section.upsert({
        where: {
          actId_number: {
            actId: act.id,
            number: sectionMeta.number,
          }
        },
        update: sectionMeta,
        create: {
          ...sectionMeta,
          actId: act.id,
        },
      });

      if (clauses && clauses.length > 0) {
        for (const clauseBody of clauses) {
          await prisma.clause.upsert({
            where: {
              sectionId_number: {
                sectionId: section.id,
                number: clauseBody.number,
              }
            },
            update: clauseBody,
            create: {
              ...clauseBody,
              sectionId: section.id,
            },
          });
        }
      }
    }
  }

  console.log('✅ Legal Data seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
