# Jupiter Lander — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier: Gold

Every Bronze, Silver and Gold requirement is met: 100 % coverage (7223 of
7223 tracked bytes), `facts.md`, one feature **traced** with the search
described, `symbols.json` exported, an interactive article, thirteen
findings beyond the documentation verified live, and the copy read by the
steward. `copy` stays `agent` until the steward edits the page; the
steward would prune a section or two and trim the copy, later.

## Missing for Diamond

A Play tab that is the whole game: every routine ported to JavaScript
and run in lockstep with the game's own code, with `test_play.js`
beside the page (`kit/skills/core/70-minisite/play.md`), and no bug
known that stops a player finishing.

## Open questions carried forward

From `features.md`:

- The joystick path in `read_controls` is traced but was never observed.
  `vice_joystick_set` and `vice_joystick_tap` change nothing at
  `$DC00`/`$DC01` in this vice-mcp build. Anyone with a working joystick
  should hold left and watch the world X go **up**, and then this row can
  move from **confirmed** to **live**.
- The two `nop`s at `$E7AD` may be a crack patch or may be original. A clean
  cartridge dump would settle it in seconds.
- The original cartridge layout is inferred from where the engine sits and
  from the hardware vectors pointing into it. Not verified against a dump.

## Article ideas not built

- A player for the explosion's noise burst. The three tunes are playable;
  the thruster and explosion are gated noise with a filter sweep and would
  need a rough SID model rather than an oscillator.
- The title screen unpacked from `logo_bitmap` on a canvas, stepping two
  cells per byte. The data is embedded in the page already but nothing
  renders it.
- A side by side of the four terrain streams as compression: run length
  against frequency, showing why the x2 close-up is the smallest.
