import React from 'react';
import { Box, Text } from 'ink';
import os from 'os';
import { VERSION } from '../../constants.js';
import { capitalize } from '../../utils.js';
import type { Settings } from '../../types.js';

// Pixel art: each character is one pixel (r = red, g = green, w = highlight, . = empty).
// Two pixel rows are packed into one terminal line using half blocks.
const TOMATO_PIXELS = [
    '..........gg..........',
    '..........gg..........',
    '........rrggrr........',
    '.....rrggggggggrr.....',
    '...rggggrggggrggggr...',
    '..rggrrrrrggrrrrrggr..',
    '.rrrrwwrrrrrrrrrrrrrr.',
    'rrrrwrrrrrrrrrrrrrrrrr',
    'rrrrwrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrr',
    '.rrrrrrrrrrrrrrrrrrrr.',
    '.rrrrrrrrrrrrrrrrrrrr.',
    '..rrrrrrrrrrrrrrrrrr..',
    '....rrrrrrrrrrrrrr....',
    '......rrrrrrrrrr......',
];

const PIXEL_COLORS: Record<string, string> = { r: 'red', g: 'green', w: 'white' };

interface Cell {
    char: string;
    color?: string;
    backgroundColor?: string;
}

function toCell(top: string, bottom: string): Cell {
    const t = PIXEL_COLORS[top];
    const b = PIXEL_COLORS[bottom];
    if (!t && !b) return { char: ' ' };
    if (t === b)  return { char: '█', color: t };
    if (!b)       return { char: '▀', color: t };
    if (!t)       return { char: '▄', color: b };
    return { char: '▀', color: t, backgroundColor: b };
}

// Merge neighbouring cells with the same colours into a single run of text
function toLines(pixels: string[]): Cell[][] {
    const lines: Cell[][] = [];
    for (let y = 0; y < pixels.length; y += 2) {
        const top = pixels[y]!;
        const bottom = pixels[y + 1] ?? '';
        const runs: Cell[] = [];
        for (let x = 0; x < top.length; x++) {
            const cell = toCell(top[x]!, bottom[x] ?? '.');
            const last = runs[runs.length - 1];
            if (last && last.color === cell.color && last.backgroundColor === cell.backgroundColor) {
                last.char += cell.char;
            } else {
                runs.push(cell);
            }
        }
        lines.push(runs);
    }
    return lines;
}

const TOMATO = toLines(TOMATO_PIXELS);

const COMMAND_HINTS: Array<[string, string]> = [
    ['/start',    'begin a focus session'],
    ['/settings', 'change durations'],
    ['/plugins',  'manage plugins'],
    ['/exit',     'quit'],
];

const HINT_NAME_WIDTH = Math.max(...COMMAND_HINTS.map(([n]) => n.length)) + 2;

interface Props {
    settings: Settings;
}

export default function Dashboard({ settings }: Props) {
    const username = capitalize(os.userInfo().username);

    return (
        <Box borderStyle="round" borderColor="red" flexDirection="column" marginBottom={1} width={80}>
            {/* Title row */}
            <Box justifyContent="center" paddingY={0}>
                {/* Emoji are avoided inside framed lines: terminals disagree on their width, which breaks border alignment. */}
                <Text bold color="red">
                    {' '}
                    ● Pomodoro CLI v{VERSION}{' '}
                </Text>
            </Box>

            {/* Horizontal divider under title */}
            <Box borderStyle="single" borderColor="red" borderTop borderBottom={false} borderLeft={false} borderRight={false} />

            {/* Two-column content */}
            <Box>
                {/* Left column: welcome + tomato + settings */}
                <Box flexDirection="column" width={36} alignItems="center" paddingX={1} paddingY={1}>
                    <Box marginBottom={1}>
                        <Text bold>Welcome back </Text>
                        <Text bold color="red">
                            {username}
                        </Text>
                        <Text bold>!</Text>
                    </Box>

                    {TOMATO.map((runs, i) => (
                        <Text key={i}>
                            {runs.map((run, j) => (
                                <Text key={j} color={run.color as any} backgroundColor={run.backgroundColor as any}>
                                    {run.char}
                                </Text>
                            ))}
                        </Text>
                    ))}

                    <Box marginTop={1} flexDirection="column" alignItems="center">
                        <Text dimColor>
                            <Text color="white">{settings.workMin}m</Text>
                            {' work · '}
                            <Text color="white">{settings.shortBreakMin}m</Text>
                            {' short · '}
                            <Text color="white">{settings.longBreakMin}m</Text>
                            {' long'}
                        </Text>
                        <Text dimColor>
                            {'long break every '}
                            <Text color="white">{settings.longBreakEvery}</Text>
                            {' sessions'}
                        </Text>
                    </Box>
                </Box>

                {/* Right column with left border acting as divider */}
                <Box
                    flexDirection="column"
                    flexGrow={1}
                    paddingX={2}
                    paddingY={1}
                    borderStyle="single"
                    borderColor="red"
                    borderLeft={true}
                    borderTop={false}
                    borderBottom={false}
                    borderRight={false}
                >
                    <Text bold>Getting started</Text>
                    <Box marginTop={1} flexDirection="column">
                        {COMMAND_HINTS.map(([name, hint]) => (
                            <Box key={name}>
                                <Box width={HINT_NAME_WIDTH} flexShrink={0}>
                                    <Text color="cyan">{name}</Text>
                                </Box>
                                <Text dimColor>{hint}</Text>
                            </Box>
                        ))}
                    </Box>
                    <Box marginTop={2}>
                        <Text dimColor>type </Text>
                        <Text color="cyan">/</Text>
                        <Text dimColor> in the prompt below</Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
