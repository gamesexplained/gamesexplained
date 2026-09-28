# Chiller — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## STOP: the model was below the kit's minimum

`AGENTS.md` makes this non-negotiable: the work runs on an Opus- or
Sol-class model or better, and on a weaker one the agent stops and says so,
because the failures are silent — address arithmetic goes wrong in ways
that read as confident. This run was made on
`deepseek/deepseek-v4.1-flash`, so **the analysis work stopped here**, on
purpose, at the end of `10-orient`.

What that means for whoever picks it up: everything committed is
mechanical — byte counts, snapshot offsets, the interrupt vectors — and
each figure is in the commit history beside the script that produced it.
The **interpretive** claims in `orientation.md` (what the code at `$0818`
does, which image the listing should come from) were written by that model
and are to be re-derived from the bytes rather than trusted. Re-reading a
paragraph costs minutes; adopting a wrong one costs the run.

Resume on an Opus- or Sol-class model — this repository's own runs used
`claude-opus-5-5` and `claude-fable-5-1` — and correct `model` in
`game.json` and `timings.json` if the harness names it differently from
`deepseek/deepseek-v4.1-flash`.

## How to resume

In Cline: switch the model to an Opus- or Sol-class one, open this clone as
the folder, start a **new** task, and paste:

> Continue games/c64/chiller — read its TODO.md and follow kit/START.md.

Everything a new session needs is already in place: `gh` is installed and
signed in as `unorig`, the fork `unorig/gamesexplained` exists and this
branch is pushed to it and tracks it, the commit identity is set for this
repository only (`unorig <unorig@users.noreply.github.com>`), and both tools
are installed under `tools/`. If the tools are down, start them again:

```
python3 kit/scripts/tools.py vice
python3 kit/scripts/tools.py r2000 games/c64/chiller/work/play-idle.vsf
```

At the end of the run: open the pull request (the contributor has allowed
that), and file the asks in `kit-feedback.md` as `kit-ask` issues — search
first, because ask 3 there belongs as a comment on the existing issue #44,
not as a new issue.

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
- The model: see the STOP section at the top. `10-orient` is timed against
  `deepseek/deepseek-v4.1-flash`, as the contributor named it; the exact
  string Cline's own picker shows is still to be confirmed, and the earlier
  `claude-fable-5-1` (inferred from a stale local session transcript) was
  wrong.

