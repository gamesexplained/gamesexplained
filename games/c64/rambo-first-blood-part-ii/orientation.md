# Rambo: First Blood Part II — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/rambo.g64`, 317,884 bytes, the contributor's own copy. Its header
reads `GCR-1541`, 84 half-tracks of which only the 40 whole tracks hold
data: a G64, the bits the drive's head reads, which this disk's
protection needs.

It is Ocean's original disk, not a crack. Track 18, sector 2 holds the
mastering notice in plain text: "RAMBO C64 COPYRIGHT 1985 - OCEAN
SOFTWARE UK - TSS - MASTER DATE 04/12/85 NO:014.006.2 // PROTECTED BY
XROM SYSTEM . TEQUILA SUNRISE BELGIUM". No trainer, no menu, no cheats.

`python3 kit/c64/disk.py work/rambo.g64` lists eight entries. The first
(an unprintable name) and `RAMBO C64` are the same 368-byte boot file
loading at `$0101`. `&` is 31 bytes of drive code in the DOS's
utility-loader format; `(C)  1985`, the blank-named entry,
`OCEAN SOFTWARE`, `XROM SYSTEM BELG` and `TEQUILA SUNRISE` have chains
that leave the disk as the directory reads them, because the protection
renumbers tracks and sectors (below). 409 sectors the BAM marks used are
held by no file: the game, read by the loader's own code. Track 36 is
formatted, with headers that claim track 35 and disk ID `AA`; tracks 37
to 40 hold no sectors.

The same loader, with the same decoy names, is on Ocean's Green Beret
(`games/c64/green-beret/orientation.md`).

## The emulator

VICE with the vice-mcp server, under the kit's launcher.
`tools.py --platform c64 check-emulator` passed 57 of 57 checks on the
release v3.14.0 (`v3.14.0-macos-arm64-gui.dmg`) on 2 November 2026, so
no workaround applies. The boot fails the same way on that build and on
the release v3.13.2 (`v3.13.2-macos-arm64-gui.dmg`), with and without
drive wobble, and with a 1541-II in place of the 1541; the run that made
these files used v3.13.2. VICE's own drive settings were left at their
defaults: true drive emulation of a 1541.

## From power-on to play

1. Power-cycle (`reset(rpc, "hard")` in `kit/c64/vice.py`), then
   autostart the G64. VICE types `LOAD"*",8,1`.
2. **Without help the boot falls back to `READY.` about ten seconds in.**
   The cause is a file lookup the emulated drive answers "62, FILE NOT
   FOUND" (`agent-history.md`). One retry of the game's own loader gets
   past it: put a stopping checkpoint on `$07DC` (the instruction after
   the loader's first `JSR $060B`), and when it stops, set PC to `$07D7`
   and resume. The loader then opens the same file again, the drive finds
   it, and every byte from then on comes off the disk through the game's
   own code. `tools/tmp/rambo/boot_retry.py` in the run's working folder
   did exactly this:

   ```python
   vice.reset(rpc, "hard"); time.sleep(2)
   vice.arm(rpc, 0x07DC)
   vice.autostart(rpc, "work/rambo.g64")
   # wait until paused
   vice.clear_checkpoints(rpc)
   vice.ask(rpc, "vice_registers_set", {"register": "PC", "value": 0x07D7})
   vice.call(rpc, "vice_execution_run", {})
   ```

3. The screen stays black while the fast loader reads the game, about
   75 seconds at normal speed. Do not stop the machine or talk to VICE's
   monitor during this: the transfer is timed by both processors.
4. The instructions appear ("MOVE JOYSTICK TO CONTINUE"). Push the stick
   in port 2: a second instructions page, then the all-time heroes
   table, then the name-entry wheel with "TROOPER" filled in. Fire there
   accepts the name and play starts.
5. Snapshots, in `work/`:
   - `entry.vsf`: stopped at `$C006`, the game's first instruction, with
     the load complete and `$01` = `$37`. The listing is built from this.
   - `instructions.vsf`: the first instructions page, waiting for the
     stick.
   - `name_entry.vsf`: the name-entry wheel.
   - `play-start.vsf`: the first moments of play, Rambo standing in the
     jungle.

   `entry.vsf` and `play-start.vsf` differ in 5,417 bytes, in the screen
   and work areas at `$4000`-`$43FF`, `$8000`-`$87FF`, `$C000`-`$C3FF`,
   `$D500`-`$DEFF` and `$E500`-`$E8FF`; the hand-over keeps the authored
   contents of those, so it is the image to disassemble.

## Steady state

In play `$01` is `$35`: the I/O area visible, BASIC and the KERNAL
banked out. The interrupt handler is at `$214B`, through the hardware
vector at `$FFFE` in RAM; on the instructions and name screens it is
`$CE68`. The RAM vector at `$FFFA` (NMI) holds `$0000`. The video
interrupt is enabled (`$D01A` = `$F1`). The main loop's
`JSR` chain starts at `$0382`, with a table of `JMP`s at `$033C`-`$0381`.
`$DD00` reads `$96` in play. Nothing is loaded after the first load: the
game is one load, filling every page of RAM.

## The disk's files and memory

No file on the disk lands whole in memory: the game is in the 409
unlisted sectors, read by the fast loader, and the stages before it are
encrypted. The stages that do come off listed sectors are in
`agent-history.md`, with their keys.

## The loader, in a paragraph

The boot file loads at `$0101` over the stack, so the KERNAL's own
return lands in it at `$0203`. It plants a `BRK` in the RAM under the
KERNAL at `$F51E`, resets the drive (`UJ`), and sends it nine
one-character commands, one of them `&`, which makes the DOS run the
`&` file: a job that executes the drive's BAM buffer, where the BAM
sector holds encrypted drive code. That code hooks the DOS job loop and
renumbers every job's track and sector through tables (tracks 12, 15,
18 and 21 swap with a neighbour; sectors 0 and 12, 1 and 9, 4 and 10
swap), changing the tables after a count of runs, and answers a read of
track 17, sector 9 with the raw bytes found after each sector header on
track 17. A second `LOAD"8:*"` then reads a hidden directory on track 19
and a two-sector file that loads from `$FE0B` to `$0001`; its last byte
writes the processor port, banking out the KERNAL in the middle of its
own load loop, so the processor lands on the planted `BRK` and the
stream's vector at `$FFFE` sends it to `$FFBE`. That code decrypts
itself and a loader at `$0600` (add `$74`, XOR `$98`), which checks for
a cartridge at `$8000`, loads `"  *"` (`$C800`-`$CAFF`) and `"XR*"`
(`$0000`-`$0258`, built from the track 17 signature) with each byte
decrypted (add `$C5`, XOR `$2C`), and returns into `$0200`. The stage
there decrypts a fast loader into `$033C`, `$C802` uploads drive code
with `M-W` and starts it, and the fast loader reads the game from the
unlisted sectors with the screen blanked, ending with a jump to `$C006`.
Not annotated further, by policy.
