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
