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
