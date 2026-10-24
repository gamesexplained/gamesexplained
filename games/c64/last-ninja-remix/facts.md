# Last Ninja Remix — verified technical facts

Current truth for the game as a whole: what the parts share and how they
follow one another. Each part's own facts are in `parts/<id>/facts.md`,
where every address is that part's. Unless marked *live*, a fact comes
from reading the code in the snapshots `orientation.md` names.

## Build

- The copy cracked by The Force with Ikari+Talent's trainer, side A and
  side B (`orientation.md` names the images). Side A holds `LAST NINJA
  REMIX` (The Force's intro), `NINJA INTRO /I+T` (System 3's intro, the
  engine and Ikari+Talent's intro and trainer, packed), `01.CENTRAL PARK`
  and `02.THE STREET`; side B holds `03.THE SEWERS` to `07.FINAL BATTLE`.
- Sixteen parts: System 3's intro, the engine, and for each of the seven
  levels a title load and a play load. A level is one packed file
  (`0n*`, the name at engine `$117D` with the level's digit stored into
  `$117E`), which the engine's loader (`LoadAndExpandLevelFile`, engine
  `$1000`) unpacks backwards in two segments: the first ends with the
  title card drawn and the tune playing, the second, after Space or fire,
  is the level.
- The intro is gone once the game starts: its hand-over (intro `$0340`)
  gives the machine back to the KERNAL and loads `NINJA*` (intro `$03A6`).
- The trainer's options (unlimited lives, unlimited power, the ← key to
  skip a level) are the crackers'. Their code is in the engine's listing,
  at the end of the interrupt (`$1F52-$1F6B`, which X-Rated's crack does
  not have). Every snapshot was taken with both options off, so
  `BIT $03F2` (`$1F60`) and `BIT $0229` (`$1F65`) stay `BIT`s; the level
  skip is on in all of them: `STA $02AF` at `$1F5B` asks to end the level
  when `$0267` is `$FD` (the ← key alone), except in the Final Battle,
  where `CoordinateLevelLoad` makes it a `BIT` (`$1723`).

## Memory layout

In play, `$01` is `$35`: RAM everywhere, with the I/O at `$D000-$DFFF`
and no ROM. The video chip sees bank 0: screen `$0400`, multicolour
bitmap `$2000`.

| Thing | Where |
|---|---|
| Zero page, the stack, the game's variables | `$0000-$03FF`; the item flags `$03D8-$03FF`, one byte for each of 40 items; what goes on to the next level `$03B0-$03D7` (`SaveLevelState`, engine `$1C30`) |
| Screen colours of the bitmap | `$0400-$07E7` |
| The colour copy, written beside colour RAM and copied into it | `$0800-$0BE7` |
| Sprite images, two buffers of eight | `$0C00-$0FFF`; during a load the copy of pages 0 to 3 (`CoordinateLevelLoad`, engine `$16AD`) |
| The engine's code | `$1000-$1FFF`: loader and unpacker `$1000`, score `$1183`, text `$1583`, load coordinator `$16AD`, tile compositor `$17F6`, glyphs `$1AE8`, clock and score `$1C65`-`$1CA7`, sprites to the chip `$1DAD`, interrupt `$1E15` |
| The bitmap | `$2000-$3F3F`: the play window in columns 0 to 29 of rows 0 to 17, the status panel to its right and below |
| A level's first load | `$3FF3-$4DFF`: the hand-over vectors at `$3FF3` and `$3FF6`, the tune from `$4000`, the scene header; then the title card above `$4E00` |
| A level's second load | `$4E00` up to between `$F34A` and `$FFA8` by level: scene records, the level's code, frames, animations, packed sprites (some in the RAM under `$D000-$DFFF`), panel pictures, and near the end the buffer the wall compiler fills with the walls of the area on screen |

## Timing

- Two interrupts, both through `GameplayIrqDispatcher` (engine `$1E15`).
  CIA 1's timer A, latch `$4C00` (19,456 cycles, set from `$028C-$028D`),
  counts the game's tick in `$E2` with its high byte in `$F0`, and every
  fourth tick in `$B0`, unless the game is paused (`$02B7`). *Live*: 505
  ticks in 500 frames on PAL. The raster interrupt comes once a frame
  (*live*, 500 in 500 frames): it sets the sprites and the status panel,
  plays the tune and keeps the clock.
- The clock (engine `$1F1B`) adds a second every 50 raster interrupts
  (`$0228`). *Live*: 10 seconds in 500 frames on PAL. On an NTSC machine
  the raster comes 60 times a second and the count stays 50, so the clock
  runs a fifth fast there.
- `MachineSetup` (engine `$0E00`) tells PAL from NTSC by asking for a
  raster interrupt at line 304 and keeping whether it came in `$AB`. With
  `$AB` zero the interrupt plays the tune on five frames in six
  (`$1EFB`-`$1F0E`), so the music keeps its PAL speed.
- The intro: the logo for 500 frames (intro `$08F3`, a count of `$01F4`),
  the temple, the figure, the lightning and the vision for about 1,030
  more, the city for 250 (intro `$0F09`), then the logo again. *Live*:
  the temple began by frame 505 and the city by frame 1,535, and the logo
  came back by frame 1,790.

## Controls

- Joystick in port 2 (`ScanAndNormalizeInput`, `$9418` in Central Park,
  the same in every level): the stick's five bits in bits 0 to 4 of `$7C`,
  and the second button in bit 5. The second button is a joystick button
  wired to port 2's POTX line, read as `$D419` below `$80` after `$DC00`
  is set to `$80` to select that port's paddle lines, as on the C64GS's
  three-button pad.
- Whichever button starts play becomes the fire button: the credits card
  that starts a level and comes back after a GAME OVER waits for a button,
  and the second button sets `$AC` (`$8EE8`-`$8EF9` in Central Park); the scan
  then swaps bits 4 and 5 whenever only one of them is pressed.
- The second button alone selects the next weapon the player holds
  (`$951B`, with Space doing the same), and both buttons together the next
  item (`$9497`). *Live*.
- Keys: F1 turns the sound off and on (`$AA`, read by the interrupt at
  engine `$1EEA`; turning it off clears the SID's registers
  `$D400-$D417`, leaving the volume at `$D418`), F3 and F5
  step through the items, F7 pauses (`$02B7`), Space selects the next
  weapon, J turns the stick's directions through an eighth of a turn
  (`$03F3`, 0 to 2, added to the heading at `$A50D` in Central Park, and
  shown as MODE where the score is), and RUN/STOP alone kills the ninja
  (`$0267` = `$7F` sets the death latch `$B6`).
- A hidden sequence ends any level: facing heading 1 (up and right), hold
  the second button and push up, centre, up, centre, left, centre, left,
  centre, right, centre, right, centre, down, centre, down, centre, left,
  centre. `$95AB`-`$95CE` in Central Park takes a reading of `$7C` only
  when the next scan finds it unchanged (the last reading is kept in
  `$AD`), compares it with the next entry of the table at `$95D6` (the
  count is `$BF`), and after the eighteenth sets `$02AF`, the request to
  end the level. *Live*: the ARE YOU SURE YOU ARE PREPARED
  FOR THE NEXT LEVEL question came up. `ResolveLevelCompletion` asks it
  only when an item the level needs is missing, and YES goes on all the
  same.
- In the intro, fire on port 2 or the second button leaves it
  (intro `$0905`-`$0927`), but not on the logo's first showing: `$4C`
  is set only when the city has been shown (`$0F16`). *Live*.

## Graphics

- Every screen is multicolour bitmap. A room is drawn into the play
  window by the scene renderer (`$8A52` in Central Park, at its own
  address in each level), which walks a tree of scene records: a picture
  (a size byte, then eight bitmap bytes for each cell, then a screen byte
  for each cell, then a colour byte for each cell, each kind in a block
  of its own) or a composite of placed scenes with optional colour
  swaps. Scene pointers have bit 15 set for a picture.
- The ninja and his enemies are built from software sprites: each frame
  record lists parts, each part a packed sprite, which the decoder unpacks
  (`$68` escapes the next byte, `$69` to `$6F` stand for one to seven
  zero bytes, 63 bytes out) and the compositor merges, masked and
  mirrored, into the eight hardware sprites of the buffer not on show.
- The status panel is loaded with the engine and stays: the USING and
  FOUND boxes, the score, the clock and two square spirals for the
  enemy's and the player's energy, 44 half-cells each (engine `$1D4B` and
  `$1D78`), recoloured by the interrupt.
- Text is drawn into the bitmap from 41 glyphs (engine `$1AE8`) by the
  inline-text routine (engine `$1583`), which takes its column, row,
  colours and glyph codes from the bytes after the `JSR` and returns past
  their closing zero.

## Mechanics

- Energy: 44 for the player (`$0229`) and for the enemy (`$022A`). The
  shown values (`$022B`, `$022C`) follow them a step at a time.
- Lives: item 26's flag (`$03F2`), 4 at the start (the state
  `MachineSetup` leaves, engine `$0EAF`). Each death takes one
  (`LoseLife`, `$93C4` in Central Park, its `DEC` at `$93DB`); when none
  is left, item 8 (`$03E0`), a spare life, is spent if the player has it
  (`$9012`), and otherwise GAME OVER is printed and the level's credits
  card comes back (`ResetSceneAfterDeath`). The end of a level also turns
  a spare life into a life (`SaveLevelState`, engine `$1C30`).
- Items: the flags at `$03D8`, indexed by item number. The levels'
  object records say where each item lies and what taking it does; some
  call a routine first, which may refuse unless a given item is selected.
- A level ends through `ResolveLevelCompletion`: it checks the items the
  level asks for (Central Park four, The Street two, the rest none), and
  if one is missing asks ARE YOU SURE YOU ARE PREPARED FOR THE NEXT
  LEVEL, where YES ends the level all the same and NO goes back to it;
  then it adds 5,000 to the score (`$50` to the hundreds and thousands
  digits, engine `$1183`), takes away the items used only in that level, saves
  the items, score and clock (`SaveLevelState`, engine `$1C30`) and calls
  the load coordinator (engine `$16AD`) for the next level.
- The clock is also a code. The Basement, as it ends, copies the clock's
  minutes and seconds into the lock code at `$0297`-`$029A` (engine
  `$1D3F` gives the digits' places); The Office shows the code when the
  player takes object 0 in its area 3, and copies the clock into it again
  after a GAME OVER there; the Final Battle's lock asks for those four
  digits. `MachineSetup` starts the code as 1111.

## Data tables

- Clock digits as glyph numbers at engine `$1C77`, their places at
  `$1D3F` and their limits at `$1D45`.
- The energy spirals' cells at engine `$1D4B` and `$1D78`.
- The unpacker's offset widths at engine `$17E6-$17F5`; each level file
  brings the last three.

## Sound

- Each level's tune is in its title load, with its player at `$4000`
  (`$4000` to start, `$4003` every frame, five frames in six on NTSC).
  The engine's interrupt plays it (engine `$1F0E`), and so does the
  loader between the level file's two segments, while it waits for Space
  or fire (engine `$111D`); it turns the volume down before it reads the
  level. Six tunes for seven levels: The Mansion and the Final
  Battle have the same one, byte for byte over `$4000-$4D66`.
- Each tune carries a line of text at `$400C` that nothing reads, crediting
  Reyn Ouwehand with the music and Falco Paul with the player, and in
  most of them the sounds too, in different words each time (Central
  Park's names only the player, and The Office's gives the music to both
  of them); the tune for The Mansion and the Final
  Battle says it was composed WHILE BEING BUGGED BY FALCO, RICHARD &
  JOHN! The title parts' facts give each text.
- The intro has a driver of its own at intro `$B000` (`$B000` to start,
  `$B003` every frame), with its own pattern and instrument formats
  (`parts/intro/facts.md`).

## The listing's error rate

Seed 20261024, population 11,351 comments over the 16 parts: 4,441
written one at a time (by hand, or Central Park's carried over to the
routine at the same place in each later level) and 6,910 generated from
templates, one template for each kind of record (packed sprites, frames,
scenes, pointers and the like). A sample of 60 from the first and 20
from the second, the 60 spread over the parts by their size, was checked
against the bytes by an agent on claude-opus-5-5[1m] that wrote none of
them. 19 of the 80 were wrong in a detail: 15 of the 60 and 4 of the 20.
That is 24 % (95 % interval 16 % to 34 %), or 22 % with each stratum
weighted by its size, and a lower bound, since a checker misses some.
What was wrong: the frame templates called the second header byte a
vertical offset, where the composer doubles it into the mirror width for
an actor facing the other way, and said the actor's state always picks
one of a frame's three alternatives, where the low two bits of `$92`
pick one or none; the wall template left out the script command byte
that follows a length with bit 0 set; the exit thresholds' template
missed that byte 0 belongs to no area and that the closing `$FF` is
compared too; the pitch-list template named the wrong instruction as the
table's reader; the unpacked images' template said two extra-sprite
kinds use them, which no area's enemy has. Central Park's comments,
carried to the same routines in every level, misread the sprite blitter
(it overwrites the sprite, and `$F1` is the mirror flag), the routine
placing a part (which does not keep A), the enemy's steering, the
dissolve (one random mask and one random offset a pass, over the sprite
buffers), the routine setting up a level's status (which builds no
scene), a negative height change (which wraps), the timing of the
player's actions, where two no-op handlers return to, and a register
list that left out `$6D`; a Basement note said several walls carry a
command that one wall carries. All 19 were corrected, each with every
comment that said the same: 1,109 comments changed in all.

Seed 16184, the maintainer's check (air): 60 comments from the same
11,351, spread over the parts by their size, checked against the bytes
by a fresh agent on claude-opus-5-5[1m]. 10 of the 60 were wrong in a
detail: 17 % (95 % interval 9 % to 28 %). The projectile launcher was
said to set a speed and an owner, where it stores a lifetime and a kind
and always launches the player's slot; a byte of a tune's arpeggio
pointers was called a list of its own, where the low and high tables
overlap by a byte; the intro tune's order list was said to hold 41
patterns and run 1,601 ticks, where it holds 40 and runs 2,064; the
per-area store of enemy energy at `$3F92` was called a status-panel
cell; the projectiles' scenery test was said to read the collision map,
where it tests the bytes of the drawn sprite; a sweep said to change a
voice's frequency changes its pulse width, or the filter's cut-off; a
vibrato setting's table offset left out that the byte is halved first;
`$74` was called a target, where it is the actor's height, which `$EF`
freezes; a table's comment named the wrong routine after it in The
Final Battle; and a sprite list was said to serve the wrong enemy kinds.
All ten were corrected, each with every comment that said the same.
Since more than 2 of the 60 were wrong, every comment was then audited.

The audit (air): fresh agents on claude-opus-5-5[1m] checked every
comment against the bytes, in seventeen ranges, and every claim in the
facts files. The 1,428 comments carried unchanged from Central Park to
the later levels stand with the Central Park comment they copy, and each
copy's calls and constants were compared with Central Park's: about
sixty that differed were rewritten for their level and checked again.
Of the 1,942 items read (a template's comments counted once and checked
through its instances), 382 were wrong in a detail, and 66 of the 355
claims in the facts files. What was wrong most often: counts given in
ticks that are in steps of the tempo or of an animation; callers and
readers named wrongly or left out; comparisons read the wrong way round
or off by one; an exit's `$FF` called "none", where it ends the level;
Central Park's description kept where a level's code differs; and the
end of the engine's interrupt, `$1F52-$1F6B`, called the game's, where
it is the crack's trainer. All were corrected, each with every comment
that said the same: 2,257 comments differ from the listing the seed
16184 sample was drawn from, and 70 were written new.

Seed 25956, the maintainer's second sample (air): 60 comments from the
9,970 that are not unchanged copies, spread over the parts by their
size, checked against the bytes by a fresh agent on claude-opus-5-5[1m]
that wrote and audited none of them. 1 of the 60 was wrong in a detail:
1.7 % (95 % interval 0.3 % to 8.9 %), within the mark of 2. The
condition lists' template called the second byte of an entry the
smallest depth at which the actor is tested against the picture, where
it is the largest. The audit had found it and corrected only the
six lists it was shown; the other 66 were corrected now. A search for
other corrections that had stopped short found twelve more comments in
The Mansion, The Final Battle and The Office, and they were corrected
too.

## Live tests

- The intro's hidden credits: holding L on the logo starts a scroller
  across the badge (credits state `$3D` = `$80`); 803 characters came in
  3,210 frames, one every fourth frame, and the logo stayed up while it
  ran. A screenshot shows the text between the badge's S and 3.
- The intro's fire: port 2 fire held for 100 frames on the logo's first
  showing did not end it (`$0B85` not reached); with `$4C` set to 1, port
  2 fire and the second button each did.
- The intro's scenes: the temple by frame 505, the city by 1,535, the
  logo again by 1,790, timed with checkpoints in steps of five frames.
- The hidden level skip in Central Park: after turning to heading 1, the
  sequence above with the second button held counted `$BF` from 0 to 17
  and then set `$02AF` to `$FF`; the next-level question came up. Facing
  heading 3, the same input reset `$BF` on every pass.
- The second button: with weapons 1, 2 and 4 given to the player, four
  presses selected weapons 1, 2, 4 and 0; with items 7 and 9 given, three
  presses of both buttons selected items 7, 9 and 0.
- The tick and the clock: in 500 frames of Central Park, the CIA interrupt
  came 505 times and the raster interrupt 500 times; the clock moved ten
  seconds and the tune was played on every frame.
