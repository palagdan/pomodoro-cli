import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import CommandOutput from '../../src/ui/screens/CommandOutput.js';
import type { CommandLine } from '../../src/types.js';

const tick = () => new Promise(r => setTimeout(r, 20));

describe('CommandOutput', () => {
  it('shows Loading… then the lines', async () => {
    let resolve!: (l: CommandLine[]) => void;
    const load = () => new Promise<CommandLine[]>(r => { resolve = r; });
    const { lastFrame, unmount } = render(<CommandOutput title="History" load={load} onExit={() => {}} />);
    await tick();
    expect(lastFrame()).toContain('History');
    expect(lastFrame()).toContain('Loading…');
    resolve(['first line', 'second line']);
    await tick();
    expect(lastFrame()).not.toContain('Loading…');
    expect(lastFrame()).toContain('first line');
    expect(lastFrame()).toContain('second line');
    unmount();
  });

  it('renders styled object lines as their text', async () => {
    const load = async (): Promise<CommandLine[]> => [
      { text: 'bold red', color: 'red', bold: true },
      { text: 'dimmed', dim: true },
      '',
      'plain',
    ];
    const { lastFrame, unmount } = render(<CommandOutput title="T" load={load} onExit={() => {}} />);
    await tick();
    expect(lastFrame()).toContain('bold red');
    expect(lastFrame()).toContain('dimmed');
    expect(lastFrame()).toContain('plain');
    unmount();
  });

  it('scrolls with arrows and shows "… N above" / "… N more"', async () => {
    const lines = Array.from({ length: 100 }, (_, i) => `row-${i}`);
    const { stdin, lastFrame, unmount } = render(<CommandOutput title="T" load={async () => lines} onExit={() => {}} />);
    await tick();
    expect(lastFrame()).toContain('row-0');
    expect(lastFrame()).not.toContain('above');
    expect(lastFrame()).toMatch(/… \d+ more/);
    stdin.write('\x1b[B'); await tick();
    expect(lastFrame()).toContain('… 1 above');
    stdin.write('\x1b[B'); await tick();
    expect(lastFrame()).toContain('… 2 above');
    expect(lastFrame()).not.toContain('row-0\n');
    stdin.write('\x1b[A'); await tick();
    expect(lastFrame()).toContain('… 1 above');
    unmount();
  });

  it('q and Escape call onExit', async () => {
    const onExit = vi.fn();
    const { stdin, unmount } = render(<CommandOutput title="T" load={async () => ['x']} onExit={onExit} />);
    await tick();
    stdin.write('q'); await tick();
    expect(onExit).toHaveBeenCalledTimes(1);
    stdin.write('\x1b'); await tick();
    expect(onExit).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('a load() resolving after unmount does not throw', async () => {
    let resolve!: (l: CommandLine[]) => void;
    const load = () => new Promise<CommandLine[]>(r => { resolve = r; });
    const { unmount } = render(<CommandOutput title="T" load={load} onExit={() => {}} />);
    await tick();
    unmount();
    const errors: unknown[] = [];
    const onErr = (e: unknown) => errors.push(e);
    process.on('unhandledRejection', onErr);
    resolve(['late']);
    await tick();
    process.off('unhandledRejection', onErr);
    expect(errors).toEqual([]);
  });
});
