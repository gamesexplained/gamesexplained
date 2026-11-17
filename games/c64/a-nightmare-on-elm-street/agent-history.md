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

## 17 November 2026: the pages, the sample, and the review

- The sample of 60 comments (seed 1611) went to one checker agent on
  claude-opus-5-5: 8 wrong, all corrected, with the comments around them.
- While writing the Gameplay page, the level texts showed that two monster
  names in the resident comments were guesses from the shapes: "a
  spider-like creature" is the roach the hints name ("THE PICK WORKS BEST ON
  ROACHES", and its weakness is the PICK), and "a pram" is the wheelchair
  ("THE AXE WORKS BEST ON WHEELCHAIRS"). Both comments and the Graphics
  table were corrected.
- The credits picture had been described as Westwood's logo above
  Monarch's words; it reads "MONARCH SOFTWARE AND Westwood ASSOCIATES",
  with Monarch first. Corrected in orientation.md and on the Overview.
- The MAGIC SHIELD: no handler, no immediate `#$35` in the house code, and
  no `$DB $35` (op_if_item) in any SCn.DAT. One `$E1 $35` pair in SC9.DAT
  is inside the object table, not a script. D8 has the item at cell 62, 43.
- `r2000.py --game resident` run from the repository root reported success
  but the comment did not reach the export; run again from `parts/` it did.
  The script now refuses a `--game` that is not a game or part folder.
- The build counted bare `<code>$xxxx</code>` addresses linking to
  `source.html` with no record; every page now has `data-part=""` on its
  main element and links its addresses by part.
- The reader review (one agent on claude-opus-5-5, findings in
  `work/reports/reader-review.md`) found: the effects player failed with a
  stack overflow (the page wrapped createDriver, and the AudioWorklet runs
  the driver's source by its own name, so the wrapper called itself; fixed
  with `data.offset`, and `test_music.js` checks it); the nine house places
  were not drawn (Maps now draws the house at all nine, marked H1 to H9, and
  no longer marks ladders in Springwood); the maps could not be seen whole
  (a Whole level / Full size button); the skeleton's weakness changes
  nothing (Gameplay corrected, new Discoveries section); unlabelled
  monster rows and unclear table columns (fixed); Freddy fleeing when
  beaten outside the final fight (added to Gameplay); the drain and clock
  rates (given in passes); guesses in Discoveries (removed). Left for later,
  in TODO.md: drawing level 10's DEAT1 death pictures, naming the 20
  unnamed sound effects, and pictures of items and floors.
