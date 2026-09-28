# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Silver** (28 September 2026). `coverage.py` 100 % of 52,126 tracked
bytes, with the RAM under the I/O chips and above the screen store
excluded in `game.json` with the reason; `facts.md` written from the
trace (mechanics, graphics, tables, unused code, bugs, live tests);
`features.md` with every row live, traced or differs but one; the How
it works page with a screen builder, the music player, and widgets for
crosses, energy, the jump and the enemies, checked in a browser. Copy is
`agent-draft`.

## For Gold

- A human reads and edits the copy (`kit/style.md`); `game.json` `copy`
  then leaves `agent-draft`.
- **Can every cross be reached?** The positions are in
  `work/cross-map.txt`. A reachability pass with `try_move`'s rules (the
  jump is 24 pixels, tiles `$2A`-`$4C` solid, ledges crumble), then a live
  walk to any cross it flags. A Lemon64 comment says one cannot be.
- A Maps / levels tab: all ten screens with their crosses, enemy paths
  (the scripts at `+$45` of each record) and pick-ups.
- The enemy path scripts: decode the format and step one on the page.
- The page's music player leaves out the filter the game sets; say so
  louder, or extend `site/lib/sid.js`.
- SHIFT as a jump key was traced, not tested: the emulator's host-key
  path has no name for it.

## Still to establish (open, not absent)

- Which release this is: the withdrawn *Thriller* version or the later
  one. The page plays the tune; compare it with a known recording.
- What `$1000`-`$1FFF`, `$4A90`-`$50FD` and `$6BCD`-`$6FFD` held: loaded,
  never read, named by nothing.
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
  (where the CPU runs).
- Run shell commands one at a time and put anything longer than a line in
  a file: the terminal is the contributor's interactive zsh.
