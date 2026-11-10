# Popeye — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.
Addresses are the listing's: the ROM in the order the Sharp SM5A runs it
(`kit/skills/gnw/gnw-reference`, "The program counter"), and the data
cells at $1000 + BM × 16 + BL, written here as `$xx` for short.

## Build

- MAME's ROM set `gnw_popeye`, the program `pp-23`: 1,856 bytes, CRC32
  49987769, SHA-1 ad90659a3ce7169a4df16367c5307435d9f9d956, as MAME
  0.289's driver lists it. The unit is the Wide Screen Popeye, model
  PP-23, on a Sharp SM5A.
- Every page's step $3F holds $80, which the program counter never
  reaches. Pages $18, $19, $1A, $1B and $1C end in 6, 5, 1, 2 and 2
  bytes after their last jump that nothing runs or reads ($0639,
  $067A, $06BE, $06FD, $073D); a few pages are padded with SKIP.
- Every other byte ran on the kit's machine during the coverage run
  (`work/tools/cover.js`), except a handful of branches that cannot be
  taken (levels above 9, the bonus at x00 with no miss) and these: the
  alarm's sound requested in the alarm's setting ($028E), left and
  right pressed together in the time setting ($02CE, $02DE), a
  minute of the alarm rolling over into an hour ($0263).

## Memory layout

The 65 cells, by what the code does with them (labels in the listing).

| Thing | Where |
|---|---|
| The picture, common H1 (latches 0-5) | $08, $00, $01, $02, $03, $04 |
| The picture, common H2 (latches 0-5) | $18, $10, $11, $12, $13, $14 |
| The three digits (latches 6-8, both commons) | $15, $16, $17 |
| The digits' spare segments: colon, first miss mark, Bluto's raised fist | bit 0 of $05, $06, $07 |
| Flags | $05-$07 bits 1-3, $0A, $0B, $1A, $20, $2A, $2B |
| Items falling or waiting (in_flight), and the most allowed | $09, $19 |
| Steps of the beat (0, 1, 2: bottles, pineapples, cans) | $0A bits 0-1 |
| Items waiting at the bottom (landed) | $29 |
| A sound waiting, and the tone's counter | $21, $1B |
| Mode, and the R4 buttons last read | $30, $31 |
| The alarm's time | $32-$35 |
| The time of day | $36-$3B |
| Seconds since a button changed | $40 (high), $41 (low) |
| The bonus's blinks to come | $42 |
| Steps since Popeye was hit | $43 |
| Best scores: Game B, Game A | $25-$27, $45-$47 |
| Repeat time of a held left or right (time setting) | $28 |
| The delay before a step, and what is left of it | $49, $4A |

Cells $22-$24, $44, $48, $4B and $4C are cleared at power on and never
used otherwise, and $0C, $1C, $2C and $3C are never touched (power on's
clear starts at column 11 of rows 0-3). From the cross-reference of the
coverage run, `work/tools/xref.py`.

Which segment each bit lights, by MAME's name `o.b.h`, is in the
comments on the cells. draw_screen ($0640) shifts H1's nine latches
from $08, $00-$04 and the digits, copies them to W, then builds H2 from
$18, $10-$14 and the digits' other half.

## Timing

- There is no frame. A step of the game runs after a delay of `delay`
  ($49) passes of delay_loop ($03AA), about 210 cycles each, and the
  step, the drawing and the passes between cost about 770 more. *Live*,
  on the kit's machine on 9 November 2026: a step with no sound takes a
  median 3,087 cycles (0.19 s) at delay 11 and 1,193 (0.07 s) at delay
  2 (`work/tools/s13.js`).
- An item moves one place every third step: each step moves one lane
  (lanes, $012B).
- The clock keeps time on the 1 Hz flag (timekeep, $0200), not on the
  instructions; the game's speed does not affect it.
- Out of a game, with nothing to draw, the chip sleeps (sleep, $0030)
  until the next second or a button of the R4 row. Left and right
  cannot wake it.

## Controls

- R4 row (keys, $31): bit 0 Time, bit 1 Game B, bit 2 Game A, bit 3
  Alarm. A change is acted on when two readings agree (read_keys,
  $0505). During a game under way only left and right are read.
- Left is beta, right alpha, both read by read_pad ($03D6) and never by
  KTA. A press moves Popeye one place; holding it does nothing more,
  except after power on and in the alarm's setting, where a held press
  repeats about four times a second to set the time (read_pad, $03D6;
  in mode 8 the `ADX 9` at $03E9 carries and skips the `RTN`). Found by
  the Play tab's lockstep.
- After power on: left adds an hour, right a minute. In the alarm's
  setting: left adds an hour to the alarm, right a minute (pad_moved,
  $02C6). Holding Time in the clock shows the alarm's time
  (time_digits, $06C0). *Live*: held Time showed 12:00 PM, the alarm's
  time after power on.
- Every press of Alarm turns the alarm on or off (key_pressed, $0540).
  *Live*: two presses lit and put out the bell (3.2.1) and set and
  cleared $0B bit 2.
- R2 row, a test pad on the board (MAME's "IN.0"): K1 to K4 held stop a
  miss being counted (miss_sequence, $019A); K3 sends the unit back to
  mode 0 (test_row, $05A3); K4 rings the alarm at once; any of them
  after power on shows 888 (display_test, $06DC).

## Graphics

- The screen has 72 segments, every one used. Each object is one
  segment: Olive Oyl (body and five arm poses and the bell), the bottles'
  five places, the pineapples' six, the cans' seven, Popeye in three
  places, his two splashes, the three items' splashes, Bluto in two
  boats, his mallet in three places and his fist in three, three miss
  marks, GAME A, GAME B, AM, PM, the colon, and the three digits and the
  hours' 1.
- An object moves by passing its lit bit along a chain of cells with the
  four swap helpers ($043B-$043E): C carries each bit to the next place.

## Mechanics

- **Throwing** (throw_or_not, $00CA). Each step decides whether Olive
  throws, into the lane whose step it is. With nothing falling she always
  throws; with max_in_flight or more falling she never does. Otherwise
  in a game she does not throw while the seconds' units digit of the
  clock is 8 or 9. In Game A she then throws while fewer than 3 items
  are falling, and above that when the divider's bits 11-14 read below
  5; in Game B only on that test. No item goes into a lane whose first
  place is lit.
- **Difficulty** (set_difficulty, $0080), after every catch: the level is
  the score's hundreds digit plus its tens digit, mapped 0→1, 1→2,
  2-5→3, 6-8→4, 9-10→5, 11-12→6, 13-14→7, 15-16→8, above→9, plus one
  when the units digit is 4 to 7. max_in_flight = the level; delay = 10
  for levels up to 4, then 9, 8, 7, 6, 5 for levels 5-9, 3 for 10 and
  11. *Live*: the routine run on the kit's machine for every score from
  0 to 260 gave these values (`work/tools/s11.js`). The level falls back
  at each new hundred: 199 is level 5, 200 is level 3.
- **Catching** (catch_check, $030C), after every step and every move:
  the item waiting at the bottom of the lane in front of Popeye is
  caught. A catch scores one point (add_point, $0040) and recomputes
  the difficulty.
- **Losing an item**: an item still at the bottom two steps after it
  landed falls into the sea (after_cans $0140, pine_missed $018B,
  can_missed $01E1). The first one leaves its splash lit and counts
  nothing; the next one counts a miss and clears the splashes
  (lost_item, $0192). *Live*: with Popeye standing still, a can fell in
  the sea every 4.3 s and a miss mark was added every 8.6 s
  (`work/tools/s7.js`).
- **Bluto** (mallet_swing $014B, fist_swing $0380, bluto_ready $03C4).
  A swing starts when bit 1 of the idle count's low digit is set and
  in_flight is even. The weapon goes from up to halfway to down on
  successive beats, and back up on the next step. Popeye on that side
  when it is down, or moving there while it is down, is hit
  (popeye_hit, $0373). In Game B and the clock's demo Bluto changes
  boats at most once every ten seconds, when his weapon is up
  (bluto_switch, $0395); in Game A he stays on the left.
- **Hit**: knocked = 8. The game's steps then only count it down
  (knocked_in, $0100): at 7 Popeye becomes his splash, at 3 a miss is
  counted, at 1 he comes back on the side he fell. Left and right are
  ignored meanwhile.
- **Misses**: marks light in the order 7.0.0, 5.0.0, 5.1.0; the third
  ends the game (skip_if_over, $042D). After a game is over Popeye still
  moves, except after a game Bluto's blow ended: knocked stays at 3, as
  the game's steps stop, and Popeye stays in the sea with left and right
  ignored. *Live* (`work/tools/s17.js`). And 256 s with no button change return the unit to the clock
  (timekeep, $0200).
- **Bonus** (add_point $0040, bonus $0719): when the score reaches 200
  or 500 with a miss mark lit, the game stops, the marks blink ten
  times, twice a second, with a beep each, and are cleared, along with
  a lost item not yet counted. *Live*: from 199 with two marks, the
  blinking ran from 2.5 s to 7.8 s and the marks went out
  (`work/tools/s9.js`). At 000, after 999, there is no bonus.
- **Best scores**: kept for Game A and Game B apart and shown while the
  game's key is held (game_prep, $0680). They live in memory only: power
  on clears them.
- **The clock's demo** (clock_step $00C5, demo_watch $0340): in the
  clock a step of the game runs about once a second, with at most 3
  items falling; Popeye steps toward an item's lane as it passes a
  place, at most once a second, and is never counted out. An extra item
  is thrown only in a second whose units digit is 9 (the carry of the
  ADDC at $00D7).
- **The alarm** (minute_tick $0580, ring $05A9): checked each minute
  when on; it rings until the minute changes or a button is pressed in
  the clock.

## Data tables

There are no tables of bytes. Values are runs of LAX entered part way:
the level in set_difficulty ($0087-$009B), the delay ($00AD-$00AF), the
sound codes of queue_sound_8/9/5 ($0434-$0436). The digits' segments come
from the chip's own table (DTW).

## Sound

R1 drives the piezo (gnw-reference, "The buzzer"). The register census
of the R pins: ATR at $01A7 (select R2 for the cheat test), $0299 (the
alarm's buzz), $02AA (the click), $02B5 (the tone), $0429
(select_buttons), $05A4 (select R2 for the test row), $06D2 (select R2
after power on).

- The tone ($02AE) toggles R1 every 3 instructions, about 2.7 kHz; its
  length code A sets how many passes: from A to 15, each one longer. So
  a larger code is shorter. Codes: $E a catch, 9 an item into the sea, 8
  a miss counted, 5 Popeye knocked in, $B the bonus's beep.
- The click ($02A7), 16 writes to R1, on a step whose lane threw or
  moved an item: request_click ($0265) sets it only when A is 0, which
  the swaps and carry_count leave in just that case.
- The alarm's buzz ($0293): bursts of 16 toggles while the divider's
  bits 11-14 read below 4, a quarter of each second.
- No sound out of a game but the alarm's (game_sounds, $029D).

Census of the other pins and timers: KTA at $0001 (wake), $01A9 (test
row, a miss), $050D (R4 row), $05A6 (test row), $06D9 (test row after
power on). TA and TB (right, left) in pad_moved, move_popeye and
read_pad. TG at $0200 and $055D. DTA at $0293, $03EB, $03FA and $0489.
CEND once, at $0033. IDIV once, at $055B. ATBP once, at $066F. WR, WS,
DTW, TW and COMCN only in draw_screen and its helpers; PDTW never; the
two PTW are the unrun bytes at $073D.

## The listing's error rate

Sample 1, seed 20261109: 60 of the listing's 219 comments, drawn with
`sample.py` before any was changed, checked by one checker on
claude-fable-5-1 that wrote none of them. 8 were wrong in a detail, none
in the main claim: 13.3 %, 95 % interval 6.9 % to 24.2 %, a lower bound
on the true rate. What was wrong: two named where a pass or a step ends
(pass_pad, keep_time_pass) more narrowly than the code; request_click
was said to ask for the click every step, while it does only when A is
0, that is when the lane moved or threw an item (the same belief was in
five other comments and this file, all corrected); delay_loop's count
was 180 instructions, not 191; read_divider's list of uses missed the
bonus; the helpers' header said an inside TRS stays on its page, where
it jumps within pages $10-$13; one helper's steps were in the wrong
order; ring was said to set Olive's pose, where it sets her body,
already lit. All 8 were corrected. The checker also found that every
TRS inside a subroutine was listed with a page $10 entry as its target;
the kit's disassembler now resolves those on page $10, and the others
carry a comment with the real target. The listing is over the mark (at
most 2 of 60): an audit is recommended (`TODO.md`).

## Live tests

All on the kit's machine (`kit/gnw/sm5a.js`), from power on, scripts in
`work/tools/`:

- `cover.js`: every phase of the unit (clock, time setting, alarm,
  Game A and B played at random and by a player that follows the lowest
  item, the test row, the bonus at 200 and 500, the alarm ringing, game
  over and five minutes idle) for the coverage and cross-reference.
- `s7.js`, `s8.js`: lost items and the miss count.
- `s9.js`: the bonus.
- `s6.js`: Time held, Alarm pressed, the alarm's setting.
- `s10.js`: a held left after power on repeats.
- `s11.js`, `s13.js`, `s14.js`: the difficulty table and the step's
  timing.
