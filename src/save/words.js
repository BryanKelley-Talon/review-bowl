// The save-code words (BK 2026-10-04 00:22 / 00:26: one code, a Copy button, a Google Doc, a
// reminder after every game). WORKING LABELS until BK says yes (proposed in chat 00:3x).
// npm run release-check fails while _approved is false.
export const SAVE_WORDS = {
  _approved: false,
  tipButton: 'Saving your seasons',
  tipHead: 'Your save code is your seasons',
  tipLines: [
    'There are no accounts. Your football season and your volleyball season live in one code.',
    'Keep it in a Google Doc on your Drive. Tap Copy, paste it into your doc, and paste it back here next time. No writing it out.',
    'You get a new code after every game. Copy it into your doc again. A cleared browser or a different Chromebook forgets your seasons. Your doc doesn’t.',
    'Enter your code, and you’ll see both seasons. Pick the one you want to play.',
    'Your code holds your teams. Nothing about you.',
  ],
  gotIt: 'Got it',
  afterHead: 'Save your seasons',
  afterBody: 'Here’s your new code. Copy it into your Google Doc now. It’s the only way back to these seasons on another day or another Chromebook.',
  copy: 'Copy code',
  copied: 'Copied. Now paste it into your doc.',
  copyFailed: 'Your browser blocked Copy. Select the code and copy it yourself.',
  done: 'Done',
  codeBoxSub: 'Copy it into your Google Doc. On any computer, Enter a save code picks up both seasons right here. It holds nothing about you.',
  continueAfter: 'I saved it — continue',
  notStarted: 'Not started yet',
  progress: (season, rec, team) => `Season ${season} · ${rec} · ${team}`,
  switchSport: 'Switch sport',
  continueAll: 'Continue',
  pastePlaceholder: 'Paste your code here',
}
