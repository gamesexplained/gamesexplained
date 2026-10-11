# Lode Runner — kit feedback

Run on 4 October 2026, kit 0.0.74, Ubuntu Linux x86_64, by jankfoundry with Codex. The contributor reviewed the pushed branch and accepted the minisite for Silver submission.

## Skill text that changed what I did

- `60-verify`: “Measure the listing before calling it done” led from sampled errors to full independent routine/data reviews. Results and intervals are summarized in facts.md; reports remain private. Its breakpoint guidance also supplied an active IRQ control alongside loop/hole checkpoints.
- `50-coverage`: “Resolve every pointer table before excluding a region” exposed editor/guard RTS targets stored as addresses minus one.
- `70-minisite`: “Sweep the whole input space, not a few plausible values” drove complete route-cost and ordinary music-transposition checks.
- `70-minisite`: “Draw from the memory the game draws from” required live bitmap state, resource-transfer alignment, and actor-mask substitution.

- `10-orient`: “Give every part a folder” moved the resident engine and all 150 independently loaded room sectors into the standard part layout. “The game's own loader puts the part in memory” required native captures for each board, even though the room parts contain data rather than new code. The migration used kit 0.0.88.

## What was changed in the kit

- `kit/scripts/browser.py` accepts an explicitly selected existing Chromium/headless-shell with a selectable port and local profile/XDG/temp state. `test_browser.py` checks containment and POSIX stop-pattern ownership. `tools.py` and INSTALL document the fallback; the minisite skill already points to INSTALL's Browser checks. No browser was downloaded. The existing C64 footprint verifier does not scan browser state; launcher isolation and ownership tests are the narrower evidence.
- `kit/c64/check_emulator.py` selects the emulator status line rather than assuming it precedes browser status. `test_tools.py` covers running/stopped browsers and emulators, legacy output, and missing/ambiguous lines. Dispatcher tests and the real emulator qualification pass.
- `site/lib/site.css` hides vertical tab-row overflow while preserving horizontal scrolling. This is a layout fix, not a workflow change.

## Candidates

- `kit/skills/core/60-verify`: enumerate caller-supplied indexes against the table's length, including adjacent reads during normal progression. No second game's matching case was established for this proposed addition; the lesson is preserved in `kit/lessons/2026-10-04-lode-runner.md`.
- `kit/skills/core/70-minisite`: establish loaded-resource offsets from the original transfer and a live buffer before decoding the full resource set. No second game's matching case was established for this proposed addition; the same lesson file preserves it. Both proposals remain outside the core skills until another game establishes their broader applicability.

## Presentation and private evidence

Existing custom-tab, paragraph-purpose, and interactivity rules supported Music, Editions, clearer hole playback, and the grouped picture gallery. The game-specific CPU/browser harnesses and detailed audit material stay in ignored work/ storage. facts.md retains the review summary, edition facts, paired addresses, and provenance. The contributor requested this smaller submission after feedback on another game's PR.

## Tool behavior and open work

VICE pause can leave an instruction in flight, so stable-PC/state checks precede pokes. Loading-state captures were discarded. Editor automation reached its menu via a command latch rather than a reliable physical chord; persistence remains open. All write experiments used a separate private user disk. Python regex syntax did not match pkill's POSIX dialect; the shared stop test now exercises the actual dialect.

## Maintainer asks

None. The contributor approved submission after reviewing the branch.
