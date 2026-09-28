# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

**none.** Boots, and `orientation.md` is written; `features.md` is still the
template, and `symbols.json` and `listing.json` do not exist.

For **Bronze**: `20-features` (documented features with a status each, plus
reference screenshots and `title_image`), then `30-text` and `40-sweep`,
then export `symbols.json` and build `listing.json`.

For **Silver** after that: the `50-coverage` burn-down to 100 %, `60-verify`
with `facts.md`, and the `70-minisite` pages.

## Where the run stopped

The end of `10-orient`, at its step 6: the disassembler is running, but on
the contributor's `.prg` and **not on the snapshot**. That matters here more
than usual — see `orientation.md`: the engine's live code sits at
`$A000-$BFFF` and `$C000-$CFFF`, and the `.prg` covers only `$0801-$AF6A`
and is 40,882 of 42,858 bytes overwritten once the game runs. Annotating the
`.prg` would annotate the wrong bytes.

**The one action needed:** have the disassembler hold
`work/play-idle.vsf`. Either load it in the running regenerator2000 GUI, or
stop that instance and let the kit start its own:
`python3 kit/scripts/tools.py r2000 games/c64/chiller/work/play-idle.vsf`
(then `kit/c64/r2000.py` drives it and logs every annotation to
`work/annotations.jsonl`).

## Still to establish (open, not absent)

- The last hand-over, where the game's own code first runs: `$0818` proved to
  be another copier, so `work/entry.vsf` is not it.
- Whether the game reloads data per level.
- What the `(ANTISOFT)` watermark in the rewritten BASIC stub denotes.

## Working notes

- Snapshots: `work/play-idle.vsf` (play, no input; the analysis image),
  `work/entry.vsf` (stopped at the `$0818` copier).
- The helper scripts used for orientation are in `work/` (`orient_boot.py`,
  `orient_sequence.py`, `orient_probe.py`, `orient_snap.py`,
  `orient_entry.py`, `orient_loader.py`); `work/` is gitignored.
- Stop the emulator the kit's way; on a macOS release install before
  `kit/c64/tools.py` was fixed here, `stop vice` matched nothing.
- `game.json` records the model as `unknown`: the session does not name it.
  Correct it if the harness is known.

