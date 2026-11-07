import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import CommandOutput from '../../src/ui/screens/CommandOutput.js';
import type { CommandLine } from '../../src/types.js';
import { tick } from '../helpers/ui.js';


describe('CommandOutput', () => {
  it('shows Loading… then the lines', async () => {
    let resolve!: (l: CommandLine[]) => void;
    const load = () => new Promise<CommandLine[]>(r => { resolve = r; });
    const { lastFrame, unmount } = render(<CommandOutput title="History" load={load} onExit={() => {}} />);
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('History');
      expect(lastFrame()).toContain('Loading…');
    });
    resolve(['first line', 'second line']);
    await vi.waitFor(() => {
      expect(lastFrame()).not.toContain('Loading…');
      expect(lastFrame()).toContain('first line');
      expect(lastFrame()).toContain('second line');
    });
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
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('bold red');
      expect(lastFrame()).toContain('dimmed');
      expect(lastFrame()).toContain('plain');
    });
    unmount();
  });

  it('scrolls with arrows and shows "… N above" / "… N more"', async () => {
    const lines = Array.from({ length: 100 }, (_, i) => `row-${i}`);
    const { stdin, lastFrame, unmount } = render(<CommandOutput title="T" load={async () => lines} onExit={() => {}} />);
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('row-0');
      expect(lastFrame()).not.toContain('above');
      expect(lastFrame()).toMatch(/… \d+ more/);
    });
    await tick(); stdin.write('\x1b[B'); await tick();
    await vi.waitFor(() => expect(lastFrame()).toContain('… 1 above'));
    await tick(); stdin.write('\x1b[B'); await tick();
    await vi.waitFor(() => {
      expect(lastFrame()).toContain('… 2 above');
      expect(lastFrame()).not.toContain('row-0\n');
    });
    await tick(); stdin.write('\x1b[A'); await tick();
    await vi.waitFor(() => expect(lastFrame()).toContain('… 1 above'));
    unmount();
  });

  it('q and Escape call onExit', async () => {
    const onExit = vi.fn();
    const { stdin, lastFrame, unmount } = render(<CommandOutput title="T" load={async () => ['x']} onExit={onExit} />);
    await vi.waitFor(() => expect(lastFrame()).not.toContain('Loading…'));
    await tick(); stdin.write('q'); await tick();
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    await tick();
    expect(onExit).toHaveBeenCalledTimes(1);
    await tick(); stdin.write('\x1b'); await tick();
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(2));
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
