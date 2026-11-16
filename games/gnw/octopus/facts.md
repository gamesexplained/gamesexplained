# Octopus — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. *Live*
facts were observed on the kit's machine, `kit/gnw/sm5a.js`, on 11 and
12 November 2026, with the scripts in `work/tools/` (not committed).

## Build

- MAME's ROM set `gnw_octopus`: `oc-22`, 1,856 bytes, CRC32 bd27781d,
  SHA-1 07b4feb9265c83b159f96c7e8ee1c61a2cc17dc5, the Sharp SM5A's mask
  ROM of Octopus (Wide Screen, OC-22), as MAME 0.289 lists it. The same
  ROM is MAME's `taynyoke`, the Elektronika clone.
- The program and the data cells are listed in the kit's logical order
  (`kit/cpu/sm5a.py`): the ROM at $0000-$073F, 29 pages of 64 bytes in
  the order the program counter steps; the cells at $1000-$104C.
- Pages $09, $0A and most of $11 are byte for byte Popeye's (PP-23):
  the hours and minutes, the sounds and the helpers' bodies. The rest is
  its own.

## Memory layout

| Thing | Where |
|---|---|
| The screen's segment cells, four segments each, at the latch of their column | lcd_00-lcd_04 ($00-$04), lcd_08 ($08), lcd_10-lcd_14 ($10-$14), lcd_18 ($18) |
| The digits, and their extra segments | digit_1-digit_3 ($15-$17); colon, octopus's body and bolts in bit 0 of $05, $06, $07 |
| The game over flag, grab_step's token | flag_07 ($07) bits 3, 2 and 1 |
| A take of treasure under way | lcd_08 bit 0 (a latch bit with no segment) |
| The tentacles' directions and turn | tentacle_dirs ($09), tentacle_flags ($19) bits 2-3 |
| Events: a point due, a minute passed, the alarm on, keys changed | events ($0B) |
| Seconds for the demo, the wait to go on | tick_flags ($1A) |
| Sound requests | sound_flags ($20), tentacle_flags bit 1 (the caught sound) |
| The best scores | best_b ($25-$27), best_a ($45-$47) |
| Held-key repeat | repeat_at ($28), pad_flags ($2A) |
| Points still to count in | points_left ($29) |
| Redraw, carrying, a game key held, a new mode | redraw_flags ($2B) |
| Mode and keys | mode ($30), keys ($31) |
| The alarm's time and the time of day | $32-$35, $36-$3B |
| Seconds since the boat's last event | boat_timer ($40-$41) |
| The bonus's count, a caught diver's count | bonus_blinks ($42), caught ($43) |
| The step's wait | delay ($49), delay_left ($4A) |

The diver's place is not a number anywhere: it is which of six segment
bits is lit (5.3.1, 4.1.0, 3.2.0, 2.0.1, 1.0.1, 1.3.1), and moving him
is a chain of swaps through C (move_on $0300, move_back_chain $0340).
The tentacles are kept the same way: each segment is its own bit.

## Timing

- A step of a game, *live*: about 1,114 + 200 × delay cycles of 61
  microseconds, the diver in the boat: 0.215 s at delay 12 (4.7 steps a
  second), 0.190 s at 10, 0.117 s at 4, 0.092 s at 2 (10.8 a second).
- delay (set_wait $00C0) by the score's hundreds plus tens, s: 10 when
  s = 0, 9 for 1, 8 for 2-3, 7 for 4-5, 6 for 6-8, 5 for 9-10, 4 for
  11-12, 3 for 13-14, 2 for 15 or more; in Game B 8 for s of 0 to 3 (so 8 instead of 10 and 9 at s = 0 and 1);
  then 2 more unless a take of treasure is under way. *Live*, the value
  set_wait stores for each score in tens from 0 to 990, both games.
- So Game A starts at 12 and Game B at 10, the two differ only at 0-19
  and 100-109 points, the game slows again at each hundred (190 points is delay 7,
  200 is 10), and the tentacles step faster while the diver takes
  treasure.
- The tentacles move one segment a step, in turn: each tentacle once
  every four steps.
- The clock's demo steps once a second.
- A press of left or right during the wait is acted on at once; the wait
  then goes on where it was (tick_flags bit 3). *Live*: 20 presses in 4
  s gave 16 steps against 19 with none, since each press's pass adds its
  time.

## Controls

- Right (alpha) moves the diver a place toward the chest, left (beta)
  toward the boat, one place a press (read_pad $0380, pad_pressed
  $02C2). Both together count as neither (*live*: held 3 s, the diver
  stayed in the boat).
- Right at the chest starts a take of treasure (take_start $0317);
  presses while a take runs are ignored.
- The diver cannot climb back into the boat without treasure
  (move_back_chain, $0359).
- Left and right are not read during a caught diver's count, nor while
  the boat counts in treasure (read_pad).
- A held left or right repeats four times a second only when the time is
  set after power on, in the alarm's setting, and in a game while a key
  of the R2 test row is held (*live*: right held 2 s took the diver to
  the chest with the pad held, one place without it).
- Game A and Game B choose their game; it starts when the key is let go
  (keys_released $0569). Game keys are not read in a game under way.
  Time shows the clock, and held in the clock shows the alarm's time.
  Each press of Alarm turns the alarm on or off and shows its time
  (keys_mode $0540). Time, Game A and Game B pressed together give the
  alarm's setting, by the ladder's sums.
- R2 test pad (MAME's "Invincibility"): any key of the row skips the
  catch check (catch_check $01C0). R3 test row (MAME's "alarm test?"):
  K4 rings the alarm, K3 returns to mode 0 with the seconds at 00
  (test_row_r3 $059E). *Live*.

## Graphics

- 70 of the 72 latch bits have a segment in MAME's SVG; 0.0.0 and 0.2.1
  have none, and the program keeps flags in them (lcd_08 bit 0, lcd_18
  bit 2).
- The diver's six places and the five places of his bag; the arms at the
  chest in three poses (0.0.1 standing, 0.1.1 reaching in, 1.2.1
  lifting); the caught diver (2.1.0) with his limbs in two poses (2.2.1,
  2.3.1); the boat's diver with hand and bag (5.3.1, 5.1.1, 5.2.1) and
  two spares (5.2.0, 5.1.0).
- The tentacles: T1, the forked one, base 4.0.1, upper branch 4.2.1,
  4.1.1 (to the rope), lower branch 4.3.1, 3.0.1, 3.2.1 (to the second
  place); T2 4.0.0, 4.3.0, 3.0.0, 3.3.0, 2.0.0 (to the third); T3 2.2.0,
  2.3.0, 1.0.0, 1.1.0 (to the fourth); T4 1.3.0, 0.2.0, 0.1.0 (to the
  chest).
- The octopus's body (7.0.0) is lit in every mode after power on. The
  alarm's note (0.3.0) shows it is on; when it rings, the octopus in
  the corner (0.3.1) lights and the bolts (8.0.0) flash with the note:
  the first 3/16 of each second, or in a game under way the second
  half of each second.
- draw_screen ($0640) draws every cell on each redraw: two passes of
  nine latches, one per common.

## Mechanics

- Each step (step $0050): a take of treasure moves on (grab_step
  $005A), the boat counts a point in (deliver_step $0367), the diver may
  leave the boat (boat_leave $03EB), one tentacle moves (tentacle_turn
  $0100), the catch is checked (catch_check $01C0), a point is added
  (add_point $0085) and the next wait set (set_wait $00C0). On the step
  a treasure is lifted and on the three steps the boat counts, the
  tentacle's turn is skipped (*live*).
- A tentacle grows a segment a turn to its tip, then shrinks a segment
  a turn. In Game A it shrinks all the way and starts again; in Game B
  and the demo a coin from the seconds can leave its base out so it
  comes back at once: time_s1 bit 0 for T1, bit 2 for T2, bit 1 for T3,
  bit 3 for T4 (the bit's sense differs: T4's base stays when it is
  set, the others' when it is clear).
- An empty tentacle starts at once except while the seconds' units are
  8 or 9 (time_s1 bit 3), in every mode.
- T1's branch is chosen when it starts from its base: the lower one
  when the tens of seconds are odd, the upper one when even (t1_start
  $0180).
- The catch (catch_check $01C0): the diver under the tip that reaches
  his place, after the tentacle's turn. Only five tips catch: T1's two,
  T2's, T3's and T4's, one for each place in the water; the boat is
  safe.
- A take of treasure lasts four steps; the point comes on the third,
  when the bag at the chest lights (grab_step).
- Bringing treasure back: 3 points, counted in one a step (points_left),
  each with the point's sound.
- After 8 seconds in the boat (boat_timer) the diver goes down the rope
  himself, unless T1's upper branch is out (boat_leave $03EB).
- A caught diver: 9 steps (caught_step $00E9, caught_show $0700): the
  first spare climbs into the boat at the third, the second moves along
  at the sixth, and with no diver left the game is over.
- The bonus at 200 and 500 (add_point $0085), only when a diver has been
  lost (lcd_04 bit 1 clear): the spares blink for about 5 seconds, ten
  half seconds with a beep each, while the game waits, and both come
  back (bonus_step $06DC). *Live*: 199 and 499 to 200 and 500 with the
  spares gone; 999 goes on to 000 with no bonus.
- The best score of each game is updated on every point that beats it
  (add_point, $00A1) and shown while the game's key is held
  (game_screen $062E). *Live*.
- 256 seconds after a game is over the unit goes back to the clock
  (timekeep $0200).
- After a game is over the caught diver keeps struggling, his poses
  swapped by the seconds (over_pose $05F4), and the alarm can still
  sound (play_sounds).

## Data tables

There are none beyond the program: the speeds are a run of LAX jumped
into by a ladder of tests (set_wait $00C0).

## Sound

- One pin, R1, toggled by the program (gnw-reference, "The buzzer").
- The step's click, every step of a game (click $02A7). A point's tone
  (length code $E), the caught diver's sound (code 0, the longest), a
  buzz each step of his count (code $C), the bonus's beep (code $B): all
  one routine, tone $02AE. The alarm: R1 buzzed for a quarter of each
  second (alarm_buzz $0293).
- Out of a game only the alarm sounds. A pass that buzzes the alarm
  plays no other sound, since sound_done clears every request.
- The click writes R1 24 times, about 100 cycles (98 *live*).

## The listing's error rate

- Sample of 12 November 2026, seed 20261112: 60 of the listing's 243
  comments, drawn by `sample.py` and checked by a fresh agent on
  claude-fable-5-2 that wrote none of them. 5 were wrong in a detail and
  none in their main claim: 8.3 %, with a 95 % interval of 3.6 % to
  18.1 % (Wilson). The checker can miss errors, so the true rate may be
  higher; at least 5 of the 243, 2.1 %, are known wrong. What was wrong:
  set_wait gave the two extra passes to the diver at the chest instead
  of a take under way, and Game A and B's speeds as the same from 40
  points (they differ at 0-19 and 100-109); play_sounds said the other
  sounds follow the alarm's on the same pass and left out the alarm's
  setting; click said 16 writes and 64 cycles (24 and about 100);
  draw_prep said the alarm's bolts never flash in a game (they flash in
  the second half of each second); caught_show named the wrong segments
  cleared and lit. All five were corrected, with the same beliefs in
  `facts.md` and `features.md`. The sample is over the kit's mark of 2
  in 60, and an audit of every comment is recommended (`TODO.md`).

## Live tests

- The rules, played on the model by a computer player that looks a few
  steps ahead on copies of the machine (`work/tools/auto.js`): about
  500 points in Game A before the third miss.
- The speed table: `work/tools/s15.js`; the step's period:
  `work/tools/s25.js`; the bonus: `s13.js`, `s17.js`, `s22.js`; the
  catch: `probe.js`; both buttons and the repeat: `s24.js`.
