import { exec } from 'child_process';
import type { PhaseName, PomodoroPlugin, PluginConfigField } from '../types.js';

export default class SoundPlugin implements PomodoroPlugin {
  readonly name = 'sound';
  readonly description = 'Play a system sound when a phase changes (macOS)';

  readonly config: PluginConfigField[] = [
    { key: 'workSound',       label: 'Work phase sound',  type: 'string', default: 'Glass', hint: 'e.g. Glass, Blow, Purr, Ping' },
    { key: 'shortBreakSound', label: 'Short break sound', type: 'string', default: 'Blow',  hint: 'e.g. Glass, Blow, Purr, Ping' },
    { key: 'longBreakSound',  label: 'Long break sound',  type: 'string', default: 'Purr',  hint: 'e.g. Glass, Blow, Purr, Ping' },
  ];

  private sounds: Record<PhaseName, string> = {
    work:       'Glass',
    shortBreak: 'Blow',
    longBreak:  'Purr',
  };

  configure(values: Record<string, unknown>): void {
    this.sounds = {
      work:       String(values.workSound       ?? 'Glass'),
      shortBreak: String(values.shortBreakSound ?? 'Blow'),
      longBreak:  String(values.longBreakSound  ?? 'Purr'),
    };
  }

  onPhaseStart(phase: PhaseName): void {
    if (process.platform !== 'darwin') return;
    exec(`afplay /System/Library/Sounds/${this.sounds[phase]}.aiff`);
  }
}
