# The Last Ninja — orientation

## The images

Both supplied sides have a `C64-TAPE-RAW` header and format byte 1.
Side 1 is 1,258,393 bytes and Side 2 is 928,380 bytes. Side 1 shows a
Cyberload banner during boot. Its commercial release is unidentified.
The SHA-256 digests are in [`media.json`](media.json).

The kit finds the initial KERNAL program at `$029F–$033A` and its
header at `$033C–$03FB`. The rest of Side 1 uses pulses most commonly
472 and 912 cycles long. The game-specific ledger decodes 257
checksum-bearing cold-boot blocks and 40 checksum-bearing named files.
The named files replace the tentative page detections made by the
generic tape scanner on Side 2.

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

## Chapter loads

From any of the first five playable captures, set `$02AF` to `$01`
in the debugger and resume. This takes the game's own end-of-chapter
branch. Leave PLAY engaged. Use warp during the load and switch it
off when Armakuni appears in the new chapter. This route skips the
gameplay between loads, so the captures do not establish which items
would carry over during a playthrough.

After Palace Gardens, that branch entered the tape reader at `$0448`
with Side 1 at end of tape. Attach `work/side-2.tap` at the beginning
and press virtual PLAY. In this run the monitor needed a restart.
Saving `work/before-side2.vsf`, restarting VICE, restoring that
snapshot, then using `vice.tape()` to attach Side 2 resumed the load.

The files below are in each chapter's `parts/<id>/work/`. Positions
are byte offsets into the TAP pulse stream, after the 20-byte header.
They come from the VICE snapshot's TAPE module.

| Chapter | Side | Position in play | Snapshot |
|---|---:|---:|---|
| Wastelands | 1 | 638,541 | `play-wastelands.vsf` |
| Wilderness | 1 | 948,389 | `play-wilderness.vsf` |
| Palace Gardens | 1 | 1,258,373, end of tape | `play-palace-gardens.vsf` |
| Dungeons | 2 | 309,064 | `play-dungeons.vsf` |
| Palace | 2 | 617,632 | `play-palace.vsf` |
| Inner Sanctum | 2 | 928,360, end of tape | `play-inner-sanctum.vsf` |

A snapshot saved through the regular MCP command omits the TAP image.
Use a continuous boot for transitions within a side. For the
Wastelands-to-Wilderness transition alone, attaching Side 1 at offset
630,000 while the loader was waiting also worked. Starting at the
Wastelands snapshot's recorded offset missed that load.

The handovers are in each chapter's `work/entry.vsf`. Wastelands stops
at `$5420`, the cold-boot jump to `$BC60`. Chapters B–F stop at
`$CF11`, which also jumps to `$BC60` after the final tape file.
The Palace Gardens handover differs from the playable snapshot at
4,612 RAM addresses. The listings use the handover bytes and use the
play snapshots to help identify runtime changes.

The live tape trace stops at `$CF6F` after each named file is read.
The destination and end pointer equal the tape header's address and
address plus length for all 40 files. The buffers at those stops
agree byte for byte with the decoded payloads. At each handover,
segments 2–7 also match their final destinations:

| Segment | Destination at handover |
|---|---|
| 2 | `$DF00–$DFFF` then `$FF40–$FFF7` |
| 3 | `$D800–$DC7F` |
| 4 | `$CC00–$CE7F` |
| 5 | `$9E00–$AFFF` |
| 6 | `$0600–$53FF` |
| 7 | `$B000–$BFFF` |

Segment 0 plays the loading music. Segment 1 supplies the loading
picture. Later reads reuse both of those staging areas. The resident
engine at `$5400–$9DFF` and the tape-transition code at
`$CE80–$CFDF` match in every handover.
