# Skate or Die!: Boot, facts

What happens between `LOAD"EA",8,1` and the first instruction of the title
program at `$4000`. Each fact names its evidence:

- **traced**: read in the code (the listing, or for wiped stages the
  bytes as they executed, `work/agent-boot/stage12-exec.txt` in the game's
  work folder);
- **simulated**: observed in the kit's 6502 simulator running the boot from
  `work/entry.vsf` with the emulator's own ROMs (KERNAL 901227-03) and a
  model of the drive's command server on the serial lines
  (`work/agent-boot/run5.js`, `drivebus.js`). The simulated memory at the
  jump to `$4000` equals `play.vsf` in every byte except the processor
  port, the jiffy clock `$A2`-`$A4`, `$F9` and six stack bytes, which is
  the check that the simulation follows the real boot;
- **disk**: read from `side1.g64` (GCR decoded by `work/agent7/g64.py`).

Most of the boot no longer exists when the title starts: stages 1 and 2
are erased at the end. The listing holds what survives in `play.vsf`; the
rest is described here.

## The sequence

1. **The EA file** (disk). The directory (track 18 sector 1) has one
   entry, `EA`, PRG, track 1 sector 6, claiming 2 blocks. The file is one
   sector: link `$00 $FF`, so 254 bytes, load address `$0102`, data
   `$0102`-`$01FD`. The "2 blocks" in the directory is not the file's
   size. The BAM shows 0 blocks free.
2. **Autostart** (simulated). The KERNAL loads the file into the stack
   page; its LOAD returns with RTS at `$F5AE` with SP = `$F7`, pulling
   `$00 $01` from `$01F8`/`$01F9`, the file's alternating `$01 $00` fill
   (`$01D7`-`$01FD`). Control goes to `$0101`, the byte before the file.
   After a cold start that byte is `$38`, the "8" of BASIC's
   `38911 BASIC BYTES FREE` left by the number formatter: a SEC, and the
   processor runs on into `$0102`. After `PRINT 0` or `PRINT 7` the byte
   is that digit (`$30`, `$37`), and EA's code still ran to its `$01`
   fill in those runs (simulated). Other digits are not tested (`$32`
   would be a JAM).
3. **EA's code** (traced, `$0102`-`$01D6`): clear the screen (`JSR $E544`),
   blank it (`$D011` = `$0B`), open the command channel 15, then 17 times:
   `OPEN 2,8,2,"#1"`, send `U1:2,0,1,ss` and `B-P:2,0`, read 256 bytes
   with CHRIN to `$0334` + 256n. The sector number is kept as text and
   stepped from the digit table at `$01A1` ("8901234567890123"), so it
   reads track 1 sectors 07-23. Track 1 has 21 sectors (0-20): the reads of
   21, 22 and 23 fail and CHRIN returns the buffer again, sector 20, all
   `$01`, so `$1134`-`$1433` hold three more copies of it (disk,
   simulated). Then it closes both channels, fills `$0100`-`$01CB` with
   `$01` (erasing itself) and jumps to `$0CD4`. The OPENs after the first
   fail with "file open" and are ignored.
4. **Stage 1** (`$0334`-`$1133`, track 1 sectors 7-20; traced). `$0CD4`
   decrypts `$033A`-`$0CD1` with a running XOR: A = `$0339` (`$EA`), then
   each byte XORed with the previous result, and jumps through `$0344` to
   `$0389`. `entry.vsf` is taken at `$0CD4`, before this.
5. **Stage 2 set-up** (`$0389`, traced, in the listing): copy the KERNAL
   ROM into the RAM under it; write 0 to `$8003` and read it back,
   resetting through `$0334` (JMP (`$FFFC`), the ROM's vector) if a ROM is
   there (a cartridge); NMI and RESET vectors in RAM to `$0954` (an RTI);
   build the logo screen (`$0982`) and bank the ROMs out (`$01` = `$35`);
   CLI. From here the KERNAL calls run from the RAM copy.
6. **Layered decryption** (traced). `decrypt_layer` `$0340` XORs
   `$03BF`-`$0953` with the low byte of its caller's return address. It is
   called from `$03BF` (key `$C1`), `$03D0` (`$D2`), `$03F7` (`$F9`) and
   `$0472` (`$74`); `$03C2` also subtracts `$55` from `$03D0`-`$044F`. Each
   layer reveals the code after the call and scrambles what has run, so no
   single moment holds stage 2 in clear.
7. **Integrity checks** (traced). `$03D3`: XOR of `$0337` (0) with
   `$0100`-`$011F` must be 0, true only if EA's `$01` fill happened.
   `$03E2`: XOR of `$0338` with `$03EF`-`$0422` must be `$3E`. `$0D18`:
   every third byte of `$03D5`-`$0419` XORed into `$033A`-`$033C` must give
   `$1E $62 $B8` (play.vsf holds these). A failure branches into garbage or
   to the wipe-and-return with nothing pushed.
8. **Drive protection check** (traced, simulated, disk). `$05C4` decodes a
   bit stream at `$0E18`-`$0F06`: each symbol is a run of k zero bits, a one
   bit, then one more bit b, and stands for entry 2k+b of the 66-byte table
   `$04C4`-`$0505`. The 185 symbols start with the 182-byte drive routine,
   which goes to drive `$0300`-`$03B5` as 182 `M-W` commands of one byte
   each, in address order (my decoder reproduces the uploaded bytes
   exactly). `M-E $0300` runs it: it queues job `$E0` (execute) for track 2
   and, entered again with the head there, rewrites bits 5-6 of `$1C00` to
   `%01`, then reads raw bytes: a run of `$D7`, an `$EB`, 512 pairs
   `$CC $AD`, then the 12 bytes `55 AE 9B 55 AD 55 CB AE 6B AB AD AF`.
   It ends the job with 1 (found) or 3/4 (not found after three tries).
   Track 2 of `side1.g64` has one sync, then `$D7`s, and the 512 `$CC $AD`
   pairs followed at once by those 12 bytes (bit offset 17444); it has no
   standard sectors. The C64 then reads the job status with `M-R $0000`
   and pulls it into the flags (PLP): bit 0 (carry) must be set; and
   `M-R $0300` must return `$AD` (the routine still there). Otherwise
   `$0956` fills `$0300`-`$0CFF` with `$FF` and jumps through `$FFFC`.
   The simulation passed this by answering status 1.
9. **Drive server** (traced, disk, simulated). `$082C`: delays, CIA 1
   interrupts off and keyboard lines set, `$90`-`$9D` and the KERNAL file
   tables `$0259`-`$0277` cleared, CLALL, then on the command channel
   `UJ` (drive reset), `OPEN 2,8,2,"#0"` and `B-E,2,0,01,01`: the drive
   reads track 1 sector 1 into its buffer `$0300` and runs it. That
   bootstrap (`JMP $0340`) reads track 1 sectors 2-5 into drive
   `$0400`-`$07FF` with four read jobs, retries until all four succeed,
   waits, sets SP = `$45` and jumps to `$0400`, the command server that
   stays in the drive for the whole game (the same bytes as the drive RAM
   in every later snapshot, apart from its self-modified dispatch and
   status). It is never in C64 memory. Then `$DD00` = `$04` and `$DD02`
   bits 3-5 set as outputs for the fast protocol.
10. **Stage 2's own loader** (traced). `$068C`-`$082B` is the same code as
    the resident loader's `set_dest_ptr`..`receive_bytes`, with zero-page
    addressing, plus two changes in the receive: every stored byte is
    XORed with `$A5` (`$07ED`) and each new page stored does `INC $D021`
    (`$07F5`).
11. **Loading stage 3** (simulated). Read track 3 sector 0 raw to
    `$0CD4`-`$0DD2`; its bytes 2-3 (XORed: `$00 $20`) give the load address
    `$2000`. Then read the chain track 3 sectors 0-5 in link mode to
    `$2000` (limit `$CFFF`), storing all of every sector after the link
    bytes, so `$2000`-`$25F1`. The background goes up by one six times
    while the pages fill, from `$06` (blue) to `$0C` (medium grey).
12. **Wipe and hand over** (traced). Push `$1FFF`, `JMP $0CAE`: copy the
    page `$0CC3`-`$0DC2` to `$EF00` and jump there with A = 0. The wiper
    stores 0 from `$0406` (pointer `$02`/`$03` = `$06`/`$04`) to `$1005`
    and returns into `$2000`. `$0400`-`$0405` escape the wipe.
13. **Stage 3** (`$2000`, traced, in the listing): copy `$2100`-`$25FF` to
    `$F230`-`$F72F` (the resident loader), `$01` = `$25`, `load_file`
    file `$00` to `$4000`, `JMP $4000`. The title load sends the disk ID
    command `$0B` "EA" first, then reads track 3 sectors 6-20 and track 4
    sectors 0, 11, 1 (simulated).

## What the boot leaves in memory (play.vsf)

| Range | What | Evidence |
|---|---|---|
| `$01CC`-`$01E8` | EA's last instructions and its `$01 $00` fill | traced |
| `$0334`-`$033E` | stage 1's first bytes (JMP (`$FFFC`), check seeds, `$EA` key, checksum `$1E $62 $B8`) | traced |
| `$0340`-`$03BE` | `decrypt_layer` and stage 2's set-up, in clear | traced |
| `$03BF`-`$0405` | stage 2 code, scrambled | traced |
| `$2000`-`$2033` | stage 3 | traced |
| `$2034`-`$20FF` | unused bytes of the stage 3 file (never read) | simulated read map |
| `$2100`-`$25FF` | the loader image (`$2524`-`$25F1` is junk after the file's end in its last sector, the DOS link says 48 bytes) | disk, traced |
| `$C000`-`$C3FF` | the EA logo screen: rows 8-14, columns 9-30, characters `$01`-`$30` | simulated, play.vsf |
| `$C800`-`$C987` | the logo's 49 hires characters | simulated, play.vsf |
| `$E000`-`$FFFF` | the KERNAL ROM copy, except the following | play.vsf vs ROM file |
| `$EF00`-`$EFFF` | the wiper, then the raw copy of track 3 sector 0 | traced, play.vsf |
| `$F230`-`$F72F` | the resident loader; `$F654`-`$F72F` the junk tail | traced |
| `$FFFA`-`$FFFD` | NMI and RESET vectors, `$0954` | traced |

The event manager (`$F730`, file `$0B`) is **not** loaded by the boot:
at the title's start `$F730`-`$FFF7` is still the KERNAL copy (play.vsf
matches file `$0B` in 30 of 2248 bytes, the KERNAL ROM everywhere there).
The title, or a later program, loads it.

## Graphics

- Screen `$C000`, characters `$C800`, VIC bank 3 (`$DD00` bits 0-1 = 0,
  `$D018` = `$02`), hires 40 columns (`$D016` = `$C8`), colour RAM all
  `$0F`, border `$0F`, background `$06` then stepped to `$0C` (traced
  `$0982`, `$07F5`; simulated).
- `$091F` writes values computed from its return address into
  `$D000`-`$D007` (sprite 0-3 positions); sprites are switched off
  (`$D015` = 0 at `$0C9D`), so nothing shows. Purpose unknown.

## Sound

None: the boot only writes 0 to `$D418` (`$0913`).

## Open questions and oddities

- The directory claims 2 blocks for a 1-sector file, and the BAM 0 blocks
  free (disk). Whether these are deliberate is unknown.
- EA reads three sectors that do not exist (21-23 of track 1); harmless.
- The autostart depends on `$0101`, which the file does not load (see 2).
- `$2034`-`$20FF` and `$2524`-`$25F1` (copied to `$F654`-`$F721`) look
  like leftovers of other code in the mastering tools' memory; the latter
  calls `$167F` and reads `$24E0`. Not executed.
- The NMI vector stays `$0954` into the title (KERNAL banked out), where
  `$0954` has been zeroed: a RESTORE press before the title sets its own
  vector would execute BRK. Not tested.
- The drive check's density setting (`%01` in `$1C00` bits 5-6) is read
  from the code; how the real track 2 was mastered is not known.
