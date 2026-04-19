import dotenv from 'dotenv';
dotenv.config();
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

async function test() {
  console.log('GROQ KEY present:', !!process.env.GROQ_API_KEY);
  const groq = new ChatGroq({ apiKey: process.env.GROQ_API_KEY!, model: 'llama-3.3-70b-versatile', temperature: 0.1 });
  const systemMessage = 'You are a legal assistant. Answer the query.\nLEGAL CONTEXT: Article 21 of the Constitution of India guarantees the right to life and personal liberty.';
  const ragPrompt = ChatPromptTemplate.fromMessages([
    ['system', systemMessage],
    new MessagesPlaceholder('history'),
    ['human', '{query}']
  ]);
  const chain = ragPrompt.pipe(groq).pipe(new StringOutputParser());
  const result = await chain.invoke({ history: [], query: 'Explain Article 21' });
  console.log('SUCCESS:', result.substring(0, 400));
}
test().catch(e => console.error('FAIL:', e.message, '\n', e.stack));
