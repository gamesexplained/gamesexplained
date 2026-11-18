# Double Dragon (C64): orientation

Two separately supplied Mastertronic archives contain version-0 `GCR-1541` images with 84 half-tracks. The disk identifiers are AD and TO. The names in this entry use those identifiers rather than guessing what the archive suffixes mean. The AD disk is labelled `DOUBLE DRAGON-N`; its title shows Arcadia Software. TO is labelled `DOUBLE DRAGON`; its title shows Mastertronic. Both credit Binary Design for the conversion and Technos Japan for the licence. Both dates on screen are 1988. SHA-256 hashes and the full directory inventory are in `media.json`.

## Tool check and boot

The kit launched vice-mcp release v3.13.2 (macOS ARM64 GUI) and Regenerator2000 0.9.20. VICE answered on localhost port 6510; Regenerator2000 answered on port 3000, first with a one-instruction probe and then with the TO first-mission snapshot. The kit's VICE qualification passed 57 of 57 checks. No tools were downloaded. VICE used C64SC, PAL, a 6581 SID and the launcher’s default drive setup.

1. Give each disk a cold start. With TO, autostart the first directory entry (`DOUBLE DRAGON-P`). If the display is black while the disk routine runs, enable warp until the title shows its two start options, then turn warp off. In this run the title appeared within a further 15 seconds of warp after the initial real-time wait.
2. With AD, autostarting the first entry (`LOADER`) showed `LOADING.` and did not reach the title in the wait used here, including a 23-second warp attempt. Start the unmodified G64 again and ask VICE to autostart directory entry 2, `DOUBLE DRAGON-N`, directly. Fourteen seconds of warp after autostart was enough to reach the title in the recorded attempt.
3. Hold the `1` key for approximately one third of a second at the title. Wait for the street scene with the garage, player sprite, and two-colour score panel. The AD disk needed more time after the keypress than the first wait allowed; the first cut was still reading the disk. After another 25 seconds in warp it reached gameplay.
4. Take the ROM-free title and gameplay snapshots with the disk still attached. The first gameplay snapshots both had the hardware IRQ vector at `$FFFE` set to `$2D5E`. The load-entry captures stop at `$2D5B` after installing that vector and before jumping to the game loop at `$5FE5`. At this point the engine has written `$35` to the processor port, so video registers are visible and the hardware vectors come from RAM.

## Disk-to-memory matches

These byte comparisons used the kit's G64 and VSF readers. Startup files were extracted from the contributor's copies and kept in private work storage.

| Files | Addresses | Observation |
|---|---|---|
| AD `LOADER`, TO `DOUBLE DRAGON-P` | `$02A7`, `$0326` | Different bootstrap files, before the main programs. |
| AD `DOUBLE DRAGON-N`, TO `DD` | PRG header `$0801` in both | Both unpack to RAM starting at $0300. The unpacker uses a different repeat marker on each disk. The original files were unpacked in the 6502 simulator and checked against native title hand-over snapshots at $1A60. |
| `IN` | `$1A60–$2BE7` | Both title snapshots have the resource at its header address, with working state changed. The disk copies differ at 26 bytes within `$296F–$2989`. |
| `CM` | `$1AFA–$2BFF` | Identical disk files; both first-mission snapshots contained the complete payload at its header address. It replaces much of `IN`. |
| `L0`–`L5` | Header starts `$8600` or `$8E00` | All six files match byte for byte across disks. At the gameplay entry stop each payload matches the disk apart from 16 bytes in the two sprite-pointer areas at `$C3F8–$C3FF` and `$C7F8–$C7FF`. |
| `ED` | `$A000–$B700` | Identical disk copies; the ending-entry snapshots contain all 5,889 payload bytes unchanged. Execution enters at `$B500`. |
| TO track 35, sector 9 | No directory owner | Allocated on TO. Both disks contain the same 256 bytes at this address: one $4B followed by 255 copies of $01. The original allocation marks it used. Replacing only this payload in a test copy left boot and all seven native level or ending loads intact. |

## Reaching the overlays

The gameplay loop checks `$5B60` for a level change. For the assisted route, restore or pause in play, set the requested file index at `$2C05`, set `$5B60` to 1, and resume. The game’s own call from `$63BE` loads and starts `L0`–`L5`. Index 6 takes a different branch, requests file table index 9 and jumps to `$B500` for `ED`. No resource bytes are injected. Stop at `$2D5B` for each level, or at `$B500` for the ending. Release the stop and run another 105 frames with right held on port 2 for the level views, or 35 frames for the ending. The initial independent tests started from an opening-mission snapshot; the ordered route repeats the procedure without stepping back to the first mission between loads. The score in these images can include the transition's own bonus. These are assisted loads, not a completed playthrough.
