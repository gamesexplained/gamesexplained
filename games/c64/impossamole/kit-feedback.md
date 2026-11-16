# Impossamole — kit feedback

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": corrected the exit-table description in all five parts and repeated charset descriptions after the sample.
- `60-verify`: "A test must contain cases that have to succeed": tested all six accepted names, including spaces, rather than accepting only rejected random inputs.

## Changes to the kit

`kit/c64/sid_check.js` now rejects a flat rendered output even when volume and envelopes are active. `kit/c64/test_sid_check.js` measures the waveform and tests a gated voice without a selected waveform. The game’s first reset erased its waveform masks and the checker passed all 16 silent effects; the amplitude result was zero. The reset was fixed, and all effects then produced nonzero audio. Visible tool failures below need no new skill rule.

## What cost the most time

A browser-neutral runner for sid_check.js would have saved the most setup time: its sound-check logic works independently of Playwright, but the command requires a Chromium launcher even with Firefox already available.

## Visible failures

- Installed headless VICE v3.14.0 passed 56 emulator checks. Host-key injection failed; the final compatibility probe raised KeyError(checkpoints). Matrix keyboard input, joystick input, stepping, watchpoints, snapshots, and deterministic restart passed. The run used the working input paths.
- frame.py capture initially lost its connection during checkpoint deletion. A fresh VICE launch and snapshot restore produced a successful cycle-known capture and exact pixel comparison. No repeatable minimal crash case was established.
- tools.py status attributed the installed headless wrapper to the repository it was built beside. game.json names the executable actually used. The installed build was preserved.
- sid_check.js needs Playwright plus Chromium. This host has Firefox. Its exported checker code can be driven through WebDriver BiDi without installing either dependency.

## Candidates

The animation stream can jump to index zero, which freezes its last shape. A CPU comparison caught the page's first interpretation. Existing verification guidance already covers this; no skill change is needed.

## Maintainer asks

Filed as [#912](https://github.com/gamesexplained/gamesexplained/issues/912). Consider allowing the SID checker to use an installed Firefox through WebDriver BiDi. Keep the same worklet test and sound verdict; only the browser launcher and evaluation transport need an alternative. The question is whether the kit wants to maintain that second browser backend.
