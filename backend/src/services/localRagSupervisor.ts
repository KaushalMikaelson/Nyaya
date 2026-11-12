import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

let startupPromise: Promise<boolean> | null = null;
let ragChild: ChildProcess | null = null;

export function getConfiguredPythonRagUrl(): string {
  let url = (process.env.PYTHON_RAG_URL || 'http://127.0.0.1:8000').trim().replace(/\/$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url;
}

export function isLocalRagUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function isRagHealthy(pyUrl: string, timeoutMs = 1000): Promise<boolean> {
  try {
    const res = await fetch(`${pyUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function resolveRagMainPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'rag', 'main.py'),
    path.resolve(process.cwd(), '..', 'rag', 'main.py'),
    path.resolve(process.cwd(), 'rag', 'main.py'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function spawnPythonRag(ragMainPath: string, port: string): ChildProcess {
  const ragDir = path.dirname(ragMainPath);
  const defaultBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  const launch = (bin: string) =>
    spawn(bin, [ragMainPath], {
      cwd: ragDir,
      env: {
        ...process.env,
        RAG_PORT: port,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  let child = launch(defaultBin);

  const wireLogs = (proc: ChildProcess) => {
    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.log(`[PythonRAG] ${text}`);
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.log(`[PythonRAG] ${text}`);
    });
  };

  wireLogs(child);

  child.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT' && defaultBin === 'python3') {
      console.warn('[LocalRAG] python3 not found, retrying with python...');
      child = launch('python');
      ragChild = child;
      wireLogs(child);
    } else {
      console.warn(`[LocalRAG] Failed to spawn Python RAG: ${err.message}`);
    }
  });

  return child;
}

/**
 * Ensures the local Python RAG microservice is running when PYTHON_RAG_URL
 * targets localhost / 127.0.0.1. Never spawns in production or remote URLs.
 */
export async function ensureLocalRagRunning(maxWaitMs = 25000): Promise<boolean> {
  const pyUrl = getConfiguredPythonRagUrl();
  if (!isLocalRagUrl(pyUrl)) {
    return false;
  }

  if (await isRagHealthy(pyUrl, 800)) {
    return true;
  }

  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = (async () => {
    try {
      const ragMainPath = resolveRagMainPath();
      if (!ragMainPath) {
        console.warn('[LocalRAG] rag/main.py not found; skipping local auto-start.');
        return false;
      }

      const parsed = new URL(pyUrl);
      const port = parsed.port || '8000';

      if (!ragChild || ragChild.exitCode !== null) {
        console.log(`[LocalRAG] Python RAG not reachable at ${pyUrl}; starting ${ragMainPath} on port ${port}...`);
        ragChild = spawnPythonRag(ragMainPath, port);
      }

      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        if (await isRagHealthy(pyUrl, 800)) {
          console.log(`[LocalRAG] Python RAG ready at ${pyUrl}`);
          return true;
        }
        if (ragChild && ragChild.exitCode !== null && ragChild.exitCode !== 0) {
          // Port may have been bound concurrently by another instance; verify health once more
          return await isRagHealthy(pyUrl, 800);
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      console.warn(`[LocalRAG] Python RAG did not become healthy within ${maxWaitMs}ms.`);
      return false;
    } finally {
      startupPromise = null;
    }
  })();

  return startupPromise;
}

