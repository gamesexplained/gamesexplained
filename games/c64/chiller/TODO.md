# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Silver** (28 September 2026), with further work toward Gold on 28-29
September 2026. `coverage.py` 100 % of 52,126 tracked bytes, with the
RAM under the I/O chips and above the screen store excluded in
`game.json` with the reason; `facts.md` written from the trace
(mechanics, graphics, tables, unused code, bugs, live tests);
`features.md` with every row live, traced or differs but one; the How
it works page with a screen builder, the music player, and widgets for
crosses, energy, the jump and the enemies, checked in a browser; a Maps
/ levels tab with all ten screens, a reachability overlay and an enemy
path stepper. Copy is still `agent-draft`: everything below was done by
an agent, and no human has read any of it yet.

## For Gold

- **A human reads and edits the copy** (`kit/style.md`); `game.json`
  `copy` then leaves `agent-draft`. This is the one thing standing
  between this state and Gold: every other item below that was open at
  Silver has evidence now.
- The page's music player plays the game's filter through reSID 0.16's
  6581 cutoff curve, one measured chip; real 6581s spread well either
  side of it. Hearing the tune on a real C64, or measuring a recording
  of one, would say where this game's setting lands on the chips it
  shipped with.

## Resolved since Silver, with evidence

- **Can every cross be reached?** No, not quite. `work/reach.py` models
  `try_move`'s own rules and searches every screen from its start
  position pixel by pixel; nine of the ten screens have every cross
  reachable, and three blue crosses on the way back
  (`graveyard-back`, `ghetto-back`, `cinema-back`) do not, all in the
  play area's bottom two rows. `work/verify_reach4.py` confirms it live:
  `move_sprite`'s Y clamp holds the boy's own position at row 22 of 24
  even falling through open space with nothing to land on. See
  `facts.md`, "Three crosses cannot be reached", and the reachability
  overlay on the Maps / levels tab.
- **The enemy path scripts, decoded.** Direction bytes (0 up, 1 down, 2
  left, 3 right) ended by `$FF`, at `path_scripts` `$4A00`-`$4A8F`,
  stepped by `path_step` `$CC12`. Nine scripts serve the ten screens'
  fifty slots. Steppable on the Maps / levels tab; see `facts.md`,
  "Enemy paths, decoded".
- **SHIFT as a jump key, tested.** The emulator's key-injection tools
  have no name for SHIFT, so `work/verify_shift.py` held the KERNAL's
  own shift flag `$028D` at 1 directly, re-poking it every frame against
  `SCNKEY`'s own overwrite: the boy jumped. `features.md` and `facts.md`
  updated from traced to live.

## Still to establish (open, not absent)

- Which release this is: the withdrawn *Thriller* version or the later
  one. Games That Weren't says V1's cassette inlay has no "Burner
  Loading System" text, a physical detail this PRG dump cannot carry
  either way. The played tune's voice 1 opens on a five-note riff, C2 D2
  F2 G2 D2, repeating (`facts.md`, "Music"); comparing it against a
  recording of V1 needs an ear that knows both, which nobody on this run
  had.
- What `$1000`-`$1FFF` held: not sprite data (`work/render_1000.py`
  renders it as multicolour sprites and it is visual noise), but the
  64-byte periodicity is real and unexplained.
- What `$4B00`-`$50FD` and `$6BCD`-`$6FFD` held: `$4A90`-`$4AFF`, right
  after `path_scripts`, is shaped exactly like more of them (direction
  bytes ended by `$FF`) but no level record points at it; `$4B00` on no
  longer fits that pattern and nothing narrower was found.
- What the `(ANTISOFT)` watermark in the rewritten BASIC stub denotes.
- Which of the manual's ghouls, zombies, ghosts and bats is which shape.

## Working notes

- Snapshots: `work/play-idle.vsf` (play, no input; the analysis image),
  `work/entry.vsf` (stopped at the `$0818` copier). Both are also in the
  emulator's snapshot folder, and `vice_snapshot_load` takes the name.
- The emulator can be held with `vice_ping` still saying running; if the
  boy does not move on the stick, restart it (`tools.py stop vice`,
  `tools.py vice`). See `tool-vice-mcp`, "The sequence that works".
- The helper scripts are in `work/` (gitignored): `feat_*.py` (input and
  screenshots), `text_*.py` (the font, cards, cross references),
  `sweep_*.py` (strings, registers, twins, the tune), `orient_cpu.py`
  (where the CPU runs), `reach.py` (the cross reachability search),
  `verify_reach4.py` (the live fall-through-open-space check),
  `verify_shift.py` (SHIFT held by poking `$028D`), `render_1000.py`
  (`$1000`-`$1FFF` drawn as sprites), `scripts.py` (the enemy path
  scripts, from 50-coverage), `browser_check_levels.js` and
  `check_reach_widget.js` (the Maps / levels tab, headless Chrome).
- Run shell commands one at a time and put anything longer than a line in
  a file: the terminal is the contributor's interactive zsh.
