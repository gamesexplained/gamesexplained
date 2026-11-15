# Friday the 13th — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`. Unless marked *live*, a fact comes from
reading the code in the snapshots named in `orientation.md`.

## Build

A G64 disk image. A one-line BASIC loader loads TITLE, the introduction (part `intro`, entered at
intro `$2900`). The introduction loads TITLE2 from device 8 and jumps to it at `$0900`; TITLE2
loads the game's files and hands over to the main program at game `$9200` (part `game`). One
sector on the disk has a bad checksum, and the game boots and plays from the image (*live*).

## The cartridge conversion

A cartridge image of the game (`Friday the 13th.crt`, 81,920 bytes of ROM: ten 8 KB banks of
type 19, Magic Desk, named FRIDAY THE 13TH, with the text "STATMAT 2025" in bank 0) was compared
with this disk on 10 November 2026. Banks 0 to 7 hold the game part's 64 KB at their own
addresses, behind a starter in the first 1 KB of bank 0. Every byte of the game part's code and
data (`$0400`-`$0771`, `$0C00`-`$3F9F`, `$5800`-`$CA70` and `$E000`-`$FE5F`) is the same as the
disk's, except 35 runs that the game writes while it plays: the panel's characters at
`$58AB`-`$5ACD`, `cell_source` (`$A85A`), `backdrop_colours` (`$AA5A`), `walker_is_actor`
(`$AEB4`) and `work_byte` (`$BBAD`). Banks 8 and 9 hold the title bitmap and its screen colours,
the same bytes as the introduction's. The cartridge has no copy of the introduction's code, its
licence and story texts, or the portraits picture.

## How the parts follow one another

| Step | Part | What happens |
|---|---|---|
| 1 | intro | `intro_start` (intro `$2900`) moves the portraits picture from intro `$5F40` to `$8800`, shows the title bitmap, plays the scream, then the licence, the story and the portraits, waiting for a key on each of the last three |
| 2 | intro | `load_title2` (intro `$2DA8`) loads TITLE2 with SETLFS 8,8,8 and LOAD, and the intro jumps to `$0900` |
| 3 | game | TITLE2 loads RM (game `$0400`), the data files at game `$0C00` and `$E000`, and the main program; the game starts at `game_start` (game `$9200`) |

## What the parts share

- The scream: the routine at `$3600` and the sample at `$36A0` to `$3F9F` are the same bytes in
  both parts (intro `play_scream`, game `play_scream`).
- Video bank 1 (`$4000`-`$7FFF`) in both, with different layouts: the intro's screen is at
  `$7C00` with its font at `$6000`, the game's screen at `$5400` with its bitmap at `$4000` and
  its panel characters at `$5800`.

## The listing's error rate

Sample seed 1310: 60 comments drawn from the 558 of both parts' listings, read against the code by
a fresh checker on claude-opus-5-5. 14 were wrong in a detail, none wholly wrong: 14 of 60, 23.3 %,
95 % interval 14.4 % to 35.4 % (Wilson). All 14 were in the game part: the processor port's bit
order for banking the KERNAL out (`$0001`), the joystick's right (`$0826`), the values of
`sprite_bit` (`$08C2`), a work byte's uses (`$09EA`), the safe-room flag, which stays set after the
player leaves (`$09ED`), the last cell the tiles name (`$2D00`), the end of the panel letters
(`$3260`), two sprite ranges (`$7340`, `$7B40`), the round bonus, 100 points a survivor and not 10
(`$925E`), when the fear value is doubled (`$9419`), the screen range `clear_play_area` clears
(`$A8C8`), the bytes `strength_slice` reads (`$C492`), and tune command 0, which takes no byte
(`$C7A4`). All 14 were corrected. The run corrected five more comments it found wrong while
building the pages, outside the sample: the units of passes in the danger clock and the counters
beside it, the doorway covers once described as an outdoor fence (`$C21A` and the routines and
patterns it uses), `$08BC` as sprite priority, Jason's hunt and victim choice (`$B7B4`, `$A24C`),
`place_tune`'s condition (`$CA51`), `send_to_shelter` (`$BE18`), and the score's digit order
(`$08DC`). The listing has not had a full audit.

## Live tests

All in VICE 3.14 from the snapshots in `orientation.md`, part `game` unless named:

- `danger_clock` (`$0821`) poked to `$BE` in play: the time-out screen came 13.1 s later.
- `fear` (`$0938`) poked to 75: the panel showed head 7.
- `pass_count` (`$08D5`) counted 336 times in 1,504 frames of play, 4.48 frames a count, so the
  danger clock's 96 steps of 128 counts take about 18 minutes.
- Friend 6 dead, Jason as friend 5, friend 6 given the highest exposure, `danger_clock` `$B0` and
  `pass_count` `$FF`: at the next count Jason revealed himself and chose friend 6, whose state went
  from 0 to `$88`, then `$80` as the blow landed.
- The safe room in room 25, the player in room 38, and friend 0 moved onto the player's sprite:
  with `safe_room_seen` (`$09ED`) 0 the friend kept wandering (state 4); with it set to 1, as a
  visit to the safe room leaves it, the touch sent the friend to shelter (state 5, target `$48`,
  shelter time 32, which is 90 minus exposure 58).
- Jason stuck at the fence: the memory `$0800`-`$0A3F` of a round run on the kit's 6502 (block
  `friday-camp`, seed 2) at count 2306, and again at count 2280 as Jason came up from room 15, poked
  into the game in play. The game held Jason at place `$1A` (room 11), x `$1C`, y `$4D`, state 7,
  while the clock ran; `reference/jason-stuck.png` is VICE's screen with the player moved into room 11
  and the room redrawn (`draw_room` `$A2A2`, then `main_loop` `$9BE2`).

Run on the kit's 6502 over the listing's memory (no emulator):

- `round_won`'s bonus (`$9266`-`$928C`): 0 survivors add 2,560 points, 1 adds 100, 9 add 900.
- `draw_room` for room 39 against the emulator's screenshot: 292 of 32,768 play-area pixels differ,
  all where the two sprites stand.
- `play_scream`: 18,419 volume and voice writes, gaps of 104 to 125 cycles between volume writes,
  mean 106.9; `test_scream.js` holds the page's port to it.
- The music: `test_music.js` holds the page's driver to the game's code for 3,000 frames of each
  tune; tunes 1 to 6 end after 1,117, 1,924, 1,120, 1,642, 1,270 and 1,290 frames.
- Whole rounds with the player standing still in room 38 (`gameplay.html`, block `friday-camp`;
  `test_camp.js`): of 40 rounds with seeds 1 to 40, 25 ended with the player dead and 15 ran out of
  time, after 12,184 counts (96 steps of 128, less the 104 that `start_play` leaves on `pass_count`).
  In 13 of the 40, Jason stood in room 11 at x 28, y 77 for the rest of the round, his victim in the
  church (friend 7 or 8, or the player); in one, he stood in room 38 at x 148, y 39. Each death plays
  the scream, wherever it happens.
- Jason's stuck pass, traced: a step right to x 32; `$ADE0` moves him back 4 to x 28 and, his turn
  (`actor_turn`, `$0965`) being 0, keeps it and sets the step to 1, -1 (`$AE08`, `$AE32`); the
  retried place leaves him at y 77. Turn and step never change.
- Frame by frame, the game's loop given 13,300 cycles a frame counts at 4.53 frames a count
  (`test_camp.js`), against the 4.48 measured in play.
- The jumpscare, frame by frame from room 13 into room 14 with friend 2 dead there: the scream at
  frame 86; colour RAM of the play area all 9 for the head and all 1 for the skulls; fear 5 to 13
  (Gerry's fear value is 4); `scare_seen` set; after the scream, the play area's bitmap and screen
  equal room 14 as `levels.html` draws it.
- `scare_check` (`$C8E9`) sets `scare_seen` before it rolls, so each body is rolled for once; with
  more than one body in the room it looks only at the highest-numbered.

## Checks behind the pages

How the pages' widgets, pictures and sounds were checked against the game, and which emulator showed what the pages describe. The pages themselves say only what the reader is looking at.

### discoveries.html

- In the emulator, with friend 6 dead, Jason as friend 5, and friend 6 given the highest exposure, the next try revealed Jason and friend 6's state at `actor_state` went through the three steps below.
- Friend 6's state at `actor_state`, read in the emulator at each step.

### gameplay.html

- Times assume the 4.48 frames between counts measured in the emulator during play, and no blows on friends.
- The jumpscare and the camp from above run the game's own loop on the kit's 6502 with the interrupt left out: no music and no joystick reading. The jumpscare holds the stick right, as the interrupt's `read_stick` would, and forces the roll to 40 or more; `show_gore`'s roll picks the head or the skulls as the page chooses, each half the time. The sound chip's noise comes from a seeded generator. Sprites touching (`$D01E`) is worked out from the sprites placed in the player's room; the room's picture never touches (`$D01F` reads 0). CHROUT and PLOT are stood in for by the page, as much as the game uses.
- The camp's times: 4.48 frames a count, and 2 seconds for each scream.

### graphics.html

- The walk frames: `walk_frame_offset` (`$AEDF`) is 0 for left and 5 for right (`$B181`-`$B18D`, from the step's sign), and `walk_frames` (`$A677`) is read only for walks up and down, added to the set's first block plus `$0B`, plus 3 more going down (`$B2F9`-`$B30B`; the player's at `$9F5E`).

### levels.html

- Room 39, beside the emulator's screenshot of the same room. Of the play area's 32,768 pixels, 292 differ, all of them in the two places where people stand: people are sprites, which `draw_room` does not draw.

### music.html

- `test_music.js` runs each tune for 3,000 frames and checks every write to the sound chip against the same code run directly.
- The player calls a port of `play_scream` once for each bit, every 107 cycles, the average gap between the game's own volume writes when its loop is run on the kit's processor; the gaps run from 104 to 125 cycles.
- `test_scream.js` checks every write against the game's routine.
