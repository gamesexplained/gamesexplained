# Tutti Frutti — agent history

## 12 November 2026

- Booted the supplied PRG on plus4emu's PAL C16 and Plus/4. A stop at
  $2000 during the first BASIC phase timed out because that address still
  contained title glyphs. Captured the publisher phase at the first SYS
  and reached $2000 after the next unpack.
- Matched the resident bytes on both models. Combined engine execution
  maps from boot, normal play and controlled clear, slide and death
  probes. The listing was built from the resident hand-over.
- Used the same paused state to test the joystick, keyboard, ball and
  falling apples. Forced individual clear predicates to reach later
  layouts. Repeated the natural up, left, down-and-fire route in the
  block orchard on both models to reproduce the first-push delay.
- The second of two simultaneous emulator checks exited before its
  restart check. A fresh Plus/4 check on its own port passed all 46.
- The independent sample caught a fruit-name reversal at $2463. The
  correction also fixed its partner at $246A.
- Compared the reconstructed frame with plus4emu's display window and
  checked the six map renders, 32 moving-shape records, two slide
  traces, and five TED recordings from the listing in Node.

## Full listing audit

- Two independent checkers reviewed 102 and 104 comments. The audit
  corrected 13 comments and renamed the falling-apple settle hook.
- Controlled plus4emu probes measured the spawn reserve wraparound,
  both endpoints of the spawn countdown and the ball's new-cell color.
- A fresh checker sampled 60 of the 206 revised comments and found
  zero errors.

## 24 November 2026

- Rewrote the first-slide bug for readers: the Discoveries page now runs
  the push with a countdown of 126 and of 0 side by side, frame by
  frame, through the game's own routines. Found Warren Pilkington's
  review describing the same wait after loading.
- Explained the three kinds of orchard and their second ways to win on
  How it works, and gave the corner secret a picture that runs the
  game's own corner check. The cassette inlay mentions only the cherries.
- Looked again at the Plus/4 World hidden apple. This copy's map and fall
  table agree, and the opening shows all six apples. The candidate is the
  apple under the round message; it stays open.
