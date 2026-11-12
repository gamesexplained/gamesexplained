# Ghostbusters II — agent history

## 12 November 2026

The Jondi/Censor disk reached its intro but a subsequent boot fell into a BASIC ROM loop. A disk labelled SHAPE proved to be a standalone demo. The Censor Design disk reached the game and was used for the analysis; the other images stay in `work/`.

The first captured play snapshot followed several autostarts without a power cycle. To avoid attributing leftovers to the airshaft, the game was booted again after a hard reset, and entry and play snapshots were taken. The earlier and clean play states differed in a few self-modifying operands. Rebuilding the disassembler on the clean snapshot lost four automatic labels, so they were retained explicitly before export; their meanings remain open.

The emulator's first execution-map export stalled at its monitor socket. Restarting VICE and recording a shorter clean-boot interval succeeded. VICE runs on a virtual display with its `fs` sound output directed to `/dev/null`, which keeps the SID clocked without making sound.

The first load trace stopped while the loading animation still ran. A second, with warp enabled, covered the transition through to the retry screen and recorded no call to `$FFD5`. A separate observation found the loading code calling the serial receive entry at `$EE13`.
