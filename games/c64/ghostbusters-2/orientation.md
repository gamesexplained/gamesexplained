# Ghostbusters II — orientation

The first two scene captures use Censor Design’s 1989 crack, [CSDb release 78781](https://csdb.dk/release/?id=78781), in `work/Ghostbusters2.d64`. That image’s museum file is damaged. The museum capture uses the Jondi/Censor disk, [CSDb release 227946](https://csdb.dk/release/?id=227946), in `work/ghostbusters-ii.d64`. An alternative Censor image, `work/0805b.D64`, has complete Broadway and museum files byte-identical to Jondi’s. `media.json` identifies all three images and their contents. These are cracked releases; their changes cannot automatically be attributed to the publisher.

VICE release v3.13.1 passed 56 of 57 emulator checks. `pause-at-instruction` failed, so scripts use `pause()` in `kit/c64/vice.py`. The machine is PAL. It runs headlessly under Xvfb, started through `env -u DISPLAY -u WAYLAND_DISPLAY python3 kit/scripts/tools.py vice`; sound stays clocked through the file device at `/dev/null`. On this build joystick port 1 pulls `$DC01`, and port 2 pulls `$DC00`.

## From power-on to play

Power-cycle VICE and autostart the Censor disk. Press and release fire on joystick port 1 at the Censor introduction. The loader reaches the title prompt in `work/title-after-1.vsf` and `parts/title/work/entry.vsf`. Space advances to the opening story in `work/story-from-2.vsf`. Pressing fire on port 2 at the story wait loads the airshaft. A stopping execution checkpoint at `$8009` catches `parts/airshaft/work/entry.vsf`. Remove it and continue to the rope state in `parts/airshaft/work/play-clean.vsf`. Warp shortens the loads. A single control-read recording covering this whole power-on sequence remains a follow-up.

`airshaft-route.json` records an ordinary win from that clean play state: all three scoop parts are collected, and success is reached in 1,124 joystick reads. The kit machine and VICE replay reach the same outcome. The route’s frame sequence lasts 2,337 frames in the kit machine. This recording starts from the captured playable state.

The original later-episode captures took an artificial shortcut. From the airshaft play state, setting PC to `$0897` enters its success message without meeting the win conditions. After releasing and pressing port-2 fire, the restored story engine loads the second story. At its fire wait, another press loads Broadway; `$8009` catches `parts/broadway/work/entry.vsf`. After removing the checkpoint, the Broadway prompt accepts fire and reaches `work/play-clean.vsf` in that part. Its listing retains an earlier retry capture, `work/play.vsf`; the route recording uses the clean capture.

`broadway-route.json` records an ordinary win from the clean Broadway state. Its two input streams contain 5,721 joystick reads and 11,443 Space scans. The resource bypass stays zero. Both the kit machine and VICE reach `$C9D5` with supply cursor `$D5` and column pointer `$0AE0`; neither failure checkpoint fires. The kit run lasts 11,438 frames. This closes the episode’s input route from its captured playable state, while the preceding airshaft transition in that capture remains artificial.

The original museum capture similarly began by setting PC to Broadway’s `$C9D5` success path. With the Jondi disk attached to drive 8, release and press port-2 fire, wait for the third story, and press again at its fire wait. A stopping checkpoint at `$8009` catches `parts/museum/work/entry.vsf`; removing it reaches `work/play.vsf`. Attach a disk after loading a snapshot: a snapshot restore can replace the previously attached disk state. The alternative Censor disk supplies the same complete museum file.

## Museum routes

From `parts/museum/work/play.vsf`, repeat two frames down and five frames up 110 times on port 2. This reaches the first safe landing, saved as `work/floor.vsf`. The segment’s 377 joystick reads are in `museum-rope-route.json`; the kit machine replays them to the same landing. Up closes the hands and slows the descent; down opens them and speeds it up.

Advance 120 neutral frames, repeat the same descent sequence for the second Ghostbuster, then advance 120 neutral frames. The resulting floor state is `parts/museum/work/floor-two.vsf`. Space switches the controlled character; Return opens equipment selection. From that floor state, 30 frames up followed by 180 right and two neutral frames reaches the portrait room, saved as `work/alternate-observed.vsf`. Holding left for 90 frames returns to the previous room. These continuations were observed in VICE; they are not a complete museum win recording.

The ending capture is artificial: from the museum floor state, set PC to `$0A16` to enter congratulations, then release and press fire. The loader opens `8*`; its final story wait is `work/ending.vsf`. The complete fight mechanics have separate controlled tests, but a normal winning museum input route and a continuous whole-game recording remain open.

## The Jondi bootstrap failure

Autostart the named `GHOSTBUSTERS II` file on the Jondi disk; a wildcard selects a directory decoration instead. The introduction scrolls “PRESS SPACE TO LOAD”. Space exits it, then a loading screen leads to `BITTE SPACE DRUECKEN`. A further Space press reaches the black-screen failure.

The first loader request passes X=Y=`$30`, the two filename characters `00`. The drive’s code at `$0526/$052E` compares directory filename prefixes with its saved bytes at `$06A5/$06A6`; the captured drive holds `00`, which this directory lacks. At the first return to C64 `$19D0`, the buffer end is still `$1C00`. A following request passes X=Y=`$FF` and returns with the end wrapped to zero and all 58,368 bytes of `$1C00–$FFFF` filled with `$FF`. After the German prompt, the copy at `$0100` XORs those bytes with `$41`, creating an invalid BASIC program filled with `$BE`. A scoped CPU trace follows it into BASIC’s line scanner at `$A544`. This resolves this image’s boot failure; the provenance of the absent file is unknown. Its separate introduction music is verified and playable on the page.

## Named loads and ownership

The shared dispatch at `$0400–$0417` selects eight two-byte patterns, `1*` through `8*`, from `$0497–$04A6`. The game opens them through the KERNAL’s internal OPEN entry `$F3D5`, rather than LOAD. At that checkpoint, `$B7` holds the filename length and `$BB/$BC` its pointer. Observed requests are `1*` for title, `2*` for opening story, `3*` for airshaft, `4*` for second story, `5*` for Broadway, `6*` for third story, `7*` for museum and `8*` for ending. Each wildcard matches one numbered file. The gameplay entries restore the ROM environment, load, write `$1B` to `$D011` and jump to `$8009`; the story entries return to their caller.

The common decompressor at `$0500` was run against every numbered file with two different initial RAM fills. `analyse_unpack.js` and `unpack-map.json` record its segment boundaries and stable output. Every stable output address is represented in its part’s listing. Matching load-time captures establish the airshaft, Broadway and complete museum outputs. Later title/story captures differ in mutable sound-driver state and self-modified operands, as recorded in their facts. Earlier broad write maps included execution around the load; the decompressor results supply the ownership ranges.

The shorter Censor museum file has 15,554 raw bytes, versus 28,376 in the complete file. Its first two segments match; its third differs at 3,158 stable addresses; its fourth exhausts the input. The ledger marks this damaged partial copy. The Censor Broadway output begins at `$0A2A`, retaining the preceding airshaft’s `$0900–$0A29`; Jondi’s writes from `$0900`. `parts/broadway-jondi` owns the differing backdrop and coordinate data, and shares the remaining Broadway code and data.

The Censor boot unpacker writes the complete resident stash at `$D000–$DFFF`. A normal intro fire press was caught at its store `$01A6`, with `$01=$38`; at the first engine entry, all 4,096 bytes matched the later saved stash. An episode transition copies `$D000–$DBFF` to `$1000–$1BFF` and `$DC00–$DFFF` to `$0400–$07FF` before entering `$1000`. `work/resident-copied.vsf` captures that exact handover. The stash is counted once in `parts/resident-stash`; its executing engine is represented by `parts/story-engine`. Each restored story uses that shared ownership chain.

## Scoped machine traces

A persistent drained remote-monitor connection records load/store tracepoints and CPU-history context in `work/traces/`. The logs include instruction addresses, registers and cycle counts around the watched accesses; they are not a continuous bus-cycle trace. Keeping the connection open avoids the old server’s broken-pipe failure. Executed read/write controls verify that each watch is working. CPU reads and VIC display fetches are distinguished; a silent CPU watch cannot show that a sprite is unused.

The earlier artificial Broadway trace explicitly sets `$8016=1` to bypass resource and countdown failure. Its preliminary scroll reset and success observations are bounded to that experiment. The separate ordinary-input recording described above leaves the bypass zero. Raw logs, snapshots, disk images and extracted game programs remain private under `work/`.
