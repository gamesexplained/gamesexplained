# The engine: verified technical facts

Addresses are the engine's, as it stands in play (`work/play.vsf`), with
its top half copied to `$B100`-`$FFFF`. What spans the parts is in the
game's own `facts.md`. Unless marked *live*, a fact comes from the code.

## Memory

| Range | What |
|---|---|
| `$0200`-`$024A` | five object tables of 15 slots; the others are at `$F474`-`$F944` |
| `$033C`-`$0A6F` | the music driver, its variables and its frequency table |
| `$0A70`-`$0FE9` | the sound-effect player and 35 effect definitions |
| `$1000`-`$12C7` | colour tables, the level reveal, voice allocation |
| `$12C8`-`$136D` | the sound table (45 sounds) and `play_sound` (`$1352`) |
| `$1600`-`$17FF` | the title tune, swapped to `$7000` by the title (Jellyland `$9E6A`) |
| `$1800`-`$2368` | start-up, interrupts, level start, the play loop |
| `$23EE`-`$2A39` | the map scroller |
| `$2A3A`-`$3B3E` | player movement, slopes, score, panel, clock, stars |
| `$3B3F`-`$3FFF` | stage start, stage card, game over and continue, page swaps |
| `$4000`-`$43FF` | the panel's sprite blocks 0-15 |
| `$4400`-`$4BFF` | the protection screen at the hand-over; the two screens in play |
| `$4C00`-`$59FF` | Mayhem's sprite frames, blocks `$30`-`$67` |
| `$B17A`-`$B1AC` | the NOP slide for raster timing |
| `$B1AD`-`$C189` | scene sprites, touching and losing a life, the big font, the sad/happy swap, items, the tally, the multiplexer |
| `$C18A`-`$CB54` | object movement scripts and hits, the animation-script interpreter |
| `$CBA5`-`$CEE0` | new game and the land loader |
| `$CF78`-`$CF9A` | the game's numbers: score, lives, counter, time, level, continues, and the copies they are redrawn from |
| `$D000`-`$D0FF` | the 1541 fast loader's drive code (RAM under the VIC) |
| `$D100`-`$D6FF` | the scene between the sad and happy halves of a land, run at `$6000` |
| `$D800`-`$DFFF` | the front-end character set (RAM under the I/O chips) |
| `$E000`-`$F944` | tune 9, Mayhem's sprites, portals, land start, the object spawner, the stage card and stage complete, per-slot tables |
| `$F9A6`-`$FFB6` | panel captions, star frames, the stage card's sad and happy tunes, the stage-complete tune |

## The numbers

- Score: nine decimal digits `$CF78`-`$CF80`, most significant first,
  drawn into panel sprite blocks 0-2 (`$3578`). `$350B` adds one of 16
  events (`$34E7`/`$34F7`): 1, 500, 200, 100, 50, 1000-5000, 10,000,
  20,000, 50,000, 80,000, 100,000 or 1,000,000 points, repeated `$1B78`
  times while the multiplier is on.
- An extra life when the millions digit `$CF7A` rises, in two of the
  three ways it can: an event added straight to that digit (the
  1,000,000 event, `$3530`), or a carry out of the hundred-thousands
  digit `$CF7B` rolling over from 9 inside the carry loop (`$355A`), each
  → `$3636`. The third way gives none: an event of 100,000 is added to
  `$CF7B` itself, and when that digit is 9 it wraps at `$3541`-`$3548`
  and carries into the millions outside the loop's test. A SUPER TIME
  BONUS (100,000) that takes the score past a million therefore earns no
  life.
- Lives: `$CF81`-`$CF82`, decimal. `life_lose` (`$BDC1`) decrements the
  tens and leaves the units 0 when the units are 0, so 10 lives become 00
  (`$BDCE`). The title's cheat writes RTS over its first byte (*live*).
- Time: start digits from the land's `$9044`-`$9046` (sad) or
  `$9047`-`$9049` (happy) (`$BD37`); one unit off every 75 passes
  (`$37EE`-`$37F5`; *live*: 10 units in 750 frames); `$1BAA` stops it;
  warnings at 060 and 030 (`$37E3`, `$37E6`); at 000 the life is lost
  (`$383F` → `$B5E9`).
- Continues: `$CF8A`, 3 for a new game (`$E52D`), taken at `$3EAF`.
- Every land load adds a life (`$CC55` → `life_add` `$3866`); a new game
  then sets the lives to 3 (`$E52D`), so the first land starts with 3 and
  each later land with one more than the last one ended with.
- The high score is nine digits at `$F97F`-`$F987`, kept by the title in
  Jellyland's file (`$9E89`-`$9EA6` there).

## Play

- Touching: the first touch sets `$1BB7` and gives `$64` frames of grace
  (`$B61D`); the second costs the life (`$B5E4`). `$387D` clears the flag,
  from the extra life, the power-up and item effect 8.
- Stomping: an object's kind below `$F7` is its strength; a stomp takes
  off `$1BAB`, which depends on the fall (`$342E` by `$1B5D`), and kills
  below 0 (`$C726`). Kinds `$FB` and `$F7` cannot be stomped (`$B59D`);
  `$F8`, `$FC` and `$FA` always hurt; `$FD` bounces him (`$C6F8`); a
  charge kills them (`$B5B9`).
- Items (`$BC15`): 200 points, then the land's `$9075` maps the item to
  one of nine effects through `$F994`/`$F99D`: charge (`$BC55`, sets
  `$1BEB`), multiplier (`$35F3`, 2 then +1 to 5), ten off the counter
  (`$36D2`), power-up (`$BB69`), extra life (`$3636`), one off the
  counter (`$36ED`), clock stopped for 20 ticks (`$CB4B`), an extra
  continue (`$10C1`), and `$10D5`.
- Stars are characters `$FB`-`$FE`. In the sad land `$B7C3` writes RTS
  over the first bytes of `$38C4` and `$3AEE`, so stars exist only in
  the happy land. A star's points follow its spin delay from `$EDF5`:
  500, 200, 100, 50 or nothing (`$3901`-`$3908`).
- The jump: index `$1B5D` = `$17` at take-off (`$2D79`), speeds from
  `$3460`; letting go of up cuts it to 6 (`$2D94`-`$2D9E`).
- Solid ground: a glyph below the land's `$9021` is a wall, below `$9020`
  also a platform; down + fire drops through a platform (`$2D09`-`$2D20`).
- The finish line: in the happy land, glyphs `$16`-`$17` under his feet
  with `$CF8B` set end the stage `$6E` passes later (`$2B4C`-`$2B69`,
  `$2051`-`$205D`). While he skids on, each character scrolled adds to
  `$1BF0`/`$1BF1` with a rising sound (`$1EFD`-`$1F24`).
- Tally (`$BE84`, `$F302`): time × 100, the counter × 500, skid × 1000;
  "SUPER STAR BONUS" (1,000,000) when the counter is 000, "SUPER TIME
  BONUS" (100,000) when the time is 000.
- Sad and happy: `$1BEC` (0 sad, 1 happy). `$B785` swaps the land's two
  character sets (`$A900`-`$B0FF` with `$7800`-`$7FFF`, *live*-checked
  table) and `$A800` with `$8900`, and swaps bytes 3 and 7 of each object
  record; happy objects use their type + 25 (`$E8AE`). Theo's scene is
  `$D100`-`$D6FF`, swapped to `$6000` and entered at `$638D` (`$3BBF`);
  it returns to `$3BCC`, which restarts the stage happy.
- Portals: objects with behaviour `$80`-`$8F`; `$E4E3` makes the touched
  one active (`$1D60`, bit 7 of record byte 0).
- Defeated objects: `$CB02` sets bit 4 of record byte 10; a respawned
  object with it is freed without its item (`$C962`); `$E595` clears the
  marks when a land starts.
- Lightning in the sad land when the land's `$903D` is set (`$BE0D`),
  with colours from `$BE39`-`$BE49`.

## Display

- VSP scrolling and the raster chain: the game's `facts.md`.
- Sprites: 15 object slots in three bands of five, each band on sprites
  0-4 (`$C0DC`, `$C01C`, `$C07C`, chosen per band by the land's `$90B0`
  through `$29B0`); Mayhem is sprites 6 and 7 at X `$AC` (`$E426`,
  `$EE9E`); the panel's numbers are drawn into sprites, six rows a digit
  (`$38A1`).
- The map: six bands of four character rows, one byte per map column in
  the land's `$8A00`-`$8FFF`; each byte below `$D0` names a 4×4 tile at
  `$8009` + 16 × tile, coloured per glyph from `$8900`; `$D0`-`$EF` are
  repeat markers and `$F0` and up tune markers, taking no column
  (`$23EE`, `$25F0`, `$27FF`). The two screens are double-buffered, and
  when the coarse column wraps the colour RAM is moved by 41 bytes
  scrolling right (`$2482`-`$2538`) and by 40 scrolling left
  (`$28E1`-`$297F`, with row 14 carried to row 15 through `$BFCF`).
- The big font: four character codes a letter at `$B6D5`, printed by
  `$B817`; M and W three columns wide, I, J, L and most punctuation one, `?` two (`$B812`).

## Sound

- The music driver: a tune starts at `$080C` (X high, Y low byte of its
  address) and plays from `$087B` each frame. A tune's first four bytes
  are the offsets of voices 1 and 2 from voice 0's data at tune + 4;
  events are pairs, a command (`$01`-`$25`) and its argument or a note
  and its length (`$052F`-`$0582`). Effects: arpeggio, slide, vibrato,
  pulse and filter sweeps, repeats on two levels, a call and return.
  Frequency table `$09B0`-`$0A6F`, 96 notes.
- In play the music has voice 3 and the effects voices 1 and 2 (`$1E85` →
  `$128A`, `$1E65` → `$12A2`).
- 45 sound numbers map to 35 effect definitions of 20 bytes (`$12C8`,
  `$12F5`, `$1322`, `$C144`); a sound starts only if its priority is at
  least that of the one playing (`$1352`).

## The land loader

`$CBAD` increments the level index `$CF89`, builds the name `$CF10`,X +
`'A'` + X, opens the file through the KERNAL and, if that fails, shows
the side-B prompt (`$CCF5`). Otherwise it writes the 256-byte drive code
to the drive's `$0700` and starts it, then receives the file two bits per
read of `$DD00` (`$CE6C`) into `$5A00` up to page `$B1`, with no length or
checksum test. After a load: Jellyland's title code at `$A547`, the other
lands through `$E54F` and `$3B3F`, the ending through `JMP $5A00`.

## Oddities

- `$08E0`, the third arpeggio partner's low byte, is never written, so
  three-note arpeggios play that note slightly flat (`$04DB`).
- The wall bump happens only at exactly speed `$5D` (`$2C33`).
- `$C000` clears memory from `$040A` upward without end; it is where the
  protection sends a player after three wrong codes.
- The hand-over's `$4800`-`$4BFF` holds the protection's answer table
  (`$4A00`-`$4B77`, 47 entries of 8 bytes, exclusive-ORed with `$45`) and
  code the game never runs, a disk routine and a saver for a file named
  "GAME", beside the text "DOWNLOAD BY JAZ".
