# Fantasy World Dizzy — orientation

## The image

Dunex disk release from CSDb release 200158. The download is a 174848-byte sector disk image, not a GCR image. SHA-256: `7c679a8f4ce1389af527de0a11be087c0a91057230aacc9c8555230b3dbdead3`. Its directory contains one PRG, `F.W.DIZZY /DUNEX`, 44434 bytes including its $0801 load address. The disk reader reports no allocated sectors outside that file.

## From power-on to play

1. Hard-reset VICE, then autostart the disk's first file. Use warp for loading.
2. Wait for the DUNEX intro. Hold SPACE until the intro exits, then release it. There was no trainer choice.
3. The game begins at $190E. A stopping execute checkpoint there captured `work/entry.vsf` before its first instruction. The processor port reads $37 at this stop.
4. Resume to the title. Disable warp and hold joystick port 2 fire until the Castle's Dungeon appears, then release it.
5. Pause and save without ROMs as `work/play.vsf`. The title and first room are in `reference/title.png` and `reference/play.png`.

## Steady state

PAL, VIC 6569 and SID 6581. Processor direction $2F, port $36: BASIC is hidden, KERNAL and I/O visible. IRQ vector $0314/$0315 is $2B49. The handler calls $0B01 except on one of every eight interrupt counts and chains to KERNAL $EA31. RAM beneath KERNAL contains dialogue, read with $01=$34 and interrupts disabled. Hardware vectors in RAM contain text and are not the active KERNAL vectors.

The main loop begins at $1A25; it calls a busy delay at $31D6. The opening play snapshot was stopped inside that delay. Its stack identified the caller at $1A7A. A frame capture rebuilt all 104448 screenshot pixels exactly; the captured frame had zero video-register writes. Entry versus play differs in 6351 RAM bytes, including live object tables and drawn bitmap output. One disk file supplies the load; classification of retained loader bytes and other allocations remains open.

## Tools

The preinstalled headless VICE runs through the kit launcher, with a local executable wrapper adding `-sound -sounddev dummy`. The emulator check passed 56 checks. `keys-host` failed; matrix keys and joystick checks passed. The final quirk probe raised `KeyError('checkpoints')` after its reset test, so monitor quirks from that unfinished phase remain unmeasured. Exact stopping, instruction stepping, read/store watchpoints, snapshot determinism and frame advance passed.

The live regenerator2000 session was started on `work/play.vsf`. Export through `symbols_export.py`; do not use its cached project as a source of truth. The snapshot's RAM begins at file offset 209, checked by the emulator test.

## The loader, in a paragraph

The single packed PRG loads at $0801, displays a Dunex introduction, unpacks the game and jumps to $190E. The hand-over checkpoint fired once after SPACE left the introduction. The game's initialisation installs its IRQ and video state before drawing its title. Loader and retained packed bytes require attribution before the memory ledger can be complete; no loader mechanism is claimed as a game discovery.
