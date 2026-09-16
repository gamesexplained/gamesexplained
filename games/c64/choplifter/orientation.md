# Choplifter — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/choplifter.d64`, a 174,848-byte disk image. The directory shows a disk
named `WWW.C64HQ.COM` holding one program:

| Name | Type | Blocks |
|---|---|---|
| `CHOPLIFTER` | prg | 66 |

The program loads at `$0801` and ends at `$4904`. `$0801` is a one-line
BASIC program, `SYS 2064`, and `$0810` is a 24-byte copy loop that moves
`$0900`-`$48FF` up to `$8000`-`$BFFF`, writes `$36` to `$01` and jumps to
`$959C`.

What it copies is a **16 KB cartridge image**. `$8000`/`$8001` and
`$8002`/`$8003` are the cartridge cold and warm start vectors, both
`$9593`, and `$8004`-`$8008` holds the `CBM80` signature that makes a C64
start a cartridge on reset. The disk file is that cartridge with a loader
bolted on the front, and the loader enters at `$959C` rather than at the
cartridge's own `$9593`. There is no trainer, no cracktro and no
decompression. Nothing identifies a cracking group.

The game's own title screen is the only build marker: `BRODERBUND SOFTWARE
PRESENTS`, `CHOPLIFTER!`, `DAN GORLIN`, `DANE BIGHAM`, `(C) 1982`.

## From power-on to play

1. Attach the image to drive 8 and autostart it. On a PAL C64 with a 1541
   the load takes about 40 seconds. Autostart leaves the emulator in warp
   mode; turn warp off before timing anything.
2. The title screen appears and stays. There is no attract demonstration.
3. Press **fire on joystick port 1**. Play starts at once, with the
   helicopter parked at the base.

Getting fire into the machine is the awkward part of this game. The
vice-mcp `vice_joystick_set` tool only drives CIA1 port A (`$DC00`, control
port 2); called for the other port it reports success and changes nothing,
and `vice_keyboard_matrix` did not move `$DC01` either. Choplifter reads
control port 1 at `$DC01`. The way in is to make CIA1 port B an output and
write the port directly:

```
python3 - <<'PY'
import sys, time
sys.path.insert(0, 'kit/scripts')
from vice import connect, stick_arm, stick, FIRE, UP, LEFT
rpc = connect()
stick_arm(rpc)          # DDRB = $1F, so writes to $DC01 are what the game reads
stick(rpc, FIRE); time.sleep(0.2); stick(rpc, 0)
PY
```

`stick_arm`, `stick` and `stick_release` are in `kit/scripts/vice.py`. Bits
are the standard ones, active low: 1 up, 2 down, 4 left, 8 right, 16 fire.
Leaving bits 5-7 as inputs keeps the keyboard columns the game shares that
read with.

## Snapshots

| File | State |
|---|---|
| `work/play-inflight.vsf` | first sortie, helicopter airborne over the base, nothing carried. **This is the snapshot everything downstream is read from.** |

Saved without ROMs. The 64 KB RAM image then starts at file offset 209.
Checked against two bytes of the game's own code at `$9760` and `$8010`
rather than against `$0000`/`$0001` or the screen. `$8000`-`$BFFF` in the
snapshot is byte for byte identical to the copy on the disk, so the program
never modifies itself and the cartridge image can be read either way.

## Steady state

- **Banking.** `$01` is `$36`: BASIC ROM switched out so the game owns
  `$A000`-`$BFFF`, I/O visible, KERNAL ROM still in. The game calls the
  KERNAL's keyboard scan at `$FF9F` from its own interrupt handler.
- **Vectors.** `$0314` points at `$99F2` and `$0318` at `$9AAB`. The
  hardware vectors at `$FFFA` still hold their KERNAL values, so interrupts
  arrive through the ROM and out through the RAM vectors.
- **Interrupts.** A raster interrupt, enabled at `$A79E`. The handler at
  `$99F2` reads `$D012` and switches the display mode at raster `$1E`,
  `$51`, `$81`, `$91`, `$A9` and `$E0`.
- **Video.** Multicolour bitmap for the play area, standard character mode
  for the bar at the top. No hardware sprites at all: the game never writes
  `$D015` and it reads `0` during play.
- **Double buffering.** Two complete copies of the display, one per VIC
  bank. Bank 0 has its video matrix at `$0400` and its bitmap at `$2000`;
  bank 1 has them at `$4400` and `$6000`. `$8D16` toggles bit 6 of `$0F`,
  which is added into the high byte of every bitmap row address, and
  `$8D1F` writes the matching bank into `$DD00`.
- **Where the code and data sit.**

  | Range | What |
  |---|---|
  | `$0000`-`$00FF` | the game's zero page variables |
  | `$0400`-`$07E7` | video matrix, bank 0 copy |
  | `$0800`-`$08FF` | the disk loader's BASIC line and copy loop, dead after the copy |
  | `$0A00`-`$0B47` | bitmap row address tables, low bytes then high bytes |
  | `$0B50`-`$0D02` | actor records and game state |
  | `$2000`-`$3F3F` | bitmap, bank 0 copy |
  | `$4400`-`$47E7` | video matrix, bank 1 copy |
  | `$5000`-`$57FF` | character set for the top bar in bank 1 |
  | `$6000`-`$7F3F` | bitmap, bank 1 copy |
  | `$8000`-`$8008` | cartridge header |
  | `$8009`-`$809E` | 75 shape pointers |
  | `$80A1`-`$8A8A` | 75 shape bitmaps |
  | `$8A8B`-`$BFFE` | the engine: code, tables and text |

  Everything from `$0900` to `$48FF` still holds the loader's copy of the
  cartridge when play begins, and the bitmap and the row tables are laid
  down on top of it. Nothing reads it again.

- **No overlays.** The whole game is resident. The disk is not touched
  again after the load, so one snapshot covers every state.

## The loader, in a paragraph

`$0810` is the entire loader: a 16 KB `lda ($FE),y` / `sta ($FC),y` copy
from `$0900` to `$8000`, `lda #$36 / sta $01` to swap the BASIC ROM out for
the RAM the top half of the cartridge needs, and `jmp $959C`. It does not
decompress, patch, or check anything, and it is not annotated further.
