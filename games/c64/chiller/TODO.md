# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Gold** (29 September 2026). The steward, unorig, went through the How
it works page section by section and the copy is `human-edited`: sections
reordered, the false "unreachable cross" bug replaced by the missing
ending, the jump widget replaced by a picture of a real jump, the level
format folded into the screen section, and the shooting claim softened to
what the code shows. A Play tab runs a JavaScript port of every routine,
checked in lockstep against the game (357 of 366 sessions identical; the
other 9 hit the line-16 interrupt race), with a level picker and cheats.

## Open

- The page's music player plays the game's filter through reSID 0.16's
  6581 cutoff curve, one measured chip; real 6581s spread well either
  side of it. Hearing the tune on a real C64, or measuring a recording
  of one, would say where this game's setting lands on the chips it
  shipped with.
- How an enemy was once hit. The kill code and the fire sprite in
  `switch_check` survive, but no code that moves that sprite along has
  been found (`facts.md`, "Enemies that could be killed").

## Resolved on the way to Gold, with evidence

- **Can every cross be reached?** Yes. The three lowest crosses, on the
  way back, were each taken on the game's own code by walking left along
  the ground, and the steward played all ten levels through, taking every
  cross. After the last level the game loads the forest again: there is no
  ending. See `facts.md`, "Every cross can be taken, and the game has no
  ending".
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

- **Which release is this?** The first, withdrawn *Thriller* release: its
  tune data matches the steward's V1 transcription in unorig/Chiller byte
  for byte (`facts.md`, top). The re-release's in-play tune is playable on
  the page from `reference/music-v2.json`.

## Still to establish (open, not absent)

- What the way-back play-through screenshots show (`reference/screen-05`
  to `screen-09`): a stray fence patch on the cinema, and a crosses
  counter reading `2S`, `5S` and so on where the outward screens read
  `05`. They were captured with crosses poked beside the boy, so either
  the poke or the game could be the cause. The steward does not recognise
  either from play (29 September 2026); the page uses the screen
  builder's renders instead.

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
