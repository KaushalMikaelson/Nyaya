import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('🚀 Testing local MiniLM embedding...');
  
  // Dynamic import for ESM package
  const { pipeline, env } = await import('@xenova/transformers');
  env.allowLocalModels = true;

  console.log('🤖 Loading model: Xenova/all-MiniLM-L6-v2');
  const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: false, // fp32
  });

  const testText = 'Right to life and personal liberty is guaranteed by Article 21.';
  console.log(`📡 Generating embedding for: "${testText}"`);

  const output = await pipe([testText], { pooling: 'mean', normalize: true }) as any;
  const embedding = output.tolist()[0];

  console.log('✅ Embedding generated successfully!');
  console.log('Dimension size:', embedding.length);
  console.log('Embedding preview (first 5 elements):', embedding.slice(0, 5));
}

main().catch(err => {
  console.error('❌ Error testing embedding:', err);
});
