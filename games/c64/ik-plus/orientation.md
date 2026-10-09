# IK+ — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`ik_plus[system3_1987](!).g64` from the C64 Preservation Project 10th
Anniversary Collection on the Internet Archive (the collection's G64 zip,
file `c64pp-g64-zip/i/ik_plus[system3_1987](!).zip`; the `(!)` is the
collection's mark for a verified dump), fetched on 9 October 2026 at the
contributor's request. 294,094 bytes, SHA-256
`00cf11d6c6859314090879b92e395fba2b6061a6ee6125c3e89a89bd4904a372`.

The header reads `GCR-1541`, version 0, 84 half-track slots (42 tracks),
largest track 7,928 bytes: a bit-level image of the original disk, not a
sector image. That matters: the protection reads track 41 as raw bits
(below), which a sector image cannot hold.

The disk is System 3's original release, with no trainer or crack. Its
directory, as VICE's `c1541` lists it (the names hold control codes,
shown as `.`):

| Blocks | Name | What it is |
|---|---|---|
| 0 | `loader` | the autostarting boot loader, `$02A7`-`$03FF` |
| 664 | `.blocks free.???` | a fake entry; no file |
| 0 | `loader2`, `protection` | fake entries whose chains run round the disk |
| 6 | one byte, `$00` | stage two, loaded to `$F000`-`$F4FF` |
| 12, 18, 18, 185 | `c`, `m`, `x`, `p` | the game: `$F150`-`$FD1F`, `$E000`-`$F147`, `$BF00`-`$D000`, `$0840`-`$BEFF` |
| 61, 35, 3, 9, 9, 2 | `p1`-`p6` | the loading picture and its display code |
| 1 | `b` | the last loader stage, `$010A`-`$015F` |

The block counts of the first three entries are false: the directory
shows 0 for files that load hundreds of bytes.

## From power-on to play

On VICE 3.13.2 (vice-mcp release, Linux x86_64), default settings: true
drive emulation of a 1541, no `vicerc`.

1. Power-cycle, attach the G64 to drive 8 and autostart it
   (`LOAD"*",8,1`). The screen goes black with `INT. KARATE +` in white
   at the top left.
2. **The protection decides whether the boot goes on.** About ten seconds
   in, the drive steps to track 41 and the C64 either goes on loading or
   resets to the `READY.` prompt. In VICE this is a lottery: of seven
   boots on 9 October 2026, one passed. Why is in the loader paragraph
   below. When the machine comes back at `READY.`, autostart again.
   A run can stop on the verdict instead of watching for it: a stopping
   checkpoint on `$C0F5` (the compare), then read `$C0FF`; `$C2` is a
   pass. `work/scripts/try_boot.py` loops boots until one passes.
3. On a pass the loading picture (a fist and the IK+ logo) appears,
   then the screen blanks, then the game starts in its attract mode: a
   demo fight and the "TOP 30 SCORES" table. In warp mode the load from
   the pass to the attract mode takes about a minute of host time.
4. **F1** (held for half a second) starts a one-player game. The fight
   begins at once: white fighter (the player, joystick in port 2) on the
   left, red and blue computer fighters, `TIME 29`, `LV 01`, `WHITE`.
5. Snapshots, all saved without ROMs:
   - `work/protection-passed.vsf`: stopped on `$C0F5` with `$C0FF` =
     `$C2`. Attach the G64 again and load this to replay the rest of the
     load without the lottery.
   - `work/entry.vsf`: **the hand-over**, stopped on `$0840`, the game's
     first instruction, after the last loader stage's `JMP $0840` at
     `$0145`. `$01` = `$37`. `listing.py` reads it as the hand-over
     image (`--entry`'s default).
   - `work/start.vsf`: **the analysed image**: `entry.vsf` run on to
     `$0FB8`, inside `game_init`, just after it swaps page `$0C00` with
     page `$3C00` (the file `p` holds the frame interrupt's page at
     `$3C00`). Nothing else differs from the hand-over but a few bytes of
     zero page, the stack and `$FD50`-`$FD57`. **This is the image the
     analysis and the listing are built from**:
     `python3 kit/scripts/listing.py games/c64/ik-plus games/c64/ik-plus/work/start.vsf`.
     `work/scripts/mkstart.py` makes it from `entry.vsf` with a stopping
     checkpoint on `$0FB8`.
   - `work/demo.vsf`: the attract-mode demo fight.
   - `work/play-round1.vsf`: the first round of a one-player game,
     just after F1.

## Steady state

- **Banking:** `$01` = `$35` in play: all RAM, with the I/O chips
  visible at `$D000`-`$DFFF` and both ROMs out. The game owns the
  processor's hardware vectors in RAM at `$FFFA`-`$FFFF`: NMI `$0BE6`,
  reset `$2728`, IRQ `$0904` at the top of the frame. The KERNAL's RAM
  vectors at `$0314` are not used.
- **Interrupts:** the raster IRQ is a chain of six handlers, each writing
  the next one's low byte into `$FFFE` (high byte `$09`): `$0904` →
  `$0910` → `$091C` → `$0928` → `$0966` → `$09D7` → `$0904`, recorded
  with `kit/c64/frame.py capture` on `work/play-round1.vsf`. Each entry
  first tests `$DC0D`: when CIA 1's timer caused the interrupt, it goes
  to `$0934`, which writes the next 4-bit sample to the SID's volume
  register `$D418` (the digitised shouts). The handlers split the screen:
  a multicolour bitmap (the arena picture) from line 66 to 162, text
  mode below it, and the six sprites of the three fighters multiplexed
  in four bands (lines 164, 188, 209 and 230).
- **Video:** bank `$4000`-`$7FFF` (`$DD00` = `$C2`), screen `$6C00`,
  sprite pointers `$6FF8`. The bitmap is at `$4000`.
- **Code and data:** the files `p`, `x`, `m` and `c` land whole at their
  load addresses at the hand-over (step 7 below). `$0840` starts with a
  table of `JMP`s. The game reloads nothing from disk during play.
- **Hand-over or play?** Comparing `entry.vsf` with `play-round1.vsf`
  byte for byte gives 92 differing stretches: variables, zero page and
  the stack, operands the interrupt handlers rewrite, the floor's built
  characters, the sprite memory and the screens (`$5320`-`$6FFF`), and
  three things the first reset changes for good: `decrypt_once`
  (`$1957`) moves code from `$1A40` to `$1015`, blanks `$1A40`-`$1A95`
  and decrypts the pose layouts at `$7E0A`-`$7EFF`. The hand-over holds
  the code as loaded, so it (with the page swap, `start.vsf`) is the
  image to disassemble; `facts.md` ("Start-up") describes what the
  first reset changes.
- **Emulator:** `release v3.13.2, v3.13.2-linux-x86_64-gui.zip`;
  `check-emulator` passed 57 of 57 on 9 October 2026, so no workaround
  applies. Its `HAS`/`NOT` quirks (`read-64k`, `key-lowercase`,
  `snapshot-path`, `reset-paused`; not `read-running`) are absorbed by
  `kit/c64/vice.py`.

## Where the disk's files land

Each file searched for in the hand-over and play snapshots in 16-byte
pieces (`10-orient`, step 7):

| File | Loads to | At the hand-over | In play |
|---|---|---|---|
| `p` | `$0840`-`$BEFF` | all 46,784 bytes equal | 43,748 equal |
| `x` | `$BF00`-`$D000` | 4,352 of 4,353 (the last byte lands on `$D000`, an I/O register) | 4,352 |
| `m` | `$E000`-`$F147` | all 4,424 | 4,321 |
| `c` | `$F150`-`$FD1F` | all 3,024 | 3,008 |
| `b` | `$010A`-`$015F` | 84 of 86 | gone |
| `loader` | `$02A7`-`$03FF` | 143 of 345 | 140 |
| stage two | `$F000`-`$F4FF`, copied to `$C000` | overwritten by `m`, `c` and `x` | |
| `p1`-`p6` | `$0800`-`$43FF`, `$7E00`-`$9FFF`, `$5000`, `$C000`, `$7000`, `$6000` | overwritten by `p` and `x` | |

## The loader, in a paragraph

`loader` loads over the KERNAL's vectors and points the character-output
vector (`$0326`) at `$02B8`, so it runs as soon as `LOAD` prints. It
clears the screen to black and prints `INT. KARATE +`. It then writes
seventeen times to `$DF00`, a cartridge's I/O area, copies its own code
to `$8000` and reads it back (a cartridge ROM answering there would
corrupt it), and starts a CIA 2 timer NMI whose handler is a bare `RTI`,
with the RAM vector at `$FFFA` pointed at it. These look aimed at
freezer cartridges; they were not traced further. It loads stage two
with the KERNAL. Stage two copies itself to `$C000` and sends 256 bytes of drive
code (stored XORed with `$05`) to the 1541 with `M-W`, runs it with
`M-E`, then reads one byte back with `M-R` `$05FF`. The drive code steps
to track 41, waits for 256 bytes in a row that read `$AC`, writes `$C2`
to `$05FF` if it finds them and `$00` if not, and returns to track 18.
The C64 compares the byte with `$C2`, made from a chain of `EOR`s; a
mismatch jumps through `$FFFC` and resets the machine. On a match the
same `$C2` decrypts the next stage into `$033C`, which loads `p1`-`p6`
(the loading picture) with the KERNAL, shows it, then loads `b` into the
stack page and runs it; `b` loads `p`, `x`, `m` and `c`, blanks the
screen after `x`, and jumps to `$0840`.

Track 41 of this image has no sync mark at all: 3,892 bytes of `$56` and
3,243 of `$AC` (with five more `$AC` at the start), the same bit pattern
shifted by one bit between the two runs. A 1541 frames bytes from its
last sync, so on a track with none the framing is whatever it was when
the head arrived. Of the eight possible framings, two read a run of 256
`$AC` bytes (counted over the image with a script) and six read none,
which fits the one pass in seven boots seen in VICE. How the original
disk passed every time on a real drive is not known.

The game itself checks that this loader ran: the stack pointer `b`
leaves (`$0A`) and a byte it leaves at `$010B` are used by three
checks inside the program and to place the key of a decryption
(`facts.md`, "Protection"). A snapshot loaded into a reset machine
keeps them, so the snapshots above play normally.
