# Thrust — TODO

Current tier and what is missing for the next one.

## Tier: Silver

Coverage 100 % (21,735 bytes; `coverage.py`). The listing's sample
(seed 20261108, 60 comments, checked on claude-fable-5-1) found 10
wrong, 16.7 %, over the mark of 2; the ten and every comment that
repeated them are corrected. **A full audit of the listing is
recommended** (`kit/skills/core/60-verify`): the rate is a lower bound,
and correcting the sampled comments does not bring the rest under the
mark.

For Gold: a person goes through every section of every tab, cutting,
expanding and rewriting (`AGENTS.md`, "Definition of done"); `copy` in
`game.json` then says what they did.

## Questions only a person can settle

- The C64 manual on REG-Vault is a scanned PDF this run could not read;
  it may describe controls or scoring this write-up does not.

## Settled by Firebird's cassette

Firebird's 1986 cassette (the Ultimate Tape Archive's `Thrust.tap`,
loaded in VICE on 12 November 2026) answers two questions this crack
left open:

- The release plays music. Once loaded, it writes the sound chip every
  frame from a player at `$2000`, which `$3000` reaches with
  `JMP $2000`; this copy answers the same call with an RTS. 113 of the
  224 16-byte pieces of HVSC's `Thrust.sid` (Rob Hubbard, 1986
  Firebird) are in the tape's memory, from `$1F8E` on, where the rip
  loads them at `$0800`.
- The release starts in its attract mode, the demo pilot and the TOP
  EIGHT THRUSTERS table with PRESS SPACE BAR TO START, where this copy
  starts a game at once (`crack_start`, `$AF82`).

The loading picture itself is on Graphics, from the tape. A player for
the title tune would need the tape's player and its data in a page.

## Ideas for the pages

- A sound effects player: `sound_tick` (`$9B58`) run on the kit's 6502
  with each effect's start routine (`$9C94`, `$9CCF`, `$9D07`, `$9D3D`,
  `$9D85`, `$9DC4`), through `site/lib/sid.js`.
- A pod-and-rod widget: the ship's thrust, gravity and the rod's spin
  ported from `ship_physics`, `move_ship` and `ship_position`, checked
  against a trace from the emulator, so a reader can swing the pod.
- The demo pilot's flight replayed from `demo_steps` and `demo_times`.
- A Play tab: the walls, objects and physics are all described.
