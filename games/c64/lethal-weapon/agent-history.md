# Lethal Weapon — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 1 November 2026, run on claude-opus-5-5 (unattended)

The contributor was not present; their answers came in the starting
message: Silver, the web allowed, commit and push but do not open the pull
request, one agent, commits as `unorig`. Decisions taken in their place:

- **Branch base.** The fork's local `main` had diverged from upstream
  (38 fork-only commits, 105 behind). The game branch was made from
  upstream `main` (kit 0.0.280) rather than from the fork's `main`, which
  was left alone.
- **Tools.** Already installed under `tools/` from earlier runs on this
  computer (vice-mcp v3.14.0, regenerator2000); `get-vice` said v3.14.0 is
  the newest release, so nothing was installed. `check-emulator`: 57 of 57.
- **Character.** At the select screen Riggs was chosen (right and fire
  together). Murtaugh's play was not recorded.
- **Parts.** Two: the title program (`LOADER` at `$C000` with its tune
  `MUSI` at `$E000`) and the game (`GAM0` and `GAM1`). The per-level files
  (`L1A0` to `L5B0` and their `.CHR`, `.MAP`, `.BLK`, `.ATT`, the `SPxx`
  sprite files) are data the game loads into its buffers between levels:
  no code ran in the level overlay at `$3790` in a code map of level 1, so
  they are read as data the game fetches, as `kit/skills/core/15-parts`
  allows, and level 1A's copy is what the game part's listing shows.

### Getting in

The character select would not take fire alone or a direction alone: its
loop at `$C312` reads both control ports through `$C932` and starts only
when fire and left or right are held together.

### The code map

The first map was recorded with the zap made while the machine was stopped
at the select screen, and nothing ran: the boot script had left it stopped,
so the map held only the title's code. A zap made on the running game
during play, then random joystick input under warp until a stopping
checkpoint at `$0766` (the game-over load of `TITLE`), gave the map in
`parts/game/codemap.json`. The game's start-up from `$03C0` is not in it
(it ran before the zap) and was traced from `$03C0` instead. The dump itself was made after the
game had crashed at `$C011` (see below), and the dump sizes each recorded
instruction from the RAM as it is at that moment, which the crash had
partly overwritten: two instructions came out too long and covered the
random generator's state at `$F26F` and the clock at `$F422`. The recorded
addresses were kept and every instruction was sized again from the bytes
of `parts/game/work/play.vsf` with `kit/cpu/m6502.py`, which is the
`codemap.json` committed. Dump the map while the game is stopped at a
known point, before anything can crash.

Random play under warp ran into the game-over path every time and then
crashed at `$C011`: see `facts.md`, "Game over on this disk".
