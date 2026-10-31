# Gunship — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images, one for each side of the disk, from the C64 Preservation
Project's tenth anniversary collection on archive.org
(`C64_Preservation_Project_10th_Anniversary_Collection_G64.zip`):
`gunship_s1[microprose_1985](rl6)(pal).g64` (MD5
`36e210f70735edd2e77cad92ca363f2a` as downloaded) and
`gunship_s2[microprose_1985](rl6)(pal).g64` (MD5
`ce301c6881334bae18dd59e8958af998`). They are the original MicroProse
disk, protected with Rapidlok V6, not a crack. The collection also holds
a "(patched)" pair; this run used the unpatched one.

Side 1 is written to: the game keeps its pilot roster there and saves it
at every start, so a copy's checksum changes once it has been played. The
roster on the preserved disk holds a pilot, 2LT deth dog, with 1220
points and Western Europe as his last duty.

The directory is not the game's: Rapidlok's directory entries point at
decoy sectors, and `kit/c64/disk.py` decodes only 32 sectors of either
side, so the files could not be extracted. Every load below was found by
stopping at the KERNAL's LOAD (`$FFD5`), which Rapidlok hooks, and
comparing memory before and after.

## From power-on to play

1. Attach side 1 to drive 8 and autostart it (`LOAD"*",8,1` then `RUN`;
   the image needs true drive emulation, which `tools.py vice` turns on).
2. The boot program, `GUNSHIP`, shows the MicroProse title: a helicopter
   flies in over a landscape, its rotors turn and a few bars of "Ride of
   the Valkyries" play. The credits follow (about 85 seconds from power-on
   at normal speed; warp is fine), then the library and the map's
   character set load and the roster is read and checked. The program
   prints `load "begin",8,1` on the screen, puts a RETURN in the keyboard
   buffer and ends with `NEW`, so BASIC loads the front end itself.
3. The front end, `BEGIN`, asks you to identify a vehicle from a picture
   (one of twenty, `I1` to `I20`, chosen at random). The answer is in the
   manual. The joystick in port 2 moves the pointer and fire chooses. A
   wrong answer sends you on a training flight in the USA.
4. The main menu shows the roster's first pilot with his duty, style and
   realism. Continue (top right) loads the theatre and shows the briefing:
   `play-briefing-we` in `parts/front/work/`.
5. From the briefing: Continue, then "Yes, continue" on the checklist,
   then Continue on the arming screen. The game asks for the disk to be
   turned over: attach side 2 and press fire. Side 2's loader runs and
   the cockpit appears about eight seconds later at warp: `play-cockpit-we`.
6. To take off: keys 1 and 2 start the engines, 3 engages the rotor; wait
   until the rotor is at speed, then press F1 eight times.
   `play-flying-we` is a few seconds after take-off.

The snapshots in each part's `work/` were taken by stopping at `$FFD5`,
so most of them show the moment a load is asked for: the files before it
are all in memory then.

## The parts

Seven parts, in the order they are played. Three are BASIC programs with
machine code beside them; the flight is all machine code.

| Part | What it is | Snapshot (in `parts/<id>/work/`) | Route |
|---|---|---|---|
| `title` | `GUNSHIP` (BASIC, `$0801`-`$10E4`) and the title sequence it loads: `SMALL`, `TITLE`, `CHOPPER`, `ROTORS`, `METAL` | `entry.vsf` at the `SMALL` load (5 s); `play-credits.vsf` at the `TYPE` load (85 s) | power-on, autostart side 1 |
| `library` | `TYPE`, the machine-code library at `$7500`-`$8B4C` with its fonts, and `MAP.CHR.TN` | `entry.vsf` at the `MAP.CHR.TN` load (95 s); `play-roster-checked.vsf` at the `BEGIN` load (104 s) | the boot program loads both |
| `front` | `BEGIN` (BASIC, `$0801`-`$6609`), over the library | `entry.vsf` at the first picture's load (`I<n>`, 120 s); `play-menu.vsf`; `play-briefing-we.vsf` | steps 3 and 4 above |
| `loader` | side 2's `6` (BASIC, `$0801`-`$1013`) and its helpers at `$8000`-`$80E2` | `entry.vsf` and `play-loading.vsf`, both at the `CP` load | step 5: the first file side 2 loads |
| `flight` | `CP`, `CH`, `W3.<theatre>`, `M`, `M.<theatre><n>`, `G2` and `AWH`: the flight engine, its terrain and the BASIC that runs before and after it | `entry.vsf` at the engine's first interrupt; `play-cockpit-we.vsf`; `play-flying-we.vsf` | steps 5 and 6 |
| `debrief` | `B` (BASIC, `$0801`-`$1831`): the mission result summary | `entry.vsf` at the `1` load; `play-summary.vsf` at the `2` load | land at a base and switch off both engines; with side 2 in the drive press fire |
| `base` | `E` (BASIC, `$0801`-`$64F8`) and `OP`, the same library again, over the library part | `entry.vsf` at the `OP` load; `play-what-next.vsf` | after the summary |

Loads in order, from the logged calls (start and end are where the bytes
landed; the KERNAL reports some of Rapidlok's ends wrongly):

| File | Side | Loaded by | Lands at |
|---|---|---|---|
| `GUNSHIP` (`*`) | 1 | autostart | `$0801`-`$10E4` |
| `SMALL` | 1 | `GUNSHIP` line 20 | `$8000`-`$80F7`, and a picture it unpacks |
| `TITLE` | 1 | line 200 | `$8100`-`$96C3` |
| `CHOPPER`, `ROTORS` | 1 | the title code at `$8100` | graphics at `$97FB` and up |
| `METAL` | 1 | the title code | `$7000`-`$7C7F` |
| `TYPE` | 1 | line 470 | `$7500`-`$8B4C` (the library) and its fonts at `$C000`-`$C7FF` |
| `MAP.CHR.TN` | 1 | line 470 | `$7000`-`$7088` (the roster check), `$8C00`-`$8FFD` |
| `BEGIN` | 1 | the keyboard buffer | `$0801`-`$6609` |
| `I1`-`I20` | 1 | `BEGIN`, the ID check | the picture at `$A000` |
| `6` | 2 | the keyboard buffer | `$0801`-`$1013`, `$8000`-`$80E2` |
| `CP`, `CH`, `W3.<theatre>`, `M`, `M.<theatre><n>`, `G2`, `AWH` | 2 | `6`, then `G2` | the flight engine and its data (`M` reaches `$E76B`); `G2` at `$0801`-`$0E74` |
| `B` | 2 | `G2`, through the keyboard buffer | `$0801`-`$1831` |
| `1`, `2` | 2 | `B` | the summary's pictures |
| `E` | 2 | `B` | `$0801`-`$64F8` |
| `OP` | 2 | `E` | the library again, at `$7500`-`$8B4C` |

## Steady state

- **Front end and base** (BASIC with the library): the VIC sees bank 3,
  screen at `$C800`, the library's character set at `$C000`. The IRQ
  vector at `$0314` points into the library (`$8642` on the menu,
  `$824D` on the base's screen). BASIC's top is `$7400` (`POKE 52,116`).
  RUN/STOP and RESTORE are both switched off: `POKE 808,234` moves the
  KERNAL's STOP vector (`$0328`) to `$F6EA`, so the key never reads as
  pressed, and `POKE 792,193` points the NMI vector (`$0318`) at `$FEC1`,
  an `RTI` in the KERNAL. `$8000` holds a `CBM80` signature whose two
  vectors point at `$8009`, so the reset that the KERNAL does on such a
  signature lands in the library.
- **Flight**: the KERNAL is banked out. The RAM vectors at `$FFFA` point
  at `$91EF` (NMI and reset) and `$94B8` (IRQ). The VIC sees bank 1,
  multicolour bitmap at `$4000`, screen at `$7C00`.
- The title and the debriefing run with the KERNAL's screen at `$0400`
  and its lower-case character set.

Nothing is reloaded during a flight. Each theatre has its own terrain
files (`W3.TN`, `W3.SE`, `W3.CA`, `W3.ME`, `W3.WE`, with `M.<theatre>`
and an enemy-level digit); the flight part's snapshots are of Western
Europe.

## The loader, in a paragraph

Rapidlok V6 loads every file through the KERNAL's own LOAD call
(`$FFD5`); the load vector at `$0330` keeps its usual value, `$F4A5`.
The game's BASIC programs load each other by printing a
`LOAD` command on the screen, putting a RETURN in the keyboard buffer
(`POKE 631,13:POKE 198,1`) and ending with `NEW`, and load their data
files with `SYS 65493` (the KERNAL's LOAD) after setting the name and
address registers by `POKE`. Not annotated further, by policy.
