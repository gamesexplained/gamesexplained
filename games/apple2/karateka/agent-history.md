# Karateka — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 24 October 2026

- The disk came from archive.org's A Woz A Day collection as a WOZ 1
  image. The boot and its own loader were followed to the engine's
  hand-over at $0200 and each stage's at $BFFA, which made the game six
  parts: the resident engine and five stages loaded over it.
- A script that fought in stance with the arrows topped up got through
  stage 1 and most of stage 2, then died under stage 2's last portcullis
  every time, in stance and running. Stages 3 and 4 were first reached by
  setting $D0 and jumping to $020C; the stage bytes matched, but play from
  there was not the game (stage 4 began mid-fight). Reading $B8B0-$B97D
  showed the gate drops whenever the hero is under it; springing it with
  a punch from one step short, then running under it as it rises, worked.
- In stage 3 the same script stalled in a room with two doorways for
  minutes. Poking the hero's position past the doorway showed the next
  room; reading $7366-$7418 showed that an unpassed doorway opens to a
  kick. A second script that stands and runs between fights and kicks
  each shut doorway went from stage 3's natural entry to the closing
  text.
- The manual's text layer (OCR) gives "I" for joystick and "W/S/Z" for
  the kicks. The page images say J, and W/S/Z; the code reads J, and
  W/S/X. The manual's own misprint is the kick row.
- The text is plain ASCII in a lowercase-only face drawn by $0700; the
  punctuation sits at $7B-$7E. A search for the letter differences of
  "akuma" found every string in one pass.

## 24 October 2026, the minisite

- The Maps / levels tab runs each stage from its entry on the kit's
  6502, over the engine's listing with the stage's laid over it. Neither
  listing holds what the stage before leaves in the engine's memory, so
  zero page, $0D5E and $0F00-$0F0F are carried in `reference/stages.js`
  as each stage's snapshot held them at $BFFA.
- The first comparison with Apple2TS failed at every place of the cliff
  although the pictures looked the same. The differing bytes were the
  screen holes ($3FF8-$3FFF and the like) and the stack; the test now
  compares the 7,680 visible bytes of the page shown, row by row.
- No key reached the cliff at first: its snapshot had the joystick
  chosen ($C4 = 0), and Apple2TS centres the paddles, so the hero ran
  without a key. Writing 1 to $C4, as K does, fixed both runs.
- Rooms were reached without fighting by putting the hero at column $21
  ($62), where each stage moves him on, with every doorway opened
  ($C5 = 6). The dungeon's first place, Mariko's cell, showed the same
  picture as the palace's and was dropped.
- The brain calculator's first copy said a guard at distance 10 steps in
  72 times in 256. Porting $6B00 line for line and holding the port to
  the listing's code over every random number gave 183: the fourth table
  reads the stage's own entry JMP at $BFF9-$BFFD, and at 10 the chance is
  its high byte, $B7. The port also showed that a punch refused for the
  legs' pose goes on to $6C2F with X loaded from $4D by $6C71, not the
  distance.
- The tune player's bytes panel needed each note's offset into its tune:
  `reference/tunes.js` logs the tune's address at $0D00 and each note's
  at $0D49.
