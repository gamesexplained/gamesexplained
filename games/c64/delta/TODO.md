# Delta — TODO

Tier: **Silver**. Coverage 100 %, `facts.md` verified, every feature
confirmed, live or explicitly open, minisite built, copy `agent-draft`,
coverage and verify on a proven model.

## For Gold

A human curates the page section by section (`kit/START.md`, the
`curate` step) and records it in `copy` and `steward`.

## Open

- `media.json` is missing. Silver asks for every item on the game's
  media answered there (`kit/skills/core/12-media`). It needs the
  contributor's image in `work/`, which this cloud session did not have.

- "Delta Patrol", the US release, is not identified in this image.
- Which wave records take a credit away (bit 6 of byte 3) in play.

## Ideas for the page

- The attack-wave player on `waves.html` carries every stage but 29, which
  differs from VICE (below). The recording
  run (`work/waves/record.js`, `pack.js`) covers all 32 stages and
  `work/waves/compare2.js` compares them with VICE; a stage that is made to
  match goes in by copying its file into `reference/waves/` and adding it
  to `STAGES` in `reference/delta-waves.js`.
  Later stages start from the VICE snapshots `delta_stageNN` that
  `vice_stage.py` saves at each stage's first frame (in the gitignored
  `tools/vice-home/`); without them, one pass from `wave1_start` remakes
  them, or VICE can be started from the machine's own state at the stage.
  Stages 14, 19, 20 and 25 first differed because VICE's own play had
  reached them with different game state (the random pointer `$8F` among
  about 900 bytes; every VICE snapshot from stage 15 on descends from
  VICE's own play of stage 14). Started from the machine's memory at a
  group's first frame (`work/waves/state_at.js`, `inject.py`, at
  `irq_band_first` `$1888` with the machine's stack pointer), they match.
  Stage 29 does not: from the machine's state at list 90, VICE drifts
  within the group (two samples ahead by its end, the last enemy in slot 6
  instead of 7), and the enemy entering at list 91 comes alive a frame
  apart. Probably the cycles the video chip takes, which the machine does
  not model; not settled.
- The hazard rows (rocks, bubbles, machinery) drawn from the spawn lists
  under the I/O area, stage by stage, and their four-step animation
  (`hazard_frames_step`) played on the Graphics tab, which shows those
  shapes as stills.
- The title's sprite lettering placed as the title screen shows it; the
  Graphics tab draws the stored blocks one under the next.
- A Play tab: the demo at `$9F40` replays recorded input and would be the
  test for a port.
- The trainer patch in `cheats.md`, tried live.
