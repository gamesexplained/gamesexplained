# World Games — TODO

Current tier: Silver. Every part is at 100 % coverage, the facts and
features are verified, and the minisite is built, its copy an agent's
draft.

## For Gold

A person curates the pages section by section (`AGENTS.md`, Definition
of done).

## Recommended

- **An audit of the listing.** The sample of 80 comments found 8 wrong
  (10.0 %, 95 % interval 5.2 % to 18.5 %), over the mark of one in 30.
  All eight were corrected, but the rate holds across the rest. Audit
  every comment, part by part, given the kinds of error the sample
  found (`kit/skills/core/60-verify`), then sample again.

## Open

- What weightlifting's two collapses, scripts 5 and 6, show: the choice
  between them was run in VICE, but neither was watched.
- Bull riding's top band: the reference screenshot shows it orange
  behind, where `br_top_band` (`$1CF9`) sets light blue and a live
  screenshot shows light blue. Which frames differ, and why.
- Cliff diving's map is drawn in the colours above the water; where the
  surface sits at each level, and drawing the sea in its own colours.
- Caber toss's scenery map's last columns: whether the view ever shows
  them.
- Slalom: the loop at `$F41C` that would hang if a bent flag's top
  colour cell were already 1; whether a run can reach it.

## Platinum

A Play tab: a port of every event, run in lockstep with the game's code
(`kit/skills/core/70-minisite/play.md`).
