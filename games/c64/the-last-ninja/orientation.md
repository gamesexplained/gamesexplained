# The Last Ninja — orientation

## The images

Both supplied sides have a `C64-TAPE-RAW` header and format byte 1.
Side 1 is 1,258,393 bytes and Side 2 is 928,380 bytes. Side 1 shows a
Cyberload banner during boot. Its commercial release is unidentified.
The SHA-256 digests are in [`media.json`](media.json).

The kit finds the initial KERNAL program at `$029F–$033A` and its
header at `$033C–$03FB`. The rest of Side 1 uses pulses most commonly
472 and 912 cycles long. VICE plays that section through Cyberload.
The tape scanner does not decode it.

| Extracted item | Bytes equal at load address in play | Aligned 16-byte pieces found in play RAM |
|---|---:|---:|
| KERNAL program | 36 of 156 | 1 of 9 |
| KERNAL header | 7 of 192 | 0 of 12 |

A search of the play snapshot found neither item whole.

## From power-on to play

1. Start VICE x64sc in PAL mode, power-cycle it, and wait at the BASIC
   prompt. Autostart the supplied `work/side-1.tap`.
2. Wait for the black Cyberload screen with yellow loading text.
   VICE disables its automatic warp after the initial load. Turn warp
   back on to speed up the rest of the tape.
3. Leave the virtual Datasette playing. The ninja-eyes loading screen
   and striped border give way to the opening Wastelands scene with
   Armakuni at a fork. The game reaches this scene without keyboard or
   joystick input. A repeat cold boot at warp reached it after 72.8
   seconds and produced the same screenshot byte for byte.
4. Disable warp and pause at an instruction boundary. Save a VICE
   snapshot with ROMs excluded. The first capture is
   `work/play-wastelands.vsf` and its matching picture is
   [`reference/wastelands-start.png`](reference/wastelands-start.png).

For a check, load the snapshot, hold right on control port 2 for 24
PAL frames, and release it. The coordinates in `$D002/$D003` move
from `$6C/$82` to `$84/$83`. Reloading the snapshot returns them to
`$6C/$82`.

## Steady state

The CPU port registers read `$2F/$25` at `$00/$01`. KERNAL ROM is
banked out and I/O is visible. The active hardware IRQ vector at
`$FFFE` points to `$554D`. The RAM IRQ vector at `$0314` holds
`$5533`. Both the hardware NMI vector at `$FFFA` and the RAM NMI
vector at `$0318` hold `$5616`.
The first frame trace after the capture showed no changes to those
vectors. The installer and the loader-to-game hand-over are open.

VICE v3.13.2, macOS arm64 GUI release, passed 55 of the kit's 57
emulator checks. `determinism-restart` reported eight bytes different
after 100 passes and `keys-matrix` missed F1. Host-key events,
joystick input and saving and loading snapshots within the session
passed. Regenerator2000 0.9.20 opened the capture as a 65,536-byte
Commodore 64 image.

## Later loads

The [cassette manual](https://heechee.net/c64/ninja/manual1.php) says
that sections load automatically with PLAY left engaged and that the
game prompts for the second tape. The exact boundaries between those
loads and the resident code are open.
