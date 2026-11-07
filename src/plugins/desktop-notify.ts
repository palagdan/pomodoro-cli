import { execFile } from 'child_process';
import { definePlugin } from '../plugin-api.js';
import type { PhaseName } from '../plugin-api.js';

const messages: Record<PhaseName, { title: string; body: string }> = {
  work:       { title: 'Focus session complete!', body: 'Time for a break.' },
  shortBreak: { title: 'Short break over!',       body: 'Time to focus.'    },
  longBreak:  { title: 'Long break over!',        body: 'Ready to focus?'   },
};

// Title and body come in via env vars, never interpolated into the script.
const WINDOWS_TOAST_SCRIPT = [
  "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null",
  "$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)",
  "$text = $xml.GetElementsByTagName('text')",
  "$text.Item(0).AppendChild($xml.CreateTextNode($env:POMODORO_TITLE)) > $null",
  "$text.Item(1).AppendChild($xml.CreateTextNode($env:POMODORO_BODY)) > $null",
  "$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'",
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($xml))",
].join('; ');

export default definePlugin({
  name: 'desktop-notify',
  apiVersion: 1,
  description: 'Show a desktop notification when a phase ends (macOS, Linux, Windows)',

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
    } else if (process.platform === 'win32') {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_TOAST_SCRIPT],
        { windowsHide: true, env: { ...process.env, POMODORO_TITLE: title, POMODORO_BODY: body } },
        () => {},
      );
    }
  },
});
