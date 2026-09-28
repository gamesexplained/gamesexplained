# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**Bronze.** Boots; `orientation.md`; `features.md` with a status per row
and reference screenshots; `30-text` and `40-sweep` done into `facts.md`;
`symbols.json` and `listing.json` at 20.8 % (`coverage.py`, 28 September
2026); `index.html` cut to what is known.

`10-orient` ran on `deepseek/deepseek-v4.1-flash`, below the kit's
minimum. Every later step ran on `claude-opus-5-5` and re-derived what
it relied on: the interpretive claims in `orientation.md` that were
wrong (where the code runs, `$01` in the snapshot, the title screenshot)
are corrected, and `kit-feedback.md` lists them.

## For Silver

- **`50-coverage` to 100 %.** `coverage.py` names the largest bare
  stretches: `$0AB3-$2A7F`, `$45F8-$5483`, `$65F8-$72DD` (after the tune),
  `$8462-$95EF`, `$9669-$A658`, `$AA60-$B5C7`, and `$C000`-`$CFFF`, where
  most of the time goes (379,203 instructions in 3 s). The RAM under the
  KERNAL (`$E000-$FFFF`) holds a shifted copy of much of `$C000-$CDFF`
  (`facts.md`, Twin copies); decide in `game.json` `coverage` whether it
  is excluded. `$D000-$DFFF` RAM holds data too: say what, or exclude it.
- **`60-verify`**, every open row in `features.md`:
  - mushrooms and toadstools, the magic crosses and how many each screen
    needs, running;
  - the enemies (`$D01E` at `$0987`, `$C6DA`, `$CE87` is where to look),
    energy loss per contact and per move;
  - the return journey with the girl, fire / `?` switching players, the
    border colour, red crosses;
  - the keyboard controls (no CIA1 keyboard scan was found, so the KERNAL
    is the lead);
  - reach the other nine screens: find the level variable, poke it, and
    screenshot each card and screen into `reference/`.
- **`70-minisite`**: the full How it works page, `listing.json` rebuilt.

## Still to establish (open, not absent)

- Which release this is: the withdrawn *Thriller* version or the later
  one. The tune's notes are decoded (`work/sweep-tune-ntsc.txt`); compare
  them with a known recording.
- What else the level records at `$7000 + $80·n` hold, beyond the card
  pointer at `+$74`.
- What reads `$02FF`, the tune's counter (`$5DAD`, `$7614`).
- Where "PRESS CTRL FOR MENU" (`$574A`, `show_press_ctrl`) is used; no
  call was found.
- Whether one cross is unreachable, as one Lemon64 comment remembers.
- What the `(ANTISOFT)` watermark in the rewritten BASIC stub denotes.
- Whether the game reloads data per level.

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
