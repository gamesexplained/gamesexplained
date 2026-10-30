# The opening ceremony — verified technical facts

File `O`, `$6400`-`$B420`, the loader's second load at power-on and
option 7 of the menu. Every address here is this part's. Unless marked
*live*, a fact comes from the code in `work/entry.vsf`.

## The engine

- The ceremony runs on an engine of twelve actors, records of `$54`
  bytes from `$1510` (`act_list`, `$8C40`), each a script that runs until
  it waits (`act_wait`, `$8713`) and is resumed by its timer
  (`act_due_steps`, `$8261`). `sched_run` (`$85CE`) passes over them for
  good. Many of the engine's routines (bounds, a second timer, the text
  cells) are unused here: the engine is shared with code the ceremony
  does not have.
- A step is a frame: the clock at `$4D` goes up once a frame in
  `irq_bottom`, and every actor's divider and step limit are 1.
- Any key or joystick ends the ceremony and goes to `$0900`, which loads
  the menu (`sched_to_menu`, `$85DC`).

## What happens

- The picture, a multicolour bitmap packed in three streams
  (`unpack_picture`, `$A3E7`), unpacks over the title's at `$4000`.
- Three flags fly on the poles (`flag_start`, `$A4C0`), and the ten small
  flags behind the stands wave from the interrupt (`cell_frame`).
- The torch bearer (`bearer_run`, `$A637`), two actors of four sprites
  each, waits 250 steps off the right edge, runs in, climbs the steps,
  raises the torch for 48 steps and stands.
- The flame catches after 712 steps (`flame_start`, `$A4E2`) and burns
  for good; five doves fly up and to the right from 778 to 926 steps on
  (`dove_start`, `$A53A`) and start again when they leave the top.
- `bearer_run` copies the big flame and the doves' shapes over the
  raised torch's shapes once he has lowered it (`spr_bearer_raise`,
  `$7E00`).

## Music

`music_step` (`$B056`), twice a frame, plays `tune_ceremony` (`$B0E7`):
records of four bytes, three notes and a length. A second tune,
`tune_other` (`$B23C`), is never played.
