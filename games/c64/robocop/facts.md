# RoboCop — verified technical facts

Current truth for this game. How this understanding developed lives in
`agent-history.md`. Every fact names the routine or table it comes from.
Unless marked *live*, a fact comes from reading the code in the snapshots
named in `orientation.md`. Addresses are given with their part
(`level-1` and so on) where the parts reuse addresses.

## Build

- NTSC Data East release, first disk image (`orientation.md`). Three
  loads: LOAD1 (level one), A/B/C (level two), D/E/F (level three), over
  what LOAD1 leaves for the whole game (the resident part).
- Level one's music driver carries the text `MUSIC DRIVER V1.1 ALL CODE
  & MUSIC BY JONATHAN DUNN` (level-1 `driver_signature`).

## Memory layout

| Thing | Where |
|---|---|
| Boot file, over the stack | resident `$0110-$0205` |
| Fast loader, computer side | resident `$0A00-$0AF2`, block buffer `$0B00` |
| High-score table, 8 × 18 bytes | resident `$0E40-$0ECF` |
| Character colours of the play set | `$0F00` in each level |
| Tile sets and stage maps | `$1000-$24xx` in each level; stage seven's tiles resident `$C400-$CCEF` |
| Music player and tunes | level-1 `$2500-$35xx`, level-2 and level-3 alike |
| Play screens (front and back) | `$4000` and `$4400`, play characters `$4800` (copied from `$D800`) |
| Sprite frames | `$5000-$7FFF` (frames `$40-$FF` of VIC bank 1) |
| Code | `$8000` onward and `$E000` onward in each level |
| Status panel screen and characters | resident `$C000` (VIC bank 3), characters `$D000` |
| Level loader for the next level | level-1 `$F701-$F9FF`, level-2 `$B8F5-$BBF4`, copied to `$0400-$06FF` and run there |
| Score carried to the next level | `$0100-$0102` |

## Timing

- NTSC. The raster interrupt at line `$E1` puts the panel's bank and
  characters up for the next frame; one at line 0 starts CIA2's timer B
  as a one-shot ($1936 cycles in level three), whose NMI switches to the
  play area part way down the screen (level-3 `nmi_play_area`). A second
  NMI a few lines on turns the hiding black band off.
- The music player skips one call in six: five ticks every six frames
  (level-3 music player, counter `$EE`).
- The stage clock takes a second off every 48 frames (level-1 `$ABFC`,
  `$07B3`); the time bonus takes one every four frames, 100 points each in
  level one (level-1 `$ADB9`) and 300 in levels two and three (level-2
  `$B7AD`, level-3 `$A813`).

## Controls

- Joystick port 2: the five switch bits index a move table (level-1
  `$8B3C`, level-2 `$8EC7`, level-3 `$89D3` and `$8A09`). Fire and up
  jumps; down ducks; fire and down fires on the stairs, punches at a
  door, or punches ED-209 on stage six.
- Space pauses and resumes; RUN/STOP restarts the level at its title
  (level-1 `check_quit`, `space_pressed`).
- The two level-skip words (cheats.md) are the only other keys read.

## Graphics

- Every figure is three sprites: two outlines and a multicolour body
  (level-1 sprite frame notes).
- Each level builds its left-facing arm and gun shapes at run time by
  mirroring the right-facing rows: 174 rows `$A708` to `$A971` in level
  one (level-1 `$A912`), 174 into `$ACA8` in level two (level-2 `$AC49`),
  86 rows `$A26C` to `$A3CD` in level three (level-3 `$A36E`). Graphics'
  cast tiles rebuild them the same way.
- Sound effects 10, 12 and 13 are in every level's effect table but no
  routine asks for them; effect 13 has no end (Music page's effect table).
- RoboCop's three-sprite composite (outlines `$7A`/`$7B` hi-res black,
  body `$7C` multicolour double height) matched a live screenshot of
  stage one on 18 November 2026.
- The play area scrolls with two screens: one shown while the other is
  built in pieces, then the two swap (level-3 `$8E16`, the swap at
  `$0683`).
- The status panel uses extended colour mode, switched on under a black
  band where the panel meets the play area.

## Mechanics

- Power 24 in a bar of six characters of four units; damage drains one
  unit each time the slow jobs run, baby food in store refills; at 0 or
  at 0:00 RoboCop dies (level-1 power routines).
- Clocks: 2:31, 0:36, 2:21 (level one); 3:31, 0:40, 1:01, 1:16 (level
  two); 2:01, 0:21 (level three).
- Stage ends: stage one 2,000 points and 12 units of baby food; the
  hostage stage after 20 hits on the gunman, 2,000 and 8 units; stage
  three 5,000; stage six after six punches on ED-209 (70 each, 300 more);
  stage eight at its exit; stage nine after eight hits on Dick Jones (75
  each).
- Every fifth kill drops a pickup, worth 250 points (level-3 `$99B1`).
- Level three's ED-209 has 50 hit points and scores 5,000; while it is on
  screen enemies reload in 2 frames and it blocks the scroll left.
- The Cobra cannon (level three, left by the carrier at `$A688`) fires
  bullet type 6: strength 51, through enemies, eight shots.
- Bug: level three's `enemy_fire` at `$9522` tests `$2F`, the first
  slot's Y, where each enemy's own `$2F,x` was meant.

## Data tables

- High scores: three decimal bytes, highest first, then 15 screen-code
  letters (resident `$0E40`).
- Tunes: six bytes each, three order-list addresses (level-1 tune table;
  tune 0 in play, 1 title, 2 photofit in level two, 3 start of stage, 4
  game over).

## Sound

- One music driver by Jonathan Dunn. Each level carries its own copy at
  its own addresses, but the five tunes and fourteen sound effects are the
  same: run on the kit's 6502 (`test_music.js`, 6,000 frames of each tune
  and 400 of each effect), every one writes the same values to the sound
  chip in all three levels.
- Space on the title switches SOUNDTRACK SETTING between AURAL AMBIENCE
  (music) and ATMOSPHERICS (sound effects); in play the game has one or
  the other (level-1 `title_toggle_sound` `$84EA`, `sound_option` `$A706`,
  `play_effect` `$2398`).
- Tune 2, the photofit's, is in all three levels' tune tables, though only
  level two plays it.
- Speech: four-bit samples written to `$D418` by the processor with the
  music stopped (level-1 `$EC93`, the word "RoboCop" after fire on the
  title; level-3 `$EB99`, on RoboCop's death in level three).

## The second disk image

- Same files, but LOAD1, B, C, E and F differ in content and D and E
  are swapped in name (`media.json`).
- LOAD1: from `$851A` it is 18 bytes shorter: it lacks the 10 bytes that
  point the NMI vector at a do-nothing handler and the 8-byte handler
  itself, so RESTORE is not disarmed on its title, and everything after
  sits lower.
- Its `$C400-$CD4F` holds other bytes than stage seven's tiles, while
  its level two still reads stage seven's tiles from `$C400` (table at
  `$E18B` is the same). *Live*, 17 November 2026: started on that image,
  stage seven draws a screen of rubbish (`reference/disk-b-stage7.png`);
  on the first image the same route draws the stage
  (`reference/play-stage7.png`).
- Its level files have extra and rewritten routines; they are not
  listed.

## The listing's error rate

Sample seed 2617: 60 of the 2,436 comments of the four parts, drawn by
`sample.py` and checked by one checker agent on claude-opus-5-5 that wrote
none of the listing. 12 were wrong in a detail (20 %, 95 % interval 11.8 %
to 31.8 %): a sprite frame given to the wrong enemy, two directions given
as up and down for left and right, a routine's stair branch left out, the
rub-out masks described as columns, the drum table's field order, the
extent of unread bytes, a pickup's 25 shots said to depend on the bullet
type, an effect said to play on a kill, a table entry's position, a byte's
read order, the gap between the two NMIs (about eleven lines, not five),
and a pose kept while standing. All 12 are corrected, with the same
mistakes elsewhere: the NMI gap in levels one and two, the masks and the
number of rub-out passes (nine) in every level, the bullet hit routine of
level three, the X and Y limits of level one's off-screen check, a write's
address in level one's drums, level three's pulse table order, and
level two's pickup routines, which were bytes in the listing and are now
code. The sample was over the mark; an audit of every comment is
recommended.

## Live tests

- 17 November 2026: both level-skip words, on the first image, reach
  level two's and level three's start at `$8000`.
- 17 November 2026: stages five, six and seven started by setting the
  program counter at stage five's start; all three build and play
  (`reference/`).
