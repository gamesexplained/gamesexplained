# Parachute — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. *Live*
facts were observed on the kit's machine, `kit/gnw/sm5a.js`, on 19
November 2026, with the scripts in `work/tools/` (not committed).

## Build

- MAME's ROM set `gnw_pchute`: `pr-21`, 1,856 bytes, CRC32 392b545e,
  SHA-1 e71940cd4cee07ba1e62c1c7d9e9b19410e7232d, the Sharp SM5A's mask
  ROM of Parachute (Wide Screen, PR-21), as MAME 0.289 lists it.
- The program and the data cells are listed in the kit's logical order
  (`kit/cpu/sm5a.py`): the ROM at $0000-$073F, 29 pages of 64 bytes in
  the order the program counter steps; the cells at $1000-$104C.
- Pages $09 and $0A are, all but four instructions, Octopus's (OC-22)
  and Popeye's (PP-23): the hours, the sounds. Pages $11-$13, the
  helpers' bodies, are mostly Popeye's (49, 53 and 62 of their
  instructions). The rest is its own.

## Memory layout

| Thing | Where |
|---|---|
| The screen's segment cells, four segments each, at the latch of their column | lcd_00-lcd_04 ($00-$04), lcd_08 ($08), lcd_10-lcd_14 ($10-$14), lcd_18 ($18) |
| The digits, and their extra segments | digit_1-digit_3 ($15-$17); the colon, the bell up and the left lane's fourth place in bit 0 of $05, $06, $07 |
| The shark's chain's token, the demo's boat, the tree's hold | flag_07 ($07) bits 1, 2 and 3 |
| The rotor's third place | lcd_00 bit 0 (a latch bit with no segment) |
| Paratroopers in the air, and the limit | in_air ($09), jump_limit ($19) |
| Whose turn it is, the keys changed | lane_turn ($0A) bits 0-1, bit 3; bit 2 the alarm's setting's monkey to put out |
| A point due, a minute passed, the alarm on, a miss's first step held | game_flags ($0B) |
| Seconds for the demo, the wait to go on | tick_flags ($1A) |
| Sound requests | sound_flags ($20) |
| The best scores | best_b ($25-$27), best_a ($45-$47) |
| Held-key repeat | repeat_at ($28), pad_flags ($2A) bit 0 |
| Misses due, one bit a lane | miss_due ($29) |
| The bonus due, misses off, the miss's first tone | pad_flags ($2A) bits 1, 2, 3 |
| Redraw, a miss's animation, a game key held, a new mode | redraw_flags ($2B) |
| Mode and keys | mode ($30), keys ($31) |
| The alarm's time and the time of day | $32-$35, $36-$3B |
| A count of seconds | seconds_hi, seconds_lo ($40-$41) |
| The bonus's count | bonus_blinks ($42) |
| The step's wait | delay ($49), delay_left ($4A) |

Nobody's place is a number anywhere: each paratrooper, the boat, the
swimmer, the fin and the misses are the segment bits that are lit, and
moving them is a chain of swaps through C (swap_c_bit0-3, $043B-$043E).

## The lanes

- Three lanes, each a chain (`work/tools/chains.js`, *live*):
  left 7.1.0, 7.2.0, 7.3.0, 6.0.0, 3.3.0, 2.0.0, 2.1.0 (seven places,
  left_lane $015B); middle 7.0.1, 7.1.1, 7.2.1, 7.3.1, 3.3.1, 2.0.1
  (six, middle_lane $0066); right 8.2.1, 8.1.1, 8.0.1, 0.3.0, 0.2.0
  (five, right_lane $01C3).
- One lane moves a step, in turn left, middle, right (lane_move $01C0,
  lane_turn $0A), so each moves every third step. In the clock's demo
  all three move each second (demo_end $010D, *live*: 30 lane moves in
  10 s, MRL repeated).
- The boat is at the left (2.2.1), middle (2.1.1) or right (0.3.1). A
  paratrooper arriving at his lane's last place is caught when the boat
  is under it (catch $043A); otherwise miss_due's bit for the lane is
  set and the miss starts at the next step. A press that brings the
  boat under him first still catches him (move_boat $030F, *live*:
  three late presses, three points, no miss).
- A caught paratrooper stays lit in the boat until his lane moves him
  out or clear_landed ($0131) clears the last places.

## Jumps

- jump_chance ($0112): a jump is certain when in_air is 0, none comes
  when in_air has reached jump_limit. Otherwise, in a game: none while
  the seconds' units are 8 or 9; in Game A with in_air 1 or 2 always;
  else (Game A with three or more, Game B always) when the divider's
  bits 11-14 read 0 to 4. In the clock's demo: the carry of the mode
  less 2, plus time_s10, plus seconds_lo, plus 1, past 15. *Live*: a
  prediction from the cells agreed with the chip in all 2,411 cases
  that do not read the divider; in the 1,223 that do, 401 jumped (33 %,
  against 5 in 16).
- The jumper enters his lane's first place only when it is empty
  (left_lane $015E, middle_lane $0066, right_lane $01C3).
- A new game starts with jump_limit 0 (mode_setup $05E8), so the first
  paratrooper falls alone until the first catch sets it from the score.
- sky_empty ($0688), before each drawing: with no paratrooper on any
  lane or in the tree, in_air is set to 0.

## The pace

- set_wait ($00C0), after each point: the base from the hundreds plus
  the tens, s: 1 for 0, 2 for 1, 3 for 2-5, 4 for 6-8, 5 for 9-10, 6 for
  11-12, 7 for 13-14, 8 for 15-16, 9 for 17-18; one more when the units
  are 4 to 7. That is jump_limit, 1 to 10. delay is 11 while it is 4 or
  less, then 15 minus it: 10, 9, 8, 7, 6, 5. *Live*, for every score
  from 0 to 999 in both games: Game A and Game B the same.
- A step, *live*: about 0.20 s at delay 11 and 0.14 s at delay 5 (the
  medians of a run; the sounds and drawings vary it).

## The tree (Game B and the demo)

- right_lane ($01C3): a paratrooper leaving 8.0.1 goes to the tree
  (8.1.0) instead of 0.3.0 when the game is not Game A, the tree is
  empty and in_air is even; flag_07 bit 3 holds him one step.
- Each right-lane move swaps his two swings, 8.0.0 and 8.1.0
  (right_lane_end $018E).
- tree_release ($01E1), on a step with no point and no right-lane miss
  to see to: when 8.0.1, 0.3.0 and 0.2.0 are all clear, the swing the
  rotor's blade 8.3.0 picks (8.0.0 with it lit, 8.1.0 without) drops
  into 0.3.0, so he drops only when he is in that swing.

## The water

- One chain of eleven places (miss_anim $0340): flag_07 bit 1, the
  fin's circle 1.2.1, 1.0.1, 2.3.0, 1.1.0, the shark's leap 1.3.0, then
  the swimmer's path 1.3.1, 1.1.1, 2.3.1, 1.0.0, 1.2.0, 0.0.0. The leap
  does not carry into the swimmer's path.
- A miss (left_miss $014F, middle_miss $01A2, right_miss $0180) puts
  the swimmer at the splash under his lane and the fin as far along its
  circle; the lanes stand still (redraw_flags bit 1) and the chain moves
  every step, with a tone for each move of the swimmer, until he leaves
  0.0.0 as the shark leaps: the miss is counted (count_miss $0373).
- Every ten seconds, except at the minute, timekeep puts a token at the
  chain's start ($0239): a fin circles and the shark leaps, silently,
  without stopping the lanes, in a game and in the clock (*live*).

## Misses and the bonus

- The misses shift in: 0.2.1 (the word MISS and the first head), then
  0.1.1, then 0.0.1, the third, which ends the game (count_miss $0373).
- With pad_flags bit 2 set, misses are not counted. It is set when a
  key of the R3 row is held at power on (power_on $03D3, *live* for all
  four keys) and flipped each pass R3 K4 is held (read_r3 $05AD).
- At the score's change to 200 or 500, with a miss lit, the bonus:
  about 5 s with no step, the misses blinking, a beep each count of
  bonus_blinks, then the misses go out (add_point $0093, bonus_step
  $071C; *live*: 5.05 s).

## The clock and the alarm

- The time and the alarm are as Octopus's: 12 hours with AM and PM,
  power on 12:00 AM and the alarm 12:00 PM (power_on $03C0), add_hour
  $0240 the same bytes.
- After power on, left adds an hour, right a minute, repeating four
  times a second when held; in the alarm's setting the same for the
  alarm (pad_pressed $02C0, *live*).
- Each press of Alarm turns the alarm on or off (mode_entered $0535);
  with it on, the bell (5.0.0) shows (draw_prep $0612). Holding Time in
  the clock shows the alarm's time (clock_screen $06C2, *live*).
- It rings for a minute: the monkey (3.0.1) and the bell swinging
  (bell_swing $0625), the buzzer a quarter of each second (alarm_buzz
  $0293). Time stops it ($0549, *live*).
- The keys' sum picks the mode (mode_change $0553): Time with Game B is
  Game A, Game A with Game B the alarm's setting.

## Sound

- One sound a pass (game_sounds $029D): a catch (tone code $E), then the
  step's click ($02A7, 24 writes to R1, about 100 cycles), which comes
  only when the moving lane held someone (step_click $01B1).
- A miss's swimmer: tone code 1 for his first move, $D after, $B when
  the shark takes him (miss_anim $0366, $036E). The bonus beeps with $B.
