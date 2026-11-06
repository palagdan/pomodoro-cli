import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Phase, PhaseName, Settings } from './types.js';

export const PHASES: Record<PhaseName, Phase> = {
    work: { label: 'Focus', color: 'red' },
    shortBreak: { label: 'Short Break', color: 'green' },
    longBreak: { label: 'Long Break', color: 'blue' },
};

// package.json sits one level up from src/ when run via tsx, two levels up from
// dist/src/ when run from the build — walk up until we find it.
function readVersion(): string {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (;;) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as { version?: string };
            if (pkg.version) return pkg.version;
        } catch {
            // not here — keep walking
        }
        const parent = path.dirname(dir);
        if (parent === dir) return '0.0.0';
        dir = parent;
    }
}

export const VERSION = readVersion();

export const DEFAULT_SETTINGS: Settings = {
    workMin: 25,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakEvery: 4,
};
