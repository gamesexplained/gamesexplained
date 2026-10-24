# The palace (stage 2) — verified technical facts

Stage 2: Mariko in her cell, then the palace hall from its doors to the
portcullis, with guards, the hawk and Akuma's cutscenes. Every address
here is this part's unless it is named as the engine's. Unless marked
*live*, a fact comes from the code in `work/entry.json` (stopped at
$BFFA).

## The stage

- `palace_start` ($B700): the portcullis up ($A7 = $74) and still, the
  hero a column left of his usual start, the scroll at 0 (the doors), 12
  arrows for the hero ($B0) and 28 less that, 16, for the guards ($B1),
  headgear 1 and its chances (`guard_chances`, $BC33), the hawk's
  countdown at 5 and its least at $10, the first guard coming on. Then
  Mariko in her cell (`mariko_cell`, $AF61: her door shut, two poses and
  two tunes), and the main loop: `palace_frame` ($B7D6) and the engine's
  frame end.
- The hall scrolls (`scroll`, $B400) from the doors, the scroll at 0, to
  the portcullis, the scroll at $1C; a hero at column $2A or more has gone
  through the portcullis: $D0 = 3, and the dungeon is loaded.

## The guards

- After the first guard is beaten, Akuma sends the next in a cutscene
  (engine $79A0); after that, while the hero is away from the portcullis's
  end of the hall, each guard beaten brings the next once $82 has counted
  to 20, with the next headgear up to 5 and its chances (`chance_kick`,
  `chance_punch`, `chance_step`, $BC45-$BC53), and the cut to him
  (`cut_guard`, $AD8F; `cut_run`, $AE2E) ($B7D6).
- Each guard beaten while the hero's most arrows are 9 or more takes one
  from his most and gives one more to the next guard ($B8A2).
- A guard stands still while the portcullis is down to row $78 or more
  and he is at column $16 or more ($B9DF).

## The hawk

- From the second guard on, while $98 is set, the hawk's countdown ($90)
  runs ($B84A); at its least ($92), with the guard 40 or more columns
  ahead, Akuma's cry plays (the recorded sound at speed 7); at 0 the hawk
  is sent (`hawk_send`, $B653), only when the guard is 20 or more columns
  ahead of the hero.
- It comes from the right edge at one of three heights, two columns a
  frame. Three to five columns from the hero, a kick or a full-stretch
  punch at its height strikes it and it flies off to the right; one
  column off or less it pecks, a punch on the hero ($40 = 2), up to $A5
  times (`hawk_move`, $B589). Each hawk sent lowers the countdown's least
  by one, down to 9, so each comes sooner.
- `hawk_draw` ($BD57) beats its wings through three pictures and swoops
  through three more within seven columns of the hero, with its shadow on
  the floor.

## The portcullis

- `gate_vectors` ($B100) draw the gatehouse, the bars and the teeth, the
  teeth longer the further down it is ($B214).
- Still and up, it falls when the living hero stands under it, at columns
  $1E-$21 ($B93D); with no guard alive, a kick or a full-stretch punch at
  column $1D or more also sets it falling. Falling with its bottom at row
  $82 or lower, it kills a hero at columns $1F-$21 ($B967). Before it, a
  hero who comes on while it is down to row $7C or more bounces off it
  ($BA1A). How to pass it: `features.md`, "Beyond the documentation".

## The scenery

- The doors at the hall's left end ($B006), the window posts and Mount
  Fuji (`hall_vectors`, $B280), each covered where it was drawn two
  frames before.

## Tunes

`stage_tunes` ($1000), six JMPs: the four notes as Akuma's chamber is
shown ($1000), the hero's death ($1003), a guard beaten ($1006), Mariko's
two tunes in her cell ($1009, $100F) and Akuma raising his arm ($100C).

## Left in memory

`unused_scraps` ($A9D4), 241 bytes after the doors; after `chance_step`,
a copy of $BC33 with its tables and an earlier drawing of the hawk.
