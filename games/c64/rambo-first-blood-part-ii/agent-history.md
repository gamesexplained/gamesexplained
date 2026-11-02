# Rambo: First Blood Part II — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Decisions made for the contributor

The contributor started the run unattended, answered START.md's questions
in the first message (Silver, web allowed, push but do not open the pull
request, one agent, commits as `unorig`) and asked that anything else be
decided and noted here.

- The model is `claude-opus-5-5`, which `models.py is-proven` reports as
  proven, so no maintainer's check is needed for Silver.
- The run branched from the upstream `main` (kit 0.0.289), not from the
  clone's local `main`, which carried commits the upstream did not.
- No checker model was named, so `60-verify` uses the session's own model
  in a fresh agent that wrote none of the listing.
- To get past the boot failure (below) the run retries the game's own
  loader once, rather than writing a cracked image or loading files by
  hand; every byte the game runs still comes off the contributor's disk
  through the game's own code.

## Getting the game to load (2 November 2026)

The first autostart came back to `READY.` in under ten seconds. The
boot file at `$0101` loaded, ran, reset the drive with `UJ`, sent nine
one-byte commands and loaded `8:*` again; that second load ended at
`$0259`, the code at `$0203` called `$C802`, which held the power-on fill,
and the `BRK` there ended in BASIC.

Wrong turns, in order. The drive model (a 1541-II gave the same result),
VICE's drive wobble (off, the same), and the emulator build (v3.13.2 gave
the same as v3.14.0; Green Beret's run had booted this very loader on
v3.13.2 under Linux). A search of the sectors and of the raw track bits
for the bytes that landed at `$0201` found nothing, because they are
decrypted on the C64.

What settled it was reading the drive's RAM out of a snapshot (module
`DRIVECPU0`; its 2 KB of RAM start 114 bytes into the module, found from
the DOS's error message at drive `$02D5`) and the C64's executed-address
map (`kit/c64/codemap.py`) over the whole boot:

1. The `&` command runs the `&` file as a DOS utility. Its blocks write
   a few bytes of drive zero page and queue job `$E0` on buffer 4, which
   executes the drive's `$0700`, where the DOS keeps the BAM. The BAM
   sector is drive code: `ISB $070D` turns its `JMP $06A7` into
   `JMP $07A7`, which decrypts the rest with an `ISB $07B0,X` loop.
2. The decrypted code (drive `$0700`) hooks the job loop: it runs as job
   `$D0`, renumbers every queued job's track and sector through the
   tables at `$0790` (tracks 9, 12, 15, 17, 18, 21, 25, 30), `$0798`
   (XOR 0 or 1) and `$07A0` (a sector permutation), calls the DOS's job
   loop at `$F2B0`, and queues itself again. A counter at `$14`/`$15`
   patches the tables after about 26 runs (`$079C`, `$07A1`, `$07A9`),
   so track 18 stops being read as 19. A job for track 17, sector 9 is
   answered by `$07C0`, which stores the ten raw bytes after each header
   on the track. The drive's interrupt timer is set to `$2Cxx` at
   `$0668`.
3. `LOAD"8:*"` read the hidden directory at physical track 19, sector 9
   (one PRG entry with a blank name, at track 21, sector 0, said to be 4
   blocks) and a two-sector file at physical (20,12) and (20,4) that loads
   from `$FE0B` and ends at `$0001`. Its last two bytes, `$2F` and `$E5`,
   go to the processor port and bank the KERNAL out under its own load
   loop; the boot file had written `$00` (`BRK`) to the RAM at `$F51E`,
   which is where the processor lands, and the stream had set the RAM
   vector at `$FFFE` to `$FFBE`.
4. `$FFBE` decrypts itself downward and then the page at `$FE00` into
   `$0600` (each byte plus `$74`, XOR `$98`), wiping `$FE00`. The loader
   at `$07A0` checks `$02`, then calls `$060B` three times with the names
   at `$0667` (`"  *"`), `$066A` (`"XR*"`) and `$066D` (`"0:*"`, its
   `JSR` replaced by `NOP`s). `$060B` loads a file byte by byte through
   the KERNAL's serial routines, adds `$C5` and XORs `$2C` to each byte
   (`$06D6`), and every 256 bytes flashes the border and checks that
   `$8000`-`$8004` is writable RAM, jumping to the KERNAL's reset if not.
5. **The failure:** the first of those loads gets "62, FILE NOT FOUND"
   from the emulated drive, though the drive's buffer holds the real
   directory (track 18, sector 1) and `"   (C)  1985"` matches `"  *"`.
   The loader goes on to `"XR*"`, which loads, and returns into `$0200`
   with `$C800`-`$CAFF` never loaded. When the run skipped the `"  *"`
   load instead, `"XR*"`, now first, failed the same way: whichever file
   is opened first after the hidden load is not found, and the next is.
   Why the emulated DOS misses it was not found. A guess not tested: the
   DOS's directory state left over from the hidden directory on track 19,
   on a drive whose timing differs from the hardware's.
6. Built offline by following `"   (C)  1985"`'s chain through the
   tables and the `$C5`/`$2C` key, the file is 770 bytes for `$C800`,
   beginning with the code `$C802` that the stage at `$0203` calls. With
   the loader sent back once to `$07D7` after its first `JSR $060B`
   returns (the recipe in `orientation.md`), it loads exactly that from
   the disk, and the game comes up about 75 seconds after the autostart.

The `$C802` stage writes drive code from `$C900` with `M-W` in 32-byte
pieces, starts it with `M-E`, and jumps to the fast loader at `$033C`
(decrypted from `$CA3C`). The first instruction it reaches outside the
loader's pages is `$C006`, the game's `JMP $C1B7`; `entry.vsf` is
stopped there.

Two traps met on the way. A stop at `$C802` followed by a code-map
`zap` looked like a hung fast loader; it was only slow, the load takes
over a minute. And VICE's text monitor wedged three times: a `chis` of
2,500 lines did not finish in the 60 seconds `codemap.monitor()` waits,
and a second command sent on the same connection after the monitor had
left (the `monitor-run-leaves` quirk) wedged it until a restart.
