# Cuthbert in the Cooler — kit feedback

Silver run on Ubuntu 24.04.3, x86_64, Python 3.12.3. Reused local plus4emu 1.2.11 at the kit's pinned source revision, with its code-map patch, and regenerator2000 0.9.20 under this checkout's ignored `tools/`. All 46 emulator checks and a separate footprint check passed. Browser checks used Chromium 153.0.8010.12 and the kit's browser launcher.

## Skill text that changed what I did

- `60-verify`: "Prove reachability with inputs, not pokes": replaced a merely forced bomb-death demonstration with a legal held-SPACE route, recorded its five deaths, and replayed its milestones on the second C16 model. The life-character overflow remains explicitly a forced boundary.
- `50-coverage`: "Resolve every pointer table before excluding a region": followed the directory at $3300 into all player, fire, and guard banks, retaining the fifth images and graphics tail rather than dismissing them with the fill around them.
- `60-verify`: "Run each checker alone and wait for its verdicts before going on": paused the parent throughout the independent sample and left the frozen comments unchanged until the verdicts arrived.
- `50-coverage`: "A comment a program writes is one claim made for every record": corrected all ten generated maze-value descriptions together after the score-carry finding, and checked every packet and all 256 level values against the builder.

## What was changed in the kit

None. Existing rules cover the silent errors found here. The game keeps its routine-comparison tests and browser check beside its pages.

## Candidates

None. The first control probe reached a frame limit during the startup fade. The tool reported its stopping reason; the probe had failed to assert it. The replacement probe requires both the expected checkpoint reason and PC $1172. The existing verification rules already require proving that execution stopped where intended.

## Maintainer asks

None. No additional kit issue was identified. The later listing audit is a follow-up for this game, rather than a proposed kit change.

## What cost the most time

A reusable C16 routine-call fixture would have saved the most verification time, but constructing this game's fixture was analysis work and does not establish a missing shared API.

The other visible setup obstacle was the host sandbox refusing to create its loopback interface (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`). Approved executions completed those commands. This was a host execution problem; no system settings, shell profiles, or global packages were changed.
