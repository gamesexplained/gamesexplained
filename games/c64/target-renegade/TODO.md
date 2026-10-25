# Target Renegade — next work

Next: trace the EasyFlash copy directory and reach the second load, then separate shared engine bytes from load-specific data before extending annotations.

- Bronze complete: title and first-stage play captured; initial feature checklist, register/string sweeps, 22 comments, and compact page.
- Measured first-load coverage: 720 / 61,942 bytes, 1.2%. The cartridge banks and second load remain unstarted (1 of 13 parts has an analysed image). The percentage is not whole-game completion.
- Listing source: `parts/resident/work/entry.vsf`, SHA-256 recorded by listing.json. Preserve this exact image and `work/play-round1.vsf`. Restart the part's disassembler from entry.vsf so symbols.json restores annotations.

## Before Silver

- Map bank copying using the native loader, proving duplicates before exclusions. Resolve first-load shared engine versus load data, and capture stages 2–5 plus the ending through the game's own paths. A second-load folder exists without a snapshot.
- Classify all unannotated code/data, including RAM beneath I/O. Follow the part's coverage queue; do not mistake automatic labels for explanations.
- Resolve the listing's short untyped gaps and check self-modifying instructions. Preserve initialization code around $020D using the entry image.
- Exercise every documented attack from a neutral snapshot. Trace damage, endurance, lives, timer, scoring, weapons, enemy decisions, and stage completion. Investigate the five-life supplied edition against the manual's three without assuming the original was identical.
- Attribute the SID player and every tune/effect, then provide the required tune players for Silver.
- Complete verification and independent comment sampling. The contributor identified the session as gpt-6.1-sol, a proven model; an additional maintainer check is not required solely for model provenance. Keep Bronze until all Silver requirements hold.
- Expand the page only from verified findings; create maps/levels and discoveries tabs as the analysis supports them.

## Delivery preference

Commit and push the branch as unorig. Open no PR, file no issue, and write no PR notes until requested.
