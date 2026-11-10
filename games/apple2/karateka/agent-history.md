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

## 24 October 2026, sound and a scrubber for the demo

- Aaron asked for the demo widget's sound, the CRT switch and a scrubber
  over its flips. The first round is 571 flips: flip 572 shows the
  credits page flip 1 showed, and the second round runs 518 flips, since
  the fight's random numbers carry on.
- Run in Apple2TS from the title's snapshot with its sound recorded, the
  round made 16,141 clicks, as the 6502 run did, at the same spacings
  within every flip; only the first click after a flip, in 52 flips,
  came 4 cycles apart, and the flips came later on the IIe, which waits
  for the vertical blank (`work/verify/demo_sound_live.py`).

## 3 November 2026, the Graphics tab

- Aaron asked for a Graphics tab on the agent-made minisites. Its
  pictures are all drawn by the game's own routines on the kit's 6502:
  the fighters by `command`, `animate` and `draw_figure`, each picture
  alone by a stage's shape routine at $1903.
- The engine has no shape routine of its own: $1903 is in each stage's
  load, so a picture of the engine's drawn on the engine alone ran into
  zeros. The engine's pictures are drawn on the cliff's load, which
  leaves $6000-$9FFF alone.
- Mariko's pictures are each load's own, from $1530: the title's and
  the cliff's are the same bytes, the palace's and the dungeon's the
  same, and the last stage's a third set. The engine's tables ($7E3F)
  point into whichever is loaded, so in the title some entries point at
  bytes that are not pictures. The page shows each picture by its label
  instead, once.
- Akuma never stands or bows: started from the standing pose, his own
  routine drew garbage, so his moves start from the stance.
- A kick or a punch asked for in the middle of a step is refused, so the
  page waits up to 12 frames for the stance and no move under way
  before each command.
- The first piece-by-piece picture drew a fighter over the floor's
  pattern on the whole page. ORed onto those dots, Akuma's orange came
  out white and blue. The stages draw a fighter in three calls: the band
  he stands in ($6780 or $678C: rows 114-152 black, 153-163 the floor),
  his feet mask ($6786 or $6789), then `draw_figure` ($6783), as the
  stages' loops call them (the cliff's at $B457-$B475 and $B9AC-$BA69).
  The page now runs those three.
- The first cast drew the hero with blue trim and Akuma blue, where the
  reference screenshots have them orange. A lone dot's colour follows the
  evenness of its dot across the screen, so a fighter's colours follow
  his column plus the scene's dot offset ($50). Drawn at each evenness,
  the hero's stance pictures are orange at an odd sum and his standing
  ones at an even one, a guard's the other way, which matches $6717's
  rule for the falling pictures (odd for the hero, even for anyone
  else). The cast now uses $50 = 0, as the stages' set-up leaves it, the
  hero at column 10 standing, a guard at 31, Akuma at 30, Mariko at 11
  and the hawk at 19, which gives the screenshots' colours.

## 10 November 2026, the media ledger and side B

- The ledger had no reader for the Apple II, and this disk gives a reader
  nothing: one 16-sector boot sector on track 0, and every other track in
  the game's own format. A look at the tracks' fields between their sync
  gaps showed marks that change from sector to sector (the loader's table
  at $414C), so the format was not decoded a second time in Python: the
  emulator was taught to keep what the game's loader stores while it
  reads the drive (`reads`), and `kit/apple2/media.py` takes a track's
  bytes from that log.
- The first log kept every store near a drive read, and the loader's own
  counters and zero-page swap filled it with one-byte runs. Runs that end
  below $0200 are now left out by the reader, and a single byte that is
  written again is dropped.
- Tracks 12 and 20 stayed open at 2,048 of 3,072 bytes. Each track's
  twelve sectors go to two places ($1C00 and $A000 onwards), and the
  title and the cliff hold the same bytes at $1C00-$1FFF, as do the
  palace and the dungeon, so the ledger credited the $1C00 run to the
  earlier part and found the rest in the later one. The ledger now counts
  an item's pieces in every part that holds them.
- Side B was scanned to see what "upside down" is made of. It is 384
  bytes of row addresses and one picture; the rest is side A. Booted, it
  shows the title, the castle and the cliff upside down
  (`reference/side-b-*.png`).
- Side B's palace load stopped with the head on track 18 and never came
  back: the loader was reading one sector again and again. Tracks 17, 18
  and 19 each have a sector that does not read in this copy. Tracks 20-22 were read by entering the
  loader at $501D with the half track and the table row set by hand; a
  first try at track 18's later sectors the same way timed out.
- The four sectors the loader reads into page $40 and discards were
  looked at because the ledger listed them. On side B one holds code that
  prints `FREE=`: a leftover of a patched DOS 3.3 on the disk the side
  was mastered from.
