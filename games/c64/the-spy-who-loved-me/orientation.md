# The Spy Who Loved Me — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

A 286,164-byte G64 (GCR) disk image, `007_the_spy_who_loved_me[domark_1990](pal)(!).g64`:
the header reads `GCR-1541`. Disk name `SPY-DISK-BCP`, id `DM`, 683
sectors, none with a bad checksum, and no sector in use that a file does
not hold. Four files:

| File | Blocks | Bytes | Loads at | What it is |
|---|---|---|---|---|
| `SPY` | 2 | 344 | `$02A7` | boot: sets up and loads `S0` through the KERNAL |
| `S0` | 55 | 13,842 | `$2800` | the credits screen (The Kremlin's logo, the credits, Domark's logo) and the loader for `S1` |
| `S1` | 198 | 50,177 | `$0801` | the game, packed: a BASIC line `SYS 2075` and the text `TRILOGIC V3.2` |
| `S2` | 2 | 258 | `$CC00` | a small block loaded with `S1` (see `media.json`) |

`S1` is a frozen machine, saved by Trilogic's Expert cartridge and packed
by its restart routine. That is how this disk was mastered, so the
release itself carries a freezer image: the routine checksums its BASIC
line, copies a decruncher into zero page, unpacks memory, puts back
zero page and the chips, and resumes with an `RTI` built on the stack
page (`$01EF`). It resumes at `$0A03` with `$01` = `$37`. The stack it
returns with holds the interrupt frame (`P` = `$26`, return `$0A03`),
then `$098C` (the return of the `JSR $0A00` at `$098A`), then `$E146`,
BASIC's `SYS`: the game's own BASIC line (`SYS 2064`, `$0810`) is still
at `$0801`. The bytes at `$0A00` are `JMP $0A00`, a loop on itself: the
person mastering the disk ran the game's start-up into that loop, froze
it, and set the resume to the instruction after it, `$0A03`, the game's
own first instruction (`CLD`, `JSR $2885`, then the start-up proper). So
the frozen state is the game's hand-over, before any of its own code has
run, and nothing of the start-up is missing.

## From power-on to play

1. Power-cycle the emulator (a hard reset) and autostart the image. The
   KERNAL types `LOAD"*",8,1` and `RUN`. True drive emulation, VICE's
   default, is enough; no settings file is needed.
2. `SPY` prints `THE SPY WHO LOVED ME.` and loads `S0`, which shows The
   Kremlin's credits screen: `CODE: NEIL HARDING`, `GRAPHICS: TONY WEST`,
   `PRESS SPACE TO PAUSE, C= TO TOGGLE MUSIC. JOYSTICK IN PORT 2.`, the
   copyright lines and Domark's logo. It then shows the loading picture
   (the title, Bond with a pistol, the Lotus underwater, Domark's logo)
   while `S1` loads. With warp on, about two minutes from power-on to
   the game.
3. The game starts straight into scene 1 with the Lotus parked at the
   harbour. Nothing moves until the stick is pushed up; there is no
   title screen in the game itself.
4. Snapshots: `work/entry.vsf`, the hand-over, stopped on `$0A03` (a
   stopping execute checkpoint on `$3E9B`, the restart routine's last
   step, then single steps through its `RTI`); `work/spy-start.vsf`, the
   game waiting at the harbour before the first push.

## Steady state

In play the processor port `$01` holds `$35`: the KERNAL and BASIC are
banked out, the I/O is in. The interrupt vector at `$FFFE` is `$128C`, the
NMI vector at `$FFFA` is `$119E`; the KERNAL's `$0314` still holds `$EA31`
and is not used. Nothing is loaded after `S1`: the game is one load.

## The emulator

`tools.py status`: `release v4.0.0, v4.0.0-linux-x86_64-gui.zip`.
`check-emulator`: 57 of 57 after taking `kit/c64/snapshot.py`,
`check_emulator.py` and `r2000.py` from the kit fix made on another
branch (VICE v4.0.0 moved the RAM in a snapshot; see `kit-feedback.md`).
Before that, `checkpoints-survive-load` and `snapshot-ram-offset` failed.

## The loader, in a paragraph

`SPY` loads `S0` through the KERNAL. `S0` draws the credits, then the
loading picture, and loads `S1` (and `S2`) with the KERNAL's own LOAD.
`S1`'s restart routine, from Trilogic's Expert cartridge, unpacks the
frozen machine and resumes it at the game's first instruction. Not
annotated further, by policy.
