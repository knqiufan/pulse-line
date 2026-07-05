import { test } from 'node:test';
import assert from 'node:assert';
import type { execFileSync } from 'child_process';
import {
  getTerminalWidth,
  parseModeConColumns,
  parseSttySizeColumns,
  parseTputCols
} from '../src/utils/terminal-width';

function execStub(
  handler: (command: string, args: readonly string[]) => string
): typeof execFileSync {
  return ((command: string, args?: readonly string[]) => {
    return handler(command, args || []);
  }) as typeof execFileSync;
}

test('parseModeConColumns reads Windows console columns', () => {
  assert.strictEqual(parseModeConColumns('    Columns:        120\r\n'), 120);
  assert.strictEqual(parseModeConColumns('    Lines:          30\r\n    Columns:        118\r\n'), 118);
  assert.strictEqual(parseModeConColumns('    \u884c:\u0020       30\r\n    \u5217:\u0020       132\r\n'), 132);
  assert.strictEqual(parseModeConColumns('no columns'), undefined);
});

test('parseSttySizeColumns reads Unix stty columns', () => {
  assert.strictEqual(parseSttySizeColumns('30 120\n'), 120);
  assert.strictEqual(parseSttySizeColumns('120'), undefined);
});

test('parseTputCols reads tput columns', () => {
  assert.strictEqual(parseTputCols('132\n'), 132);
  assert.strictEqual(parseTputCols('bad'), undefined);
});

test('getTerminalWidth prefers COLUMNS env', () => {
  const width = getTerminalWidth({
    env: { COLUMNS: '88' },
    stdoutColumns: 120,
    stderrColumns: 100,
    execFileSyncImpl: execStub(() => {
      throw new Error('should not execute');
    })
  });

  assert.strictEqual(width, 88);
});

test('getTerminalWidth uses stdout and stderr columns before command probes', () => {
  assert.strictEqual(getTerminalWidth({
    env: {},
    stdoutColumns: 90,
    stderrColumns: 100,
    execFileSyncImpl: execStub(() => {
      throw new Error('should not execute');
    })
  }), 90);

  assert.strictEqual(getTerminalWidth({
    env: {},
    stdoutColumns: undefined,
    stderrColumns: 100,
    execFileSyncImpl: execStub(() => {
      throw new Error('should not execute');
    })
  }), 100);
});

test('getTerminalWidth falls back to mode con on Windows', () => {
  const width = getTerminalWidth({
    env: {},
    platform: 'win32',
    stdoutColumns: undefined,
    stderrColumns: undefined,
    noCache: true,
    execFileSyncImpl: execStub((command, args) => {
      assert.strictEqual(command, 'cmd.exe');
      assert.deepStrictEqual(args, ['/d', '/s', '/c', 'mode con']);
      return 'Status for device CON:\r\n    Columns:        118\r\n';
    })
  });

  assert.strictEqual(width, 118);
});

test('getTerminalWidth falls back to stty then tput on Unix', () => {
  const stty = getTerminalWidth({
    env: {},
    platform: 'linux',
    stdoutColumns: undefined,
    stderrColumns: undefined,
    noCache: true,
    execFileSyncImpl: execStub((command, args) => {
      assert.strictEqual(command, 'sh');
      assert.deepStrictEqual(args, ['-c', 'stty size < /dev/tty']);
      return '24 101\n';
    })
  });
  assert.strictEqual(stty, 101);

  const tput = getTerminalWidth({
    env: {},
    platform: 'darwin',
    stdoutColumns: undefined,
    stderrColumns: undefined,
    noCache: true,
    execFileSyncImpl: execStub((command) => {
      if (command === 'sh') throw new Error('no tty');
      assert.strictEqual(command, 'tput');
      return '99\n';
    })
  });
  assert.strictEqual(tput, 99);
});
