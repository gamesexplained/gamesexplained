# The Last Ninja — agent history

## 22 November 2026

The previous VICE process had exited after a macOS OpenGL
`CGSGetSurfaceBinding` exception. Starting the installed release through
the kit restored its MCP service. Side 1 booted through Cyberload with
no input. I restored warp after the initial automatic warp ended.
Regenerator2000 opened the first gameplay snapshot, and a snapshot
reload returned the player to the exact coordinates before the joystick
test.

Setting `$02AF` to 1 took the normal transition without completing
the previous chapter. A premature checkpoint at `$BC60` was not a
reliable end-of-load marker. The captures use the visible opening
rooms, chapter letter and gameplay loop. I saved at the Dungeons
load, stopped VICE through the launcher outside the shell sandbox,
then started it and restored the snapshot. The fresh remote monitor
attached Side 2 successfully.

After restoring Wastelands and seeking to its recorded Side 1 tape
position, the reader reached end of tape without loading Wilderness.
Reattaching the tape at byte 630,000 while the reader was still
waiting brought the Wilderness title and playable room back.

## 23 November 2026

Captured all six memory handovers before the first room starts. Compared
the 40 named B–F tape payloads with the buffers returned by the live
reader. Decoded the unnamed A pages separately. The media ledger now
identifies all 54 items, and the Source tab has one resident listing and
six overlays.

Ran the original room renderer on 135 populated slots, probed its
room-edge dispatcher at 115,020 points, and compared all 162 collision
groups with an independent decoder. Matched the outputs of 171 packed
sprite decodes and used VICE to capture seven walking poses. Matched each
of the 12 staged and gameplay tracks against 6,000 native driver steps
and verified the F1 mute edge in VICE.

The precise handover isolates boot assets from the runtime bitmap and
sprite storage that reuse their addresses. The initial screen colours and
bitmap at `$C000`, `$C400` and `$E000` match the tape pages byte for byte.
