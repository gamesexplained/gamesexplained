# A Nightmare on Elm Street — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 16 November 2026: the house and the street to 100 %

- The house part (MAIN, side 2) was annotated first, then the street part
  (INIT, side 1). The street carries copies of much of the house's library:
  the text windows, the helpers, the sound player and the drawing routines.
  Those were ported with scripts that line up each house routine with its
  street copy, instruction by instruction (a few fixed offsets: $2833,
  $281B, $2810, $2799, $27B5, $2631), and only where every opcode matched.
  Where the street's copy differs (choose, print, next_char, effect_tick)
  the comments were written from the street's own code.
- A run of applies went to the wrong disassembler session: `r2000.py --game
  street` run from the game folder, not from `parts/`, does not find the
  part, falls back to the game folder and talks to whichever session
  answers on the default port. Run it from `parts/` (or give the part's
  path), and check `work/r2000-port`. The stray journal lines were moved
  into the street's own `work/annotations.jsonl`.
- The porting found three house comments wrong: clear_screen_colours had
  the screen and colour pointers swapped ($64E2 is the screen), effect 34
  is silence (three empty voices) rather than a sound, and five "X saved,
  in ..." suffixes named the wrong routine (h33, h34).
- The street's codemap recorded MAIN.OBJ's boot code at $1400-$1506 as
  ran: FREDDY loads MAIN.OBJ there, it loads the rest and INIT, and INIT's
  title tune is loaded over it. Those addresses were taken out of
  `parts/street/codemap.json`, since no byte of the street's snapshot there
  is code; MAIN.OBJ is answered in media.json.
- Found in passing: street_init copies the scratch command's template with
  `LDX $0014` where `LDX #$14` was meant; Freddy's house is built at one of
  nine places picked at random ($3882); the street's key table adds F3,
  which fills health, and shift-D, which the street ignores.
