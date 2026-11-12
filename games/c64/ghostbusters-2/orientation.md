# Ghostbusters II — orientation

The first two scenes use Censor Design's 1989 crack, [CSDb release 78781](https://csdb.dk/release/?id=78781), in `work/Ghostbusters2.d64`. The museum capture uses the Jondi/Censor release, [CSDb release 227946](https://csdb.dk/release/?id=227946), in `work/ghostbusters-ii.d64`. `media.json` lists both disks. These are cracked releases, so their code must not automatically be attributed to the publisher.

On VICE release v3.13.1, `v3.13.1-linux-x86_64-gui.zip`, the emulator check passed 56 of 57 checks. `pause-at-instruction` failed; use `pause()` in `kit/c64/vice.py`. The test used PAL, and VICE wrote sound to `/dev/null` through the `fs` sound device.

## From power-on to the first episode

Power-cycle VICE and autostart the disk. Hold fire on joystick port 1 at the Censor intro, release it, and press fire at the end of the first story. Warp mode shortens the loads. A stopping execution checkpoint at `$8009` caught the start of the airshaft program; this clean-boot state is `parts/airshaft/work/entry.vsf`. Delete the checkpoint, turn warp off and resume; `parts/airshaft/work/play-clean.vsf` shows the player on the rope. The Source listing uses that play snapshot, with the entry snapshot for the loaded-data audit. Confirm the loader's transfer to `$8009` and record a timed route.

On this build `port: 1` pulls bits on `$DC01`, and `port: 2` pulls bits on `$DC00`, as the emulator check measured. The Censor intro accepted fire on port 1; the airshaft's success prompt reads fire on port 2.

To reach the next scene without playing the airshaft to completion, load `parts/airshaft/work/play-clean.vsf`, pause safely, set the PC to `$0897`, and resume. This enters the game's success-message path without satisfying its gameplay conditions. Release fire, then press fire on joystick port 2: the game restores the story and loader code. A checkpoint at `$8009` catches Broadway's initialization in `parts/broadway/work/entry.vsf`. Remove the checkpoint, turn warp off, resume and press fire at the Broadway prompt to reach `work/play-clean.vsf` in that part. The listing's `work/play.vsf` came from an earlier attempt which ran at warp speed to its retry screen; fire at normal speed then restarted play. This is an artificial route for capturing the next part, not evidence of a completed airshaft.

For the museum, load `parts/broadway/work/play-clean.vsf`, attach the Jondi/Censor disk to drive 8, pause, set PC to `$C9D5`, and resume. This enters Broadway's success-message path without meeting its win conditions. Press fire on port 2. A checkpoint at `$8009` catches the museum's initialization in `parts/museum/work/entry.vsf`; remove it, turn warp off, and resume to reach the rope scene in `work/play.vsf`. Continuing from the Censor disk instead reached a garbled BASIC screen without hitting `$8009`. Its `7.THE MUSEUM` file is 15,554 bytes including the load address; the Jondi/Censor file is 28,376 bytes. The two versions differ after their first 10,668 bytes, but the reason for the failed transition remains an open question.

From `parts/museum/work/play.vsf`, holding down for two frames and up for five frames, repeating that pair 110 times with `vice.frames()` from a stopped machine, reached the first landing in two VICE trials; the state is `parts/museum/work/floor.vsf`. The 377 reads captured from that segment are in `museum-rope-route.json`. The kit's C64 machine replayed them from the same snapshot and reached the landing. A recording from power-on remains open.

For `parts/museum/work/floor-two.vsf`, advance 120 neutral frames from the first landing, repeat the same input pair 110 times for the second descent, then advance 120 more neutral frames. This continuation was observed once in VICE; a control-read recording and second-machine replay remain open.

## Parts and loader

The manual describes three gameplay episodes: the airshaft, Broadway and the museum. The transition routes above capture each episode; the story scenes and ending need a complete ownership audit.

The loader uses the KERNAL's internal OPEN entry `$F3D5`, not its LOAD entry. Break there and read the filename length at `$B7` and pointer at `$BB–$BC` to see its requests. From the opening-story fire prompt, the Censor disk opens `3*` and reaches the airshaft entry at `$8009`. After the forced airshaft success it opens `4*`; at the following story's fire wait, pressing fire opens `5*` and reaches Broadway at `$8009`. After the forced Broadway success on the Jondi/Censor disk it opens `6*`; at the following story's fire wait, pressing fire opens `7*` and reaches the museum at `$8009`. Each wildcard has a single corresponding numbered filename in that disk's directory. The newly captured Broadway and museum entries agree with the earlier entry snapshots in `$1000–$3FFF`, `$8000–$CFFF` and `$E000–$FFFF`. The airshaft entries agree in the first two ranges and differ only in the two hardware IRQ-vector bytes in the last range.

The second and third story waits are saved as `work/second-story.vsf` and `work/third-story.vsf`. Relative to the opening-story snapshot, the second has 43 different bytes in `$1000–$1BFF` and the third has three, while their `$C200–$C8FF` contents differ extensively. That comparison suggests a reused story engine with different content; which bytes each compressed file writes and whether it contains code overwritten before the snapshot remain open. The file ledger therefore keeps the numbered files open.

On the play snapshot, `$01` read `$35`; the RAM hardware IRQ vector at `$FFFE` read `$8D53` and the KERNAL IRQ vector at `$0314` read `$8D6F`. A captured frame recorded nine successive IRQ-vector values, listed in `parts/airshaft/facts.md`. The loader shows a Censor intro and loads the title, story and first episode in sequence. Its file-to-memory map remains open.

Every disk file was compared with both airshaft snapshots in 16-byte pieces at file offsets divisible by 16, omitting the two-byte PRG load address. None of the eight numbered files had an exact piece in either RAM image. The boot file had two matching pieces at a shared offset, with 111 of its 6,607 payload bytes equal there. This does not rule out transformed or shorter matches; the file-to-memory mapping remains open.

From the story's fire prompt, `loads.py` watched `$FFD5` for 40 seconds as fire was pressed. With warp enabled the game loaded the airshaft and reached the retry screen during that watch, which recorded no KERNAL LOAD call. This route therefore did not pass through that entry; the loader it used and the file-to-memory mapping remain open.

During the loading animation on another pass, the CPU was observed in a routine at `$062F–$0634` which calls `$067B`. That routine banks the KERNAL in and calls `$EE13` (`KERNAL_ACPTRj`, the serial receive entry), then banks it out again. This identifies a byte-receive path but does not identify the file or establish the unpacked ranges.
