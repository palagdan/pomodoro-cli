# Render with: npm run demo (from the repo root)
Output docs/demo.gif

Set Shell zsh
Set FontSize 18
Set Width 1100
Set Height 880
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 80ms
Set WindowBar Colorful

Hide
Type `REPO=$PWD; export HOME=$(mktemp -d); node $REPO/demo/seed.mjs "$HOME"; alias pomodoro="node -r $REPO/demo/preload.cjs $REPO/dist/index.js"; PROMPT='$ '; clear` Enter
Sleep 1s
Show

Type "pomodoro" Sleep 400ms Enter
Sleep 3s

Type "/" Sleep 2s
Type "st" Sleep 2s
Enter Sleep 2s

Space Sleep 6500ms
Type "n" Sleep 2500ms
Type "q" Sleep 1500ms

Type "/stats" Sleep 500ms Enter
Sleep 4s
Type "q" Sleep 1s

Type "/history" Sleep 500ms Enter
Sleep 3s
Type "q" Sleep 1s

Type "/exit" Sleep 500ms Enter
Sleep 1s
