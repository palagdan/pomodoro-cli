// Yield to the event loop between keystrokes. Not a synchronisation mechanism:
// assertions on rendered output or callbacks must be wrapped in `vi.waitFor`.
export const tick = () => new Promise<void>(r => setTimeout(r, 20));
