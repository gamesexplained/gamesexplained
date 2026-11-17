# The Living Daylights — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two images were supplied, both G64 files (the header reads `GCR-1541`):

- `007_the_living_daylights[domark_1987](pal)(!).g64`: the Domark UK
  release, disk name `DAYLIGHTS 200787`. This is the one analysed. Its
  directory lists `AS` (the boot program, `$02A7`), `GM1` (the loader,
  `$8000`), `TLD1` to `TLD8`, with block counts of 1 to 10 that are not
  the files' real lengths, and 399 sectors no file holds.
- `007_the_living_daylights[melbourne_house_1987](ntsc).g64`: the
  Melbourne House release, disk name `BOND`. It holds the same files under
  other names (`LOCD`, `GR`, `DE`, `LAST`, `HID`, `COLOR`, `PIC`), with
  their real block counts, and no `GM1` or `TLD8`.

| PAL file | NTSC file | Loads at | Bytes | In memory at the hand-over |
|---|---|---|---|---|
| `AS` | `BOND` | `$02A7` / `$0101` | 101 / 255 | boot program, overwritten |
| `GM1` | (none) | `$8000` | 1137 | the loader, overwritten by play |
| `TLD1` | `LOCD` | `$0400` | 16361 / 16360 | the program, stored encrypted; decrypted in place by the loader (the PAL file's bytes are found nowhere in memory) |
| `TLD2` | `GR` | `$4800` | 12800 | whole at `$4800` (12747 of 12800 bytes equal in play) |
| `TLD3` | `DE` | `$E000` | 8006 / 7927 | whole at `$E000` (PAL); the NTSC file differs |
| `TLD4` | `LAST` | `$8D00` | 5888 | whole at `$8D00` at the hand-over; the game copies most of it to `$D000`, under the I/O chips |
| `TLD5` | `HID` | `$A400` | 11264 | whole at `$A400` (PAL); the NTSC file shares 2289 bytes |
| `TLD6` | `COLOR` | `$D800` | 1000 | the loading picture's colours |
| `TLD7` | `PIC` | `$5C00` | 9024 | the loading picture (screen and bitmap), overwritten by play |
| `TLD8` | (none) | `$C800` | 317 | a routine the loader calls first; its answer is the key passed to the decryption |

## From power-on to play

1. Hard reset, attach `tld-pal.g64` with true drive emulation, autostart
   the first file (`AS`).
2. After about 8 seconds: "VERSION UK ... GMA87 / WOULD YOU LIKE TO USE
   THE FAST LOADER? (Y/N)?". Press `Y`.
3. The loading picture appears (Bond, the cast and the Aston Martin,
   with the Domark logo) about 15 seconds later; the title screen about
   45 seconds after the key.
4. Title screen: press `F7`. Play begins on level 1, Gibraltar, after
   the level intro screen. Joystick in port 2.
5. Snapshots: `work/entry.vsf` is the hand-over (a stopping checkpoint on
   `$80C8`, the loader's `JMP $1100`, then one step: PC `$1100`, `$01` =
   `$37`). `work/play-gibraltar.vsf` is play on level 1 (`$01` = `$35`).

The listing is built from `work/entry.vsf`: it holds `TLD4` at `$8D00`
and the loader's tables that play overwrites with work areas.

To reach any level: load `entry.vsf`, set a stopping checkpoint on
`$110C` (the call of the level intro), press `F7`, and at the stop write
the level (0 to 7) to `$012E`; 8 shows the ending. Writing `$0150` keeps
the lives up.

## Steady state

- `$01` = `$35`: I/O visible, BASIC and the KERNAL banked out, RAM at
  `$A000`-`$BFFF` and `$E000`-`$FFFF`.
- IRQ vector `$FFFE` = `$3F1F`; NMI vector `$FFFA` = `$3B56`; the KERNAL
  vectors at `$0314` hold `$744A`.
- Code that ran in play: `$1100`-`$3FCE`, `$7080`-`$77D3`, `$A000`-`$ACCA`
  (code map from all eight levels, the Q branch screen, the ending).
- Nothing is reloaded: the drive is not used after the hand-over.

Emulator checks failed on this build (v4.0.0, Linux): `checkpoints-survive-load`,
`snapshot-ram-offset` (the RAM moved in the snapshot; `kit/c64/snapshot.py`
walks the modules).

## The loader, in a paragraph

`AS` copies itself down, loads `GM1` to `$8000` and runs it. `GM1` asks
about the fast loader, points the NMI at itself, loads `TLD8` to `$C800`
and calls it, keeping the value it returns. It then loads the loading
picture (`TLD7`, `TLD6`), shows it as a multicolour bitmap, loads `TLD1`,
`TLD3`, `TLD5`, `TLD4` and `TLD2`, decrypts the program with the value
`TLD8` returned (`$813E`), restores the KERNAL vectors from the ROM's
table at `$FD30`, and jumps to `$1100`. Not annotated further, by policy.
