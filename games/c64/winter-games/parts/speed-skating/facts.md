# Speed Skating — verified technical facts

File `S`, `$4C00`-`$ADC8`, over the menu, which it leaves in place below
`$4C00`; its sound engine's variables run on to `$AEF2`. Every address
here is this part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`.

## The screen

- Two lanes, each seen twice, near and far, by a raster interrupt seven
  times a frame through the vector at `$FFFE` (`ss_irq`, `$960A`); each
  lane's snow bank scrolls a pixel at a time (`lane_step`, `$9BC4`).
- The course is one row of 1,024 characters (`course_row`, `$8000`): START
  at column 50, signs counting 25 to 225 every 75 columns, and FINISH at
  column 800, where 250 would be.

## The race

- The game waits for a fire button on either port, which also decides
  the ports: the button on port 2 puts the top skater on port 1 and the
  bottom one on port 2 (`port_swap`, `$20`); then READY, SET and GO, 61
  frames apart (`ready_set_go`, `$A18C`) (*live*).
- A stride's state moves on about every 5.3 frames (`stride_step`,
  `$9F5E`), by the stick: right from the left glide starts the right
  stroke, left from the right glide the left one (`stride_right`,
  `stride_left`); letting go mid-push drops back to the glide
  (`stride_none`).
- Speed is gained only in a stroke's first two states, 48/256 of a pixel
  a frame from a push's seventh frame on (`push_step`, `$A04C`), and
  friction takes some off every frame.
- Each skater's finish is 6,045 pixels from its start (`finish_x`,
  `$9D18`). The clock counts a tenth every six frames (`irq_top`,
  `$964B`); a time of three minutes is a FAULT (`show_time`, `$9D1C`).

## The pacer

With one player the computer skates the top lane (`pacer_on`, `$49`).
Each time a stride's state moves on it compares a random byte with its skill: below it, it takes
the right stick for the state (`pacer_right`, `$A249`), otherwise one that
holds the stroke at full stretch (`pacer_late`). Its skill starts at 104
(`ss_race`, `$946C`), rises by one each time while the player leads or is
level, to 255, and falls while it leads, by two above 160, to 56
(`pacer_adjust`, `$A289`).

## Sound

An older form of the events' sound engine, three slots and no `S` key,
entered at `$A600` (stop every sound), `$A603` (start one) and `$A606`
(a frame): sound 0 the music while the game waits, 9 the beeps at READY
and SET, 10 a button at the start, 11 the gun at GO.
`old_tune_1` (`$8C00`) and its partners are tunes in a format no code in
the file reads.
