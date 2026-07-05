import { execFileSync } from 'child_process';

const WIDTH_PROBE_TIMEOUT_MS = 80;
const WIDTH_CACHE_TTL_MS = 5000;

export interface TerminalWidthProbeOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  stdoutColumns?: number;
  stderrColumns?: number;
  execFileSyncImpl?: typeof execFileSync;
  /** Bypass the in-process cache (used by tests). */
  noCache?: boolean;
}

interface CachedWidth {
  value: number | undefined;
  expiresAt: number;
}
let _cachedWidth: CachedWidth | null = null;

export function parseModeConColumns(output: string): number | undefined {
  const match = output.match(/Columns:\s*(\d+)/i);
  const englishColumns = normalizeWidth(match?.[1]);
  if (englishColumns !== undefined) return englishColumns;

  const values = Array.from(output.matchAll(/:\s*[^\d\r\n]*(\d+)/g))
    .map((item) => normalizeWidth(item[1]))
    .filter((item): item is number => item !== undefined);

  return values.length >= 2 ? values[1] : undefined;
}

export function parseSttySizeColumns(output: string): number | undefined {
  const match = output.trim().match(/^(\d+)\s+(\d+)$/);
  return normalizeWidth(match?.[2]);
}

export function parseTputCols(output: string): number | undefined {
  return normalizeWidth(output.trim());
}

export function getTerminalWidth(options: TerminalWidthProbeOptions = {}): number | undefined {
  const env = options.env ?? process.env;
  const fromEnv = normalizeWidth(env.COLUMNS);
  if (fromEnv !== undefined) return fromEnv;

  const fromStdout = normalizeWidth(options.stdoutColumns ?? process.stdout.columns);
  if (fromStdout !== undefined) return fromStdout;

  const fromStderr = normalizeWidth(options.stderrColumns ?? process.stderr.columns);
  if (fromStderr !== undefined) return fromStderr;

  // Only the expensive subprocess probe benefits from caching; cheap env/stdout
  // reads are evaluated every call so tests and runtime overrides stay live.
  if (!options.noCache && _cachedWidth && _cachedWidth.expiresAt > Date.now()) {
    return _cachedWidth.value;
  }

  const platform = options.platform ?? process.platform;
  const execImpl = options.execFileSyncImpl ?? execFileSync;
  const value = platform === 'win32'
    ? getWindowsConsoleWidth(execImpl)
    : getUnixTerminalWidth(execImpl);

  _cachedWidth = { value, expiresAt: Date.now() + WIDTH_CACHE_TTL_MS };
  return value;
}

function getWindowsConsoleWidth(execImpl: typeof execFileSync): number | undefined {
  try {
    const output = execImpl('cmd.exe', ['/d', '/s', '/c', 'mode con'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: WIDTH_PROBE_TIMEOUT_MS,
      windowsHide: true
    });
    return parseModeConColumns(String(output));
  } catch {
    return undefined;
  }
}

function getUnixTerminalWidth(execImpl: typeof execFileSync): number | undefined {
  const sttyWidth = runWidthProbe(execImpl, 'sh', ['-c', 'stty size < /dev/tty']);
  const parsedStty = sttyWidth === undefined ? undefined : parseSttySizeColumns(sttyWidth);
  if (parsedStty !== undefined) return parsedStty;

  const tputWidth = runWidthProbe(execImpl, 'tput', ['cols']);
  return tputWidth === undefined ? undefined : parseTputCols(tputWidth);
}

function runWidthProbe(
  execImpl: typeof execFileSync,
  command: string,
  args: string[]
): string | undefined {
  try {
    const output = execImpl(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: WIDTH_PROBE_TIMEOUT_MS
    });
    return String(output);
  } catch {
    return undefined;
  }
}

function normalizeWidth(value: unknown): number | undefined {
  const width = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;

  if (!Number.isFinite(width)) return undefined;
  const normalized = Math.floor(width);
  return normalized > 0 ? normalized : undefined;
}
