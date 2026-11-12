# Ghostbusters II — orientation

The analysed disk is Censor Design's 1989 crack, [CSDb release 78781](https://csdb.dk/release/?id=78781). Its D64 image stays in `work/Ghostbusters2.d64`. The disk directory has a boot file and eight numbered files; `media.json` lists them. This is a cracked release, so its code must not automatically be attributed to the publisher.

On VICE release v3.13.1, `v3.13.1-linux-x86_64-gui.zip`, the emulator check passed 56 of 57 checks. `pause-at-instruction` failed; use `pause()` in `kit/c64/vice.py`. The test used PAL, and VICE wrote sound to `/dev/null` through the `fs` sound device.

## From power-on to the first episode

Power-cycle VICE and autostart the disk. Hold fire on joystick port 2 at the Censor intro, release it, and press fire at the end of the first story. Warp mode shortens the loads. A stopping execution checkpoint at `$8009` caught the start of the airshaft program; this clean-boot state is `parts/airshaft/work/entry.vsf`. Delete the checkpoint, turn warp off and resume; `parts/airshaft/work/play-clean.vsf` shows the player on the rope. The Source listing uses that play snapshot, with the entry snapshot for the loaded-data audit. Confirm the loader's transfer to `$8009` and record a timed route.

The server's joystick port argument is zero-based relative to the physical port on this build: `port: 1` operates physical port 2.

## Parts and loader

The manual describes three gameplay episodes: the airshaft, Broadway and the museum. Their numbered disk files are `3.THE CLOAKS`, `5.THE LIBERTY` and `7.THE MUSEUM`; their mapping to the playable states needs verification. The intervening story and ending files are still open in `media.json`. Snapshots and routes for the later episodes are open.

On the play snapshot, `$01` read `$35`; the RAM hardware IRQ vector at `$FFFE` read `$8D53` and the KERNAL IRQ vector at `$0314` read `$8D6F`. A captured frame recorded nine successive IRQ-vector values, listed in `parts/airshaft/facts.md`. The loader shows a Censor intro and loads the title, story and first episode in sequence. Its file-to-memory map remains open.

Every disk file was compared with both airshaft snapshots in 16-byte pieces at file offsets divisible by 16, omitting the two-byte PRG load address. None of the eight numbered files had an exact piece in either RAM image. The boot file had two matching pieces at a shared offset, with 111 of its 6,607 payload bytes equal there. This does not rule out transformed or shorter matches; the file-to-memory mapping remains open.
