import Groq from 'groq-sdk';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'groq-sdk/resources/chat/completions';

const DEFAULT_FALLBACK_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
];

function getCandidateModels(preferred?: string): string[] {
  const ordered = [
    preferred,
    process.env.GROQ_MODEL,
    process.env.GROQ_FAST_MODEL,
    ...DEFAULT_FALLBACK_MODELS,
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of ordered) {
    const trimmed = m?.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

function isModelNotFoundError(err: any): boolean {
  const status = err?.status ?? err?.statusCode;
  const code = err?.error?.code ?? err?.code;
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 404 ||
    code === 'model_not_found' ||
    msg.includes('model_not_found') ||
    msg.includes('does not exist or you do not have access')
  );
}

/**
 * Creates a Groq chat completion using the configured model, automatically
 * falling back to available models if the configured model returns 404.
 */
export async function createGroqCompletion(
  groq: Groq,
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'> & { model?: string }
): Promise<ChatCompletion> {
  const candidates = getCandidateModels(params.model);
  let lastErr: unknown;

  for (const model of candidates) {
    try {
      return await groq.chat.completions.create({
        ...params,
        model,
        stream: false,
      });
    } catch (err) {
      lastErr = err;
      if (isModelNotFoundError(err)) {
        console.warn(`[Groq] Model '${model}' unavailable (404). Trying next fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr;
}
