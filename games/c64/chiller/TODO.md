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

End of `10-orient`. The disassembler now holds the right image: the kit's own
regenerator2000 is running on `work/play-idle.vsf`
(`tools/cargo/bin/regenerator2000 --mcp-server .../play-idle.vsf`, start it
with `python3 kit/scripts/tools.py r2000 games/c64/chiller/work/play-idle.vsf`),
and `$C000` reads back as the engine's code. The contributor's own instance,
which held the `.prg`, was stopped.

Do not go back to the `.prg`: it covers only `$0801-$AF6A` and is 40,882 of
42,858 bytes overwritten once the game runs, so annotating it would annotate
the wrong bytes (`orientation.md`).

**Next:** `20-features` — the wiki page and manual, reference screenshots
into `reference/`, `title_image` set. Then `30-text` and `40-sweep`.

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
- The model is recorded as `claude-fable-5-1`: the session does not name it,
  and that is what this machine's session transcript holds (28 September 2026)
  in the form the rest of the repository uses. Correct it if that is wrong.

