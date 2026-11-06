import { exec } from 'child_process';
import type { PhaseName, PomodoroPlugin } from '../types.js';

export default class DesktopNotifyPlugin implements PomodoroPlugin {
  readonly name = 'desktop-notify';
  readonly description = 'Show a desktop notification when a phase ends';

  private readonly messages: Record<PhaseName, { title: string; body: string }> = {
    work:       { title: 'Focus session complete!', body: 'Time for a break.' },
    shortBreak: { title: 'Short break over!',       body: 'Time to focus.'    },
    longBreak:  { title: 'Long break over!',        body: 'Ready to focus?'   },
  };

  onPhaseEnd(phase: PhaseName): void {
    const { title, body } = this.messages[phase];

    if (process.platform === 'darwin') {
      const escaped = (s: string) => s.replace(/"/g, '\\"');
      exec(`osascript -e 'display notification "${escaped(body)}" with title "${escaped(title)}"'`);
    } else if (process.platform === 'linux') {
      exec(`notify-send "${title}" "${body}"`);
    }
  }
}
