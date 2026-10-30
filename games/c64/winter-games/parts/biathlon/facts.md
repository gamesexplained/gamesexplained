# Biathlon — verified technical facts

File `I`, `$1000`-`$9FFE`, over the menu. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`.

## The course

- 32 screens, numbered from 0 (`screens_done`, `$2C6D`): a shooting
  range on the 7th, 14th, 21st and 28th, the finish on screen 31 at X 232
  (`check_finish`, `$2C76`). The first lap has seven screens before its
  range, the others six.
- Each lap's screens run flat, down, up, flat, down, up, flat
  (`screen_types`, `$2C6F`), drawn from three packed scenes: the bridge,
  the downhill past the hut and the climb (`pictures`, `$2F6E`).

## Skiing

- A stroke is the stick in the terrain's direction after it has been let
  go: left or right on the flat and uphill, down on the downhill, both
  poles (`stroke_dirs`, `$2E50`; `wait_stroke`, `$2D99`).
- The power of a stroke builds while the skier waits: 8 a frame on the
  flat to 113, at once uphill to 255, 31 a frame downhill to 193
  (`power_steps`, `power_limits`); a stroke adds it to the speed, to at
  most 512. Drag takes 2 a frame on the flat, 12 uphill, 1 downhill
  (`terrain_drag`).
- A stroke raises the pulse by a 32nd of what it lacks of 140, twice
  uphill (`pulse_up`, `$2EC6`); it eases down 6/256 a frame to 60
  (`pulse_down`, `$70F1`).

## Shooting

- At a range: stick down opens the bolt, up loads, a fresh press of fire
  shoots (`rifle`, `$6F89`).
- The heart beats from every 50 frames at a pulse of 60 to every 15 at
  140 (`heart_table`, `$7186`); each beat throws the sight up to line 88,
  and it falls between beats faster as the pulse rises (`sight_move`,
  `$6F51`). A shot hits while the sight is at lines 113 to 117 (`shot`,
  `$6FEC`).
- Five targets a range, 20 shots in all (`draw_shots`, `$728D`).

## The score

- The clock counts six frames to a tenth (`clock_tick`, `$73AC`), so on
  a PAL machine it runs a fifth slow; it stops at 99:59.9.
- Five seconds for each miss (`score_penalty`, `$2FF5`), added to the
  skiing time; a total past 99:59 shows 99:59 (`score_total`, `$3015`).
  The time is stored turned over, so the menu ranks a shorter time higher
  (`score_record`, `$3053`).

## Sound

The six-slot engine (`start_sound`, `sound_step`): sound 0 the tune at
the end, 1 the heartbeat, 3 a stroke on a slope, 5 a shot, 6 the bolt, 7
loading. `S` with joystick 2 held down switches every sound off and on
(`snd_s_key`).
