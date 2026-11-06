import { execFile } from 'child_process';
import { definePlugin } from '../plugin-api.js';
import type { PhaseName } from '../plugin-api.js';

const messages: Record<PhaseName, { title: string; body: string }> = {
  work:       { title: 'Focus session complete!', body: 'Time for a break.' },
  shortBreak: { title: 'Short break over!',       body: 'Time to focus.'    },
  longBreak:  { title: 'Long break over!',        body: 'Ready to focus?'   },
};

export default definePlugin({
  name: 'desktop-notify',
  apiVersion: 1,
  description: 'Show a desktop notification when a phase ends',

  onPhaseEnd({ phase, sessions }) {
    const { title } = messages[phase];
    const body = phase === 'work'
      ? `${messages.work.body} (${sessions} ${sessions === 1 ? 'session' : 'sessions'} done)`
      : messages[phase].body;

    if (process.platform === 'darwin') {
      const escaped = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const script = `display notification "${escaped(body)}" with title "${escaped(title)}"`;
      execFile('osascript', ['-e', script], () => {});
    } else if (process.platform === 'linux') {
      execFile('notify-send', [title, body], () => {});
    }
  },
});
