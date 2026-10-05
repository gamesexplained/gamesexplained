# Delta — TODO

Tier: **Silver**. Coverage 100 %, `facts.md` verified, every feature
confirmed, live or explicitly open, minisite built, copy `agent-draft`,
coverage and verify on a proven model.

## For Gold

A human curates the page section by section (`kit/START.md`, the
`curate` step) and records it in `copy` and `steward`.

## Open

- Mix-E-Load, the loading-music remixer, belonged to the original loader;
  this crack does not contain it. An original disk or tape image would.
- "Delta Patrol", the US release, is not identified in this image.
- Which wave records take a credit away (bit 6 of byte 3) in play.

## Ideas for the page

- The attack-wave player on `waves.html` carries stages 1 to 18, less 14 and 15. The
  recording run (`work/waves/record.js`, `pack.js`) covers all 32 stages;
  stages 14, 15, 19 and 20 differ from VICE (below) and stages 21-32 each need their VICE comparison (`work/waves/vice_stage.py`,
  `compare.js`) before they go in, by copying the stage's file into
  `reference/waves/` and raising `STAGES` in `reference/delta-waves.js`.
  Later stages start from the VICE snapshots `delta_stageNN` that
  `vice_stage.py` saves at each stage's first frame (in the gitignored
  `tools/vice-home/`); without them, one pass from `wave1_start` remakes
  them, or VICE can be started from the machine's own state at the stage.
  Stage 14: in group `$32` (list 157) two enemies leave the top edge on the
  same frames in both, but VICE frees slot 3 a frame earlier and slot 4 a
  frame later than the machine, so the next enemies take other slots and
  the rest of the stage differs. Probably the cycles the video chip takes,
  which the machine does not model; not settled. Stage 19 shows the same
  at the top edge (boss group `$6E`, list 207, frame 272), and stage 20 an
  enemy entering on the right one frame apart (group `$6F`, list 211);
  both are probably one timing difference the machine does not reproduce.
  Stage 15 differs only where the stand-in shots leave a different enemy
  alive between two runs of groups `$14` and `$8E`: a fault of the test,
  which counts its 15 seconds in samples rather than frames.
- A sound-effect player for the 21 effects at `$0406`.
- The hazard rows (rocks, bubbles, machinery) drawn from the spawn lists
  under the I/O area, stage by stage.
- A Play tab: the demo at `$9F40` replays recorded input and would be the
  test for a port.
- The trainer patch in `cheats.md`, tried live.
