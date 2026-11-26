# Fire — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`. *Live*
facts were observed on the kit's machine, `kit/gnw/sm5a.js`, on 25
November 2026, with the scripts in `work/tools/` (not committed).

## Build

- MAME's ROM set `gnw_fire`: `fr-27`, 1,856 bytes, CRC32 f4c53ef0,
  SHA-1 6b57120a0f9d2fd4dcd65ad57a5f32def71d905f, the Sharp SM5A's mask
  ROM of the Wide Screen Fire (FR-27), as MAME 0.289 lists it.
- The program and the data cells are listed in the kit's logical order
  (`kit/cpu/sm5a.py`): the ROM at $0000-$073F, 29 pages of 64 bytes in
  the order the program counter steps; the cells at $1000-$104C.
- Page $09 is, all but a few instructions, Parachute's (PR-21), Octopus's
  and Popeye's: the hours and minutes. Pages $11 and $12, the helpers'
  bodies, share 45 and 50 of their 64 bytes with Parachute's. The main
  loop on page $00 has Parachute's shape with different targets. The
  rest is its own.

## Memory layout

| Thing | Where |
|---|---|
| The screen's segment cells, four segments each, at the latch of their column | lcd_00-lcd_04 ($00-$04), lcd_08 ($08), lcd_10-lcd_14 ($10-$14), lcd_18 ($18) |
| The digits, and their extra segments | score_hi-score_lo ($15-$17); the colon and two places of the third arc in bit 0 of $05, $06, $07 |
| Latch bits with no segment | lcd_03 bit 0 and lcd_18 bits 0 and 3 (not used); lcd_08 bit 2 (not used); lcd_08 bit 3, hold_08 |
| How many are on the path; the limit; the wait | in_air ($09), jump_limit ($19), delay ($49) and delay_left ($4A) |
| The step's turn, the alarm ringing, a key change seen | turn_flags ($0A) bits 0-1, 2, 3 |
| Someone due above a net | due_flags ($29) bits 0-2: left, middle, right |
| A miss being shown; a hold for beeps and the bonus | miss_time ($43); hold_count ($2A) |
| The best scores | best_a ($45-$47) for Game A, best_b ($25-$27) for Game B |
| The time, the alarm, the seconds | $36-$39, $32-$35 (hours' tens with the PM bit 3, hours, minutes' tens, minutes); secs_hi, secs_lo ($3A, $3B) |
| The seconds' count since a key or a miss | count_hi, count_lo ($40, $41) |
| The mode | mode ($30): 0 after power on, 1 the clock, 2 Game B, 4 Game A, 8 the alarm's setting |

## The path

- One chain of places from the window to the ambulance, in four parts
  that move separately, each by swaps of C along its cells from its last
  place back (`swap0`-`swap3`, $043B-$043E): the first arc, window
  3.3.1, 3.3.0, 2.0.0, 2.1.0, to 2.2.0 above the left net (window_arc,
  $0158); the middle arc, 2.1.1, 3.2.0, 3.1.0, 4.3.0, 4.2.0, 4.1.0,
  1.0.0, to 1.1.0 above the middle net (arc2_move, $01C3); the third
  arc, 1.2.0, 4.0.0, 6.0.0, 7.0.0, 0.1.0, to 1.3.0 above the right net
  (arc3_move, $0100); and 0.1.1, 8.0.1, 0.2.1 to the ambulance
  (arc4_move, $0180). *Live*: a person walks the places in that order.
- The firemen stand at one of three places (2.2.1, 1.1.1, 1.3.1); left
  and right move them one place (firemen_left $034F, firemen_right
  $0364).
- One part moves each step, in the turns 0, 2, 1 (turn_dispatch,
  $036D): the middle arc; the window, the first arc and the way to the
  ambulance; the third arc. *Live*: turn_flags reads 2, 1, 0 after
  successive steps.
- A person who arrives above a net sets that net's due flag. Every
  press of left or right and every step ends at catch_check ($0300),
  which takes the flag where the firemen stand: a catch, a point and
  the catch's tone. The person stays above the net until the arc's next
  turn carries him on. A flag still set when the arc's turn comes again
  is a miss (turn_0_2 $0140, turn_dispatch). So a press that arrives
  after the person but before the next turn of that arc still catches.
- Game B's lower window (lit in the clock's demo too, never in Game A): at the middle arc's turn, when 2.0.1 and the
  first arc's lower places are empty, the jump's chance puts a jumper
  at 2.0.1 (arc2_move, $01C3); at the third arc's turn he drops into
  2.1.0 when the first arc's lower places are empty and the seconds'
  units have bit 3 set or in_air is odd (lower_drop, $0117).

## Jumps

- jump_chance ($00C0), each step before the turn's move: with no one
  on the path, always; with in_air at jump_limit or more, never;
  otherwise in a game never while the seconds end in 4 to 7 (secs_lo
  bit 2), always while twice in_air is under jump_limit, and else four
  chances in sixteen from the divider's bits 11-14.
- A jump at the window needs the window's place (3.3.1) empty
  (window_arc).
- jump_limit is the score's tens plus one, at most 4; it is 0 when a
  game starts, so the first jumper is alone, and 3 in the clock
  (jump_limit $0088, mode_setup $05C0).
- in_air is set to 0 whenever no place of the path is lit (path_check,
  $0689), and goes down one at each odd hundred (new_hundred, $005A).
  *Live*: at 300 points in_air went from 1 to 0.

## The pace

- delay is 11 while the hundreds plus jump_limit are under 4, 14 less
  that sum from 4 to 9, and 4 from 10 (jump_limit, $0088). *Live*: one
  step every 3,364 cycles (0.205 s) at delay 11, 2,767 (0.169 s) at 8,
  2,025 (0.124 s) at 4, on average over 20 s. A person moves every third
  step: every 0.6 s at the start, 0.37 s at the fastest.

## Points, misses and the bonus

- A point for each catch (add_point, $0040), in decimal, past 999 to
  000 ($004F). *Live*: the player's first catch at the left net scored
  1; the score reached 999 in a played Game A.
- With an R3 key K3 or K4 down (no pads on the board), a catch scores
  nothing and each person who reaches the ambulance scores 2 (catch_check,
  arc4_move, add_point). *Live*: 2, 4, 6, 8 at four arrivals.
- A miss: the person above the net goes out and a hurt figure lies on
  the ground below (2.3.1, 1.0.1, 1.2.1); miss_time 9 holds the game
  nine steps (miss_timer, $00DD), with the miss's sound at 7, the angel
  at 6 (count_miss, $0197) and the figure gone at 2. The angels light
  8.1.1, 8.3.1, 8.2.1; the third ends the game, with five beeps
  (game_over_beeps, $01A7). *Live*.
- R2 K1, MAME's "Infinite Lives" pad, held when a miss is counted: no
  angel, one beep. *Live*: no angel in 60 s of unplayed Game A with it
  held.
- At 200 and 500 points with an angel shown: hold_count 10 (new_hundred,
  $005A); no step runs, the angels blink, and they are cleared at the
  end (bonus_hold, $071C; draw, $0667). *Live*: about 5.9 s from 199
  with an angel.
- The best of each game is kept until power is lost and shown while its
  game key is held (best_check $006A, draw_prep $0617).

## The clock and the alarm

- Power on and ACL clear every cell, light every segment (mode 0) and
  set the time to 12:00 AM and the alarm to 12:00 PM (power_setup,
  $0526). Left adds an hour, right a minute, held repeating every quarter
  second, in the alarm's setting too (pad_pressed $02C7, read_pad $03D6). *Live*: 16 presses in 4 s.
- The keys' sum gives the mode (mode_change, $0540): 1 the clock, 2 or
  3 Game B, 4 to 6 Game A, 7 or more the alarm's setting; Alarm drops
  the others. A change counts when two readings in a row agree
  (read_keys, $0500).
- In the clock the demo moves every part of the path once a second, and
  its firemen move toward the arc that is moving (demo_step $031E,
  demo_firemen $0340).
- 256 seconds after a game is over the unit goes back to the clock
  (timekeep, $0200).
- The alarm: on and off with each press that gives the alarm's setting; the bell
  (8.2.0) shows it is on; at its minute the ambulance man rings his
  bell and the buzzer sounds (alarm_minute $0580, draw_prep $0603,
  play_sounds $0280). R2 K4 rings it at once; R2 K3 puts the unit back
  to setting the time (test_pads, $059D).
- With an R3 key down after power on the screen shows 888 (clock_screen,
  $06DA).

## The listing's error rate

A sample of 60 of the listing's 196 comments, drawn with seed 20261126
and checked by claude-fable-5-2 on 26 November 2026, found 9 wrong (15
%, 95 % interval 8.1 % to 26.1 %): c_not_game_b's sense, the two best
scores swapped, the lower window lit in the clock's demo too, the
alarm's minutes carrying into its hours, the repeat of a held button
(every quarter second, in the alarm's setting too), b_05's page, and the
alarm's flip on every press that gives its setting. All 9 are corrected,
with the same mistakes elsewhere (the divider's top bits count sixteen a
second, not eight, and the click is a short burst). 9 of 60 is over the
mark, so an audit of every comment is recommended.

## Sound

- One pin, R1, moved by ATR (play_sounds, $0280; play_tone, $02B0): the
  catch's tone (length code $E), the step's click (a short burst, A taking turns
  with the falling BL), numbered sounds (sound_21), the miss's and the game over's beeps
  (tone_beep, $00A6), and the alarm's buzz.
