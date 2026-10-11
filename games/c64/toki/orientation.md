# Toki — orientation

## The emulator

VICE MCP 3.13.2, the release zip (`v3.13.2-linux-x86_64-gui.zip`).
`check-emulator` passed 57 of 57 on 2026-10-08; no workarounds needed.

## The image

`work/toki.crt`, 131,392 bytes. Its header says: a CRT image named TOKI,
hardware type 5 (Ocean type 1), EXROM and GAME both 0, then sixteen 8 KB
chip packets for banks 0 to 15, each loaded at $8000. Bank 0 begins with
the cold start vector $812C and the CBM80 signature at $8004. Whether this
dump matches the shop release is unknown; nothing in it looks like a
crack or trainer.

## From power-on to play

1. Hard reset, then autostart `work/toki.crt`.
2. The title screen appears after about four seconds of warp
   (`work/title.vsf`, `reference/title.png`).
3. Fire on joystick port 2: the stage card, "LABYRINTH OF CAVES" with SFX
   and MUSIC (`reference/stage-card.png`).
4. Fire again; after about three seconds of warp stage 1 is in play.
   Snapshot `work/play-round1.vsf`, the one the listing is built from.

## The hand-over

An execute checkpoint on $0200-$7FFF from the reset stops first at $51FB,
called with a JSR at $8000: by then the cartridge's start-up has copied
the game into RAM. `work/entry.vsf` is saved there. It matches the play
snapshot at $4000-$64FF and $8000-$BCFF; the rest (zero page, $0400-$3FFF,
$6500-$7FFF, $BD00 up) is filled in later, so the play snapshot is the
fuller image.

## Steady state

- `$01` = $35 during play: RAM at $A000-$BFFF and $E000-$FFFF, I/O at
  $D000. The cartridge stays plugged in (EXROM and GAME low) but the CPU
  sees RAM at $8000-$BFFF; RAM there matches bank 3 in 8,004 of 8,192
  bytes at $8000.
- The video bank is $C000-$FFFF ($DD00 = $C0), screen at $CC00 during the
  stage card, $D018 = $31.
- Interrupts: the hardware vector $FFFE is rewritten twice a frame. A
  frame recorded with `kit/c64/frame.py capture` shows $837E written on
  line 248 and $BCE1 on line 216: two raster handlers, the second split
  being the status bar. $0314 holds $80F9.
- The main loop waits at $819B-$819E (every PC sample landed there).
- Text the game prints (stage names, STAGE CLEAR, GAME OVER) is stored in
  cartridge bank 0, not in RAM, so the game banks the cartridge back in to
  read it; the bank register is $DE00 (the start-up writes $8D there,
  bank 13).

## The loader, in a paragraph

There is no loader: the cartridge's cold start at $812C copies the game
from its banks into RAM and calls $51FB, which clears $C480-$C53F, fills
$44E1-$45A0 from a 192-byte copy loop and selects bank 13. Not
annotated further.
