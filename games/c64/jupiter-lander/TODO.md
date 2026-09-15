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

## Missing for Platinum

Platinum needs the listing to reassemble byte for byte to the analysed image
and the build to boot. Nothing has been attempted.

- No assembler is installed (`64tass` or ACME, per `kit/INSTALL.md`).
- The kit has no exporter from `symbols.json` to assembler source, so the
  listing would have to be produced by hand or by a new script. That script
  would be a kit contribution, not a game one.
- The image to match is the analysed one: `$3800`–`$3FFF` and
  `$E000`–`$F450`. It is about 6 KB and I found no self-modifying code, so a
  byte-exact rebuild looks achievable.
- The loader is out of scope by policy, so "the build boots" would mean
  installing the two regions and jumping to `$E037`, not reproducing the
  Remember release.

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
