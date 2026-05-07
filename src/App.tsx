import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

type PhaseName = 'work' | 'shortBreak' | 'longBreak';

interface Phase {
  label: string;
  duration: number;
  color: string;
}

const PHASES: Record<PhaseName, Phase> = {
  work:       { label: 'Focus',       duration: 25 * 60, color: 'red'   },
  shortBreak: { label: 'Short Break', duration:  5 * 60, color: 'green' },
  longBreak:  { label: 'Long Break',  duration: 15 * 60, color: 'blue'  },
};

const LONG_BREAK_INTERVAL = 4;

function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function progressBar(current: number, total: number, width = 30): string {
  const ratio = Math.max(0, Math.min(1, 1 - current / total));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default function App() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<PhaseName>('work');
  const [timeLeft, setTimeLeft] = useState(PHASES.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const currentPhase = PHASES[phase];

  const advancePhase = useCallback((currentSessions: number, fromPhase: PhaseName) => {
    if (fromPhase === 'work') {
      const next = currentSessions + 1;
      setSessions(next);
      setPhase(next % LONG_BREAK_INTERVAL === 0 ? 'longBreak' : 'shortBreak');
    } else {
      setPhase('work');
    }
  }, []);

  // Reset timer when phase changes
  useEffect(() => {
    setTimeLeft(PHASES[phase].duration);
    setRunning(false);
  }, [phase]);

  // Countdown tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) {
          clearInterval(id);
          advancePhase(sessions, phase);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, sessions, advancePhase]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) exit();
    if (input === ' ')  setRunning((r: boolean) => !r);
    if (input === 'r') { setTimeLeft(currentPhase.duration); setRunning(false); }
    if (input === 'n')  advancePhase(sessions, phase);
    if (input === '1')  setPhase('work');
    if (input === '2')  setPhase('shortBreak');
    if (input === '3')  setPhase('longBreak');
  });

  const bar     = progressBar(timeLeft, currentPhase.duration);
  const percent = Math.round((1 - timeLeft / currentPhase.duration) * 100);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>

      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={currentPhase.color as any}>🍅 Pomodoro Timer</Text>
      </Box>

      {/* Main card */}
      <Box
        borderStyle="round"
        borderColor={currentPhase.color as any}
        paddingX={4}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
        width={44}
      >
        <Text bold color={currentPhase.color as any}>{currentPhase.label.toUpperCase()}</Text>

        <Box marginY={1}>
          <Text bold color={running ? 'white' : 'gray'}>{formatTime(timeLeft)}</Text>
        </Box>

        <Text color={currentPhase.color as any}>{bar}</Text>
        <Text dimColor>{percent}%</Text>
      </Box>

      {/* Session counter */}
      <Box marginTop={1}>
        <Text dimColor>Sessions completed: </Text>
        <Text bold color="yellow">{sessions}</Text>
        <Text dimColor>  (next long break in </Text>
        <Text bold color="cyan">{LONG_BREAK_INTERVAL - (sessions % LONG_BREAK_INTERVAL)}</Text>
        <Text dimColor>)</Text>
      </Box>

      {/* Controls */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text dimColor>{running ? '⏸  [space] pause' : '▶  [space] start'}{'   [r] reset   [n] skip'}</Text>
        <Text dimColor>{'[1] focus   [2] short break   [3] long break   [q] quit'}</Text>
      </Box>

      {/* Phase indicators */}
      <Box marginTop={1}>
        {(Object.keys(PHASES) as PhaseName[]).map(p => (
          <Box key={p} marginX={1}>
            <Text
              color={p === phase ? (PHASES[p].color as any) : undefined}
              dimColor={p !== phase}
            >
              {p === 'work' ? '● Focus' : p === 'shortBreak' ? '● Short' : '● Long'}
            </Text>
          </Box>
        ))}
      </Box>

    </Box>
  );
}
