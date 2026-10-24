## next · 2026-10-24 · The Sacred Armour of Antiriad (C64) · air with Claude

- **Start a check from the listing with the bytes the game reads before
  it writes them as the machine holds them.** A listing carries the
  bytes the game uses as its own, so zero page and the system area start
  at 0 on the kit's machine, where a machine that has just loaded the
  game holds what BASIC and the loader left. This game's throw flag,
  `$7C`, is never cleared when a game starts, and on the machine it holds
  `$C9`, the `CMP` of the routine BASIC's start-up copies to
  `$0073`-`$008A`. With it set, the game rewrites the sprites' high X
  bits dozens of times a frame, and a room exit from the interrupt that
  lands between the read and the write is undone. A bot's route found
  on the kit's machine, replayed in VICE (release v3.13.2) on 24 October
  2026 a stick read at a time, took Tal through two rooms at once at its
  123rd read; with `$7C` set to 0 in VICE it matched the kit's machine
  for 528 reads. `cpu6502.js`'s `reads` and `writes` trackers, given to
  each `run`, `irq` and `nmi`, found nine bytes the game reads first in
  its first 700 frames, and the route's test now starts with them as
  VICE held them.
- **Run a check of a game whose interrupt handler clears I on the kit's
  machine with `nest: true`.** The machine ran each handler whole, so an
  interrupt that fell due inside one waited for its `RTI`. This game's
  raster handler clears I and runs for about fifty lines, the timer's
  music and the collisions interrupting it, and reads `$D01E` and
  `$D01F` before it returns; on the kit's machine that read cleared a
  collision before the game had latched it. The same route, a stick read
  at a time, matched VICE (release v3.13.2, 24 October 2026) for 711
  reads, until a scenery hit VICE took and the kit's machine did not;
  with `nest: true` the kit's machine matched VICE for 1,380, through
  five deaths to the game over, and read the stick every 7 frames as
  VICE did, where whole handlers had let some reads come after 6.
  `kit/c64/frame.py nest` records the case in
  `kit/c64/fixtures/vic-nest.json`, and `kit/c64/test_machine_nest.js`
  holds the machine to it.
