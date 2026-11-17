# Kit feedback

## Skill text that changed what I did

- `50-coverage`: "Is the picture loaded or drawn?": the hand-over/play comparison separated authored map and shapes from the bitmap, sampled columns, and runtime masks before coverage was called complete.
- `60-verify`: "A wrong comment is usually one belief written down more than once": the sample's ant-count correction was applied to the related initialization descriptions, and the later first-ant scheduling exception was corrected across the notes and pages.
- `70-minisite`: "Start with the leads, because": the explanation plan assigned outcomes to the desert AMMO box, the first-ant exception, retained poses, the delay slots, and forced-only collision leads before pages were written.
- `65-inputs`: "Replay it on a second machine": all 133 desert-route coordinate milestones were checked on a second independently started emulator process.

## Kit changes

- `kit/spectrum/zesarux.py`: `smartload` quotes an absolute image path containing whitespace before sending it to ZRCP. The original upload's spaced filename produced "Unknown file format" when unquoted. A quoted raw call loaded that same local file; the existing nineteen client checks pass. No image or machine snapshot is committed.

## What cost the most time

Quoting image paths in the client would have avoided the initial filename failure and the need to copy the contributor's file under a different name.

The failed emulator checks were the three already documented in the platform workarounds, and each was handled by those existing rules. The host was Debian 13 x86_64, using the project's ubuntu24 emulator build and an already-installed SDL 1.2 library; no system package was installed. The installed SkoolKit was 10.2, and the launcher reported its environment at 103 MB rather than the guide's estimate. The footprint check was clean.

## Candidates

The ZRCP client method named `bp_clear` disables the global breakpoint table but leaves its individual conditions intact. Re-enabling the table can therefore reactivate a checkpoint. This run disabled slots individually; the visible failure and workaround are recorded in agent-history.md. A broader API rename or change needs compatibility review rather than a game-run alteration.

A direct final-level setup can retain a BASIC string from the wrong stage, changing the available workspace even when the player, target, and stage counters are plausible. The setup here now follows the actual final interlude before completion. The kit already says to set state before its initialization path; this case needs no extra core rule.

## Maintainer asks

None. The filename failure is fixed on this branch; the other limitations are recorded or covered by existing rules.
