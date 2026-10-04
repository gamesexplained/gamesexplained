# Last Ninja Remix — orientation

## Disk and power-on route

The contributor’s I-TAL disks were recovered from repository history into private `work/disk-047.d64` and `work/disk-048.d64`. This capture uses disk 047. Its relevant directory entries are `L.NINJA2 RMX/TSM`, `N.REMIX DEMO/I+T`, `NINJA 3+PLAY/I+T`, and `01.CENTRAL PARK!`.

On a hard-reset PAL C64, resume and autostart disk 047’s first file. Wait for the TSM intro. Hold control-port-1 fire for 60 frames and release; wait for I+T (600 frames sufficed in this run). Hold Space for 60 frames and release; wait for the trainer (600 frames). Both cheat options show NO. Press F7 for 60 frames and release. Wait for the Central Park presentation. Press Space for 60 frames and release, then wait for the level credits after the disk load. Warp may be enabled only for this wait; switch it off before gameplay or timing measurements. At the credits, **port 2 fire**, held 60 frames, starts the room; port 1 fire does not. Release and advance 120 frames. Confirm the isometric park and ninja, then save `work/central-game.vsf` without ROMs, using `pause()` before the save.

VICE MCP 3.13.1 passed 55/57 health checks on 30 September 2026: `pause-at-instruction` and `unpaced-calls` failed. Use the kit pause workaround and paced calls. At the contributor’s request it runs on a virtual display with dummy audio, preserving SID emulation without playing samples. The private `vicerc` sets `Sound=1`, `SoundDeviceName="dummy"`.

## Chosen image and comparison

The supplied Ghidra analysis was a composition, not a stopped machine. In active Central Park, 288 of its 15,889 code bytes differ: 286 in `$0E00–$0F2B`, one at `$1F5B`, one at `$8A0F`. 4,247 of 45,809 data bytes also differ. The game really writes sprite output into `$0C00–$0FFF`; a live store checkpoint traced the write to `$BF02`. The former startup code at `$0E00` is overwritten there. Its stale names/comments and code classification are removed. Other imported annotations remain verification leads.

The listing uses the active `central-game.vsf`, whose bytes and CPU state existed together. Runtime screen `$0400`, bitmap `$2000–$3F3F`, low state and sprite output are excluded from coverage. The packed sprite source pool under I/O is retained as game data. Processor port `$35`, DDR `$2F`; vectors `$0314=$1E06`, `$0318=$1582`; VIC bank `$0000`.

## Scope and rebuilding

One declared load: Central Park, under the interim policy in RFC #124. The Street, Sewers, Basement, Office, Mansion and Final Battle remain open work. No extra state listings or composed binary image are published.

Load the committed symbol map into regenerator2000 on your own gameplay snapshot with `symbols_import.py`, export with `symbols_export.py`, and build with `listing.py <game> work/central-game.vsf`. Snapshots, disk images, projects and the original text export stay in `work/`. `game.json.imported` records the original export hash and unknown models.
