# Big Trouble In Little China — orientation

How to get from the contributor's own copy to the analysed state.

## The image

A 174,848-byte D64 disk image whose disk name is `WWW.C64HQ.COM`, id `00`, 683 sectors, none with a bad checksum. Its directory holds one file, `BIG TROUBLE/BOG.`, a program of 185 blocks (46,944 bytes) that loads at `$0801`. No sector is in use that a file does not hold. The image is a crack, not the original disk: the program starts with the BASIC line `2075 SYS 2075` followed by the text `TRILOGIC V2.9`, and it is a packer, not the game.

The packed program is a frozen state. A freezer-style crack stored the whole machine as it stood on the title screen (memory, colour memory, video, sound and CIA registers), and the unpacker puts it all back and jumps into the game's title loop at `$11FE`. Because of that, the game's own loader, its copy protection and its start-up code are not in the image at all.

## From power-on to play

1. Power-cycle the emulator and autostart the disk image. The KERNAL types `LOAD"BIG TROUBLE/BOG.",8,1` and `RUN`. Wait about 30 seconds. The screen stays on `READY.` / `RUN` while the program unpacks, then the title picture appears: the film's logo above three framed portraits of the heroes.
2. Press fire on **joystick port 1** (the title loop reads CIA 1 port B, `$DC01`, bit 4, in `$11F6`). The street scene appears and play starts within a few seconds. The space bar did nothing there.
3. In play the stick is on **port 2** (`$1AE4` reads `$DC00`). Left walks the group left and the street scrolls to the right.
4. Snapshots in `work/`, both saved without ROMs: `entry.vsf` is the hand-over, taken at the first instruction after the unpacker's last return (`$11FE`, the title loop); `play-level1.vsf` is the first street, a few seconds after fire, with the group at the right of the screen.

The unpacker, in order: `$081B` copies its own working code to the zero page (`$0008-$00FF`) and unpacks the main block from `$BF5E` downwards with a run-length scheme; a small stage at `$0490` checks two marker bytes in the stack page and either runs the unpacker again or goes to `$094B`; `$094B` restores colour RAM, the video, sound and CIA registers from saved tables, sets the stack pointer and runs the unpacker once more over the rest of the image; its last `RTS`, at `$009C`, returns into the game at `$11FE`. This was found with a stopping checkpoint on `$009C`, then on `$094B`, then the same `$009C` again; it is not annotated.

## Steady state

- Processor port `$01` is `$35` while the game runs: RAM everywhere, I/O visible, no ROMs.
- The game uses two video banks and flips between them every frame. `$0A68-$0A6D` toggles bit 0 of `$DD00`, and `$0A73-$0A7C` then points the IRQ vector (`$FFFE/$FFFF`) at the sprite multiplexer for the bank now shown. The two handlers are `$0622` (sprite pointers in the screen at `$8BF8`) and `$0763` (sprite pointers at `$CBF8`). The hardware IRQ vector read `$0622` on the title screen and `$0763` in play on the first read, so the two alternate.
- The IRQ is a raster interrupt chain of about 13 stops per frame that re-uses the eight sprites down the screen.
- Joystick port 2 is read at `$1AE4`; sound effects are written to the SID from `$2AA6`.

## The loader, in a paragraph

The disk's one program is a Trilogic packer wrapped around a frozen machine state. Everything the game needs sits in the image already, so no parts and no overlays were seen in play; the game is one load of the 64 KB address space.
