import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { CommandLine } from '../../types.js';

interface Props {
  title: string;
  load: () => Promise<CommandLine[]>;
  onExit: () => void;
}

export default function CommandOutput({ title, load, onExit }: Props) {
  const [lines, setLines] = useState<CommandLine[] | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let alive = true;
    load().then(result => { if (alive) setLines(result); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rows besides the content lines: outer padding 2 + box border 2 + box padding 2
  // + title 1 + spacer 1 + "above"/"more" indicators 2 + footer 1 = 11, plus a 2-row
  // margin so the screen stays below the terminal height (Ink redraws everything,
  // flickering, once output reaches it).
  const pageSize = Math.max(5, (process.stdout.rows ?? 24) - 13);
  const total = lines?.length ?? 0;
  const overflow = total > pageSize;
  // Reserve rows for the "above"/"more" indicators so the box height stays stable
  const maxOffset = Math.max(0, total - pageSize);
  const clamped = Math.min(offset, maxOffset);

  useInput((input, key) => {
    if (input === 'q' || key.escape) { onExit(); return; }
    if (!overflow) return;
    if (key.upArrow)   setOffset(Math.max(0, clamped - 1));
    if (key.downArrow) setOffset(Math.min(maxOffset, clamped + 1));
    if (key.pageUp)    setOffset(Math.max(0, clamped - pageSize));
    if (key.pageDown)  setOffset(Math.min(maxOffset, clamped + pageSize));
  });

  const visible = lines ? lines.slice(clamped, clamped + pageSize) : [];
  const above = clamped;
  const below = Math.max(0, total - clamped - visible.length);

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box borderStyle="round" borderColor="red" flexDirection="column" paddingX={2} paddingY={1} width={80}>
        <Text bold>{title}</Text>
        <Text> </Text>
        {lines === null && <Text dimColor>Loading…</Text>}
        {above > 0 && <Text dimColor>… {above} above</Text>}
        {visible.map((line, i) =>
          typeof line === 'string'
            ? <Text key={i}>{line === '' ? ' ' : line}</Text>
            : <Text key={i} color={line.color as any} bold={line.bold} dimColor={line.dim}>{line.text === '' ? ' ' : line.text}</Text>
        )}
        {below > 0 && <Text dimColor>… {below} more</Text>}
      </Box>
      <Text dimColor>{overflow ? '↑↓ scroll   ' : ''}q back</Text>
    </Box>
  );
}
