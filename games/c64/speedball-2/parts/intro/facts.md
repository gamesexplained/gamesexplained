# The intro — verified technical facts

The first load, `PART0`: the title, two pictures, the turning disc, the
scrolling story and credits, and the tune, until fire loads the game.
Every address here is the intro's. Unless marked *live*, a fact comes
from the code in `work/entry.vsf` (stopped at $C800). Live tests are
listed in the game's own `facts.md`.

## Start-up

- `intro_start` ($C800): interrupts off, the stack reset, $01 = $35 (I/O
  in, both ROMs out), video bank 3, the NMI vector at `nmi_return`
  ($1E67) and the IRQ at a bare acknowledge, every SID register written
  $FF and then 0, the volume 15; then `intro_main` ($184A). The screen at
  $C800 later covers these bytes.
- `intro_main` ($184A) sets up six objects and the raster list, then runs
  queued jobs (`job_run`, $1D37) until `go_flag` ($20) is set, and then
  loads the game (`load_game`, $200C).

## Objects, jobs and the raster list

- The intro is built of objects, each with a message handler and a frame
  routine (tables at $1C49-$1CAA): 0 the letters ($0EC4), 1 the screens
  ($104A), 2 the scroller ($1259), 3 the music ($146B), 4 the disc
  ($14D7) and 5 the input ($1E7D), numbered in the order they are made.
- `frame_top` ($1BDC) at raster line 255, once a frame, runs every
  object's frame routine (`objects_frame`, $1D18) with interrupts on,
  unless the last frame's are still running.
- The raster list is two halves of up to 15 entries, $18CA-$1953; an
  object adds an entry (`raster_add`, $19A8) or removes its own
  (`raster_remove`, $1AEB) in the hidden half, and `frame_top` swaps the
  halves. `raster_dispatch` ($1B52) fires two lines before each entry and
  waits in a run of NOPs, so the entry's own interrupt comes with almost
  no jitter.
- Slow work, such as unpacking a picture, is a job (`job_add`, $1CE2),
  run from the main loop between frames.

## The scroll text is the script

The text at $2131-$248B (`scroll_text`) is both what scrolls along the
bottom two rows and what drives the intro. Bytes $00-$3F are glyphs of
the scroller's font; $40-$4F set the colour, $50-$5F the speed (table
$1449, in quarter pixels a frame), $60-$6F a pause (table $1459, in
frames, 50 a second), $70-$7F send a message to the scroller itself, and
$80 + n followed by m sends message m to object n. The text runs: the
title with IMAGEWORKS PRESENTS A BITMAP BROTHERS GAME; the arch for YEAR
2095, bringing the letters in; the towers for YEAR 2100, starting the
disc; the arch again for the copyright; the towers for the C64 credits
and PRESS FIRE; then it blanks, fades the disc and the letters out, shows
the title and starts again.

The credits it scrolls: C64 code Carl Muller, C64 music and sound effects
Martin Walker, graphics Alan Tomkins, management "Daz", original score
Nation 12 (written NATION XII with two glyphs of their own, $3B and $3C),
special thanks Nick Pelling.

## Pictures

- `show_picture` ($10D4) fades out what is shown, unpacks a bitmap to
  $E000 and its two colour layers to $BC00 (screen) and $B800 (colour
  RAM), still hidden, then reveals it from the middle columns outwards
  over 20 frames.
- The arch (list $2561) and the towers (list $3CAF) are multicolour
  bitmaps. The title is a character screen: its map packed at $248C, its
  characters at $5393, unpacked to $C800 and $F800.
- `fade_out` ($1703) takes 16 frames, darkening every colour a step a
  frame through the tables at $17FA-$1849.

## The letters and the disc

- The letters ($0EC4) are eight sprites, frames $60-$67 at $D800-$D9FF,
  that spell S P EE D B A LL along the top, EE and LL twice as wide. They
  fade in and out through a brightness ramp ($0F75). The eighth sprite is
  a star placed at X 400, past the right edge of the screen, so it is
  never seen (`letters_xs`, $0F6D).
- The disc ($14D7) is six sprites, two across and three down, that its
  raster handler at line $55 ($1569) reuses below the letters. Its 23
  pictures at $5805-$7A84 are half a turn, from the 2 at the front
  through edge on to the 2 reversed; played forwards and back they look
  like a disc that keeps turning. It changes picture every two frames,
  filling a hidden buffer ($CC00 or $CE00) half a picture a frame.

## RESTORE

The scroller's raster handler at line $EA ($13FB) starts CIA 2's timer B
with its NMI on, and the NMI handler (`nmi_return`, $1E67) returns
without reading $DD0D, which is the read that releases the NMI line. CIA
2 keeps the line held, and RESTORE, which pulls the same line, makes no
new NMI: the key does nothing in the intro.

`raster_restore` ($1431), which would put back the default video
registers at line $FB, is never installed: `scroller_start` ($12A7) loads
its line and address and then leaves out the call.

## The tune

- `music_init` ($0200) starts a tune from the 16-byte headers at $0D83:
  three track offsets and eight tick lengths. `music_play` ($025D) runs
  every frame; each voice reads a track (`track_next`, $05A2) of repeat
  counts and patterns, and each pattern (`music_note`, $029F) of notes:
  a length in ticks, a gate-off bit, an optional instrument or slide, and
  a note from 96 (C0 to B7, frequency tables $06DA and $073A).
- 14 instruments of 16 bytes ($079A, with their second halves at $080A)
  set the envelope, waveform and pulse, and the effects run every frame
  (`voice_effects`, $03BC): pulse sweep, slide, alternate notes, drum,
  arpeggio, a waveform for the attack, and a pitch sequence.
- Tune 0 plays a tick every second frame on all three voices and loops.
  Tune 1, three one-note patterns that end the tune, is never started.
- Fire, SPACE or / ($1EDE) sends the music object message 2, which sets
  the fade speed to 8: the volume drops one step every 9 frames, and at
  0 the music stops and `go_flag` is set (*live*: 134 frames after fire).

## The game's load

`load_game` ($200C) turns everything off, copies the loader
(`loader_code`, $2082) to $0400, banks the KERNAL in and puts its vectors
back, points the IRQ at a handler that steps the border colour once per
CIA 1 timer interrupt (the stripes) and loads `SPDBALL` with the KERNAL
until it succeeds; then $01 = $35 and a jump to $0812. The unpacker of
the format both parts use is at $20C3.
