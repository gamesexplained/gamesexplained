# Encounter — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`ENCOUNTR.P00`, a PC64-format program file (26-byte `C64File` header,
filename `ENCOUNTR`, then a PRG). Stripping the header gives a 20,263-byte
PRG loading at $0801 ending at $5726. The BASIC stub is one line,
`1001 SYS 2066`, so the machine-code entry is $0812. The program is
crunched: the loader at $0812 installs a decruncher in the stack page
($00FA–$01A0) and the tape buffer ($0333–$03D9) and jumps to $0100. No
trainer, cracktro or menu appears; the title screen credits "Paul Woakes",
"© 1984 Novagen Software". Whether this is the original release or a
cracked copy is unknown: the cruncher is scene-style (self-modifying
page copy, `$01 = $30` all-RAM during depack) and the title screen shows
nothing beyond the publisher's own credits.

The kit works from `work/encounter.prg` (the PRG with the P00 header
removed: `tail -c +27 encounter_0_original.p00 > encounter.prg`).

## From power-on to play

1. Autostart `work/encounter.prg` (`vice_autostart` with the path). The
   loader depacks in under a second; the title screen appears with
   SCORE / LAST SCORE / HIGH SCORE and `F5 NOVICE`, `F7 BEGIN GAME`.
   Turn warp mode off (autostart leaves it on).
2. No loader menu. Snapshot: `work/title.vsf` at the title screen.
3. Press **F7** through the keyboard matrix, held about 2.5 s (the game
   scans the keyboard itself via the KERNAL `SCNKEY` and reads $C5; a
   short tap can be missed). Play begins immediately: a first-person
   cockpit over a green plain with a blue sky, status row `0000000 L1 E11 54`
   (score, level 1, enemies remaining, a countdown), crosshair in the
   centre, black pillars on the horizon.
4. Snapshot: `work/play-level1.vsf`, taken a few seconds into level 1
   with no joystick input given yet. This is the image the disassembler
   is loaded on.

`F5` selects NOVICE before F7; the snapshot was taken at the default
(not novice) setting. Not yet explored.

## Steady state

Observed in `play-level1.vsf`:

| What | Value | Meaning |
|---|---|---|
| `$01` | `$36` | BASIC ROM banked out, KERNAL and I/O in: RAM at $A000–$BFFF holds game code |
| `$0314/$0315` | `$B34E` | IRQ vector in RAM: the game's raster interrupt chain |
| `$0316–$0319` | `$FE66`, `$FE47` | BRK and NMI vectors left at KERNAL defaults |
| `$FFFA–$FFFF` (ROM) | `$FE43`, `$FCE2`, `$FF48` | hardware vectors are the KERNAL's; IRQ goes through $0314 |
| `$DD00` | `$96` | VIC bank 1: $4000–$7FFF |
| `$D018` | `$8F` | screen at $6000, character set at $7800 |
| `$D011` | `$1B` | text mode, 25 rows, screen on |
| `$D01A` | raster bit set | raster IRQ enabled; `$D012` = 255 at the sampled moment |
| CIA1 ICR | all sources disabled by `$DC0D = $1F` at $9F16 | only the raster interrupt runs during play |

The IRQ handler at $B34E is a chain of short stages: each stores a
colour into `$D021`, rewrites `$0314` to the next stage and `$D012` to
the next raster line, acknowledges, and returns. That is how the sky,
horizon and ground bands are drawn on a plain text screen.

Program counter samples during play scatter over $ADxx–$B8xx, so the
main loop lives in the block under the banked-out BASIC ROM. The init
code is at $9C00. Nothing is reloaded from disk: the whole game is
resident after the single depack, and the title screen returns without a
reload.

## The loader, in a paragraph

`SYS 2066` runs $0812: `SEI`, `$01 = $30` (all RAM), copy 166 bytes from
$082A to $00FA and from $08D0 to $0333, then `JMP $0100`. The
decruncher in the stack page and tape buffer expands the packed data
downwards from $55E5 over $0801 onwards, and finishes at $0960. That
routine is a self-modifying page copy that moves the whole depacked
image up by $3000 (every page $0D→$3D, $0C→$3C ... wrapping) and jumps to
$9C00. The init at $9C00 copies 34 pages from $3E00 down to $1E00,
writes the vector pair $9C3E into $8000–$8003, calls the KERNAL
`IOINIT`, copies 160 bytes of initial variables from $8B00 into zero
page $02–$A1, sets `$01 = $36`, selects VIC bank 1, and enters the title
screen. Two checkpoints (at $0960 and $9C00) each hit exactly once on a
fresh run, which is how the chain was confirmed. Not annotated further,
by policy.

## Emulator notes from this run

Loading `play-level1.vsf` back with `vice_snapshot_load` after a hard
reset and a second autostart came back with `$01 = $37`, the CPU in the
KERNAL screen-scroll routine and a garbage screen. Autostarting the PRG
again and pressing F7 is faster and reliable; the snapshot file itself
is fine for the disassembler and for offline sweeps.
