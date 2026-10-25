# Target Renegade — orientation

## The image

The contributor supplied `Target Renegade [EasyFlash].crt` from OneLoad64 v6 Early Access. The private working copy is `work/target-renegade.crt`; no cartridge bytes or snapshots are distributed with this contribution. SHA-256: `4a15d0ee31f58427723170975a31bd05a900e9a5914bd84f8fc28c742e4ed924`.

The kit cartridge reader identifies `C64 CARTRIDGE`, hardware type 32, name EASYFLASH, EXROM=1 and GAME=0, with eleven banks numbered 0–10. Each has 8 KB windows at $8000 and $A000; bank 2's lower window is all zero. The edition's provenance before OneLoad64 is unknown. No trainer menu was presented and no cheat was selected. The five-life initial value differs from the manual's three.

## From power-on to play

1. Start the installed GUI emulator through `python3 kit/scripts/tools.py --platform c64 vice`. The run used PAL. Its v3.13.2 build passed all 57 `check-emulator` checks on 25 October 2026. No failed-check workaround was needed.
2. Autostart the supplied CRT using `kit/c64/vice.py`'s `autostart()` helper. A hard reset with the cartridge attached also restarts its loader. The loader shows a striped border, a loading message, and a picture before the game's text title. Wait for **PRESS FIRE TO START**, rather than timing a short input from the first black screen. Accelerating the loader with WarpMode is optional; turn it off before play or timing.
3. Hold fire on joystick port **1**. In the measured route, 100 frames carried the title into the first car-park screen; release fire. A preceding 150-frame port-2 fire test left the title unchanged.
4. Pause and save without ROMs, with all inputs released. The private gameplay image is `parts/resident/work/play-round1.vsf`; `reference/stage1.png` shows its state. PC was $A752, $00/$01 were $2F/$35, IRQ vector $FFFE was $AAF0, and NMI vector $FFFA was $A973. RAM vectors $0314/$0318 retained $EA31/$FE47 and are not the active hardware vectors here.
5. To capture the earlier image used for the listing, place a stopping execute checkpoint at $2600, hard-reset the attached cartridge, and wait through the entire loader. The first 40-second real-time wait was insufficient; enabling warp then reached the checkpoint. Check PC=$2600 and CPU-view $00/$01=$2F/$35, disable warp, save without ROMs, and remove the checkpoint. This is `parts/resident/work/entry.vsf` (RAM entry bytes begin `A2 00 BD 46 35 9D 0D 02`).

The listing uses **entry.vsf**, not the play image: the entry preserves initialization bytes around $020D that become game state during play. Entry and play differ in 2,549 RAM bytes, including screen and working state. The six title text rows at $2791–$2832 and the game routines described in this pass agree between them. The title screenshot is `reference/title-ready.png`; the black and incomplete loader captures were kept privately, not used as reference pictures.

## The parts

| Part | Route and state |
|---|---|
| resident: first load, stages 1–3 | Route above; entry and first-stage play snapshots saved. Stages 2 and 3 remain unvisited. Shared code versus stage data has not been partitioned. |
| bank-00 through bank-10 | Recreate each private `work/bank.crt` with `kit/c64/crt.py parts <game> <supplied.crt> --seen-by resident`. Each part records its cartridge windows. Bank contents are registered but unanalysed. |
| second-load: stages 4–5 | The Commodore manual documents this second load. It has no snapshot or listing. Complete stage 3 and let the edition's own loader continue; the EasyFlash bank and destination ranges remain open. |

## Steady state

The processor port $35 exposes RAM under BASIC and KERNAL while keeping I/O visible. Native title initialization begins at $2600; title fire eventually jumps to $8000. Gameplay setup at $AF0F installs the hardware vectors. The IRQ enters $AAF0 and dispatches through a table of return-stack addresses at $AB2F. A captured stage-one frame wrote no IRQ-vector changes: the phases dispatch under a fixed vector.

The recorded frame changed the video bank and screen registers across the playfield/panel split. `frame.py compare` rebuilt all 104,448 pixels identically. Its full memory capture stays private in `work/frame-stage1.json`.

## Cartridge-to-RAM matching

Sixteen-byte informative windows (at least four distinct values) were compared against the entry snapshot. A common offset is a lead, not proof that a whole bank was copied. The table reports matching windows at each chip's strongest offset; offsets mean destination RAM address minus cartridge window address.

| Bank | $8000 chip: offset / matches | $A000 chip: offset / matches |
|---|---|---|
| 0 | -33959 / 8 | none |
| 1 | none | -40112 / 12 |
| 2 | blank | none |
| 3 | -31511 / 465 | -31511 / 441 |
| 4 | -15127 / 397 | -15127 / 465 |
| 5 | +1257 / 477 | +1257 / 473 |
| 6 | +17641 / 446 | +17641 / 389 |
| 7 | -6743 / 311 | +6057 / 456 |
| 8 | +22441 / 430 | -23638 / 78 |
| 9 | none | none |
| 10 | none | -30676 / 20 |

No bank has been excluded as a duplicate on this comparison alone. A later pass must trace the actual copying and separate loader bytes, copies, and later-load resources before treating the aggregate as a whole-game percentage.

## The loader, in a paragraph

The EasyFlash startup presents a loading picture and installs a RAM image containing the title, game engine, graphics, and sound data. The reached hand-over is $2600 with the cartridge hidden by the processor port. Large matching runs in banks 3–8 identify likely RAM payload copies. The loader's complete bank directory, exact copy ranges, and second-load transition are untraced. This pass does not classify all unmatched bank bytes as compressed data or claim that the play snapshot contains the whole game.
