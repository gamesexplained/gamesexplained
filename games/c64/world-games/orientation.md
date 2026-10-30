# World Games — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

Two G64 images of the original Epyx release, PAL, one per side of the
disk: `world_games_s1[epyx_1986](pal).g64` (MD5
`2ab5a75103d42418411efba353586e3e`) and
`world_games_s2[epyx_1986](pal).g64` (MD5
`f983b43d3cf6dc55db507278f21c4c64`), from the G64 set of archive.org's
C64 Preservation Project 10th Anniversary Collection. They are kept in
`work/` as `wg-s1-pal.g64` and `wg-s2-pal.g64`. Nothing on them is a
crack or a trainer.

Side 1's directory:

| File | Bytes | What it is |
|---|---|---|
| `WORLD GAMES` | 95 | the boot: loaded at `$02A7`-`$0303`, over BASIC's main-loop vector at `$0302`, so it runs itself once loaded; it loads `L` and jumps to `$0909` |
| `L` | 2050 | the shell, loaded at `$0900` (shell part) |
| `C` | 258 | the shell's unpacker, loaded at `$0F00` and copied to `$D000` |
| `R` | 258 | the world records, loaded at `$0E00` |
| `A` | 10754 | the title (title part), packed |
| `B` | 9986 | the menu (menu part), packed |
| `H` | 9218 | the travelogue (travelogue part), packed |
| `F` | 21250 | weightlifting, packed |
| `E` | 17410 | barrel jumping, packed |
| `G` | 22274 | cliff diving, packed |
| `I` | 23042 | slalom, packed |
| `J` | 8194 | slalom's second file, loaded at `$6000`, not packed |
| `LIST` | 4 | two bytes after the load address; nothing loads it |

Side 2 holds `B`, `C`, `H` again (side 2's `H` differs only in its
first two bytes) and the other four events: `M` log rolling (28674
bytes), `K` bull riding (21762), `O` caber toss (20738) and `N` sumo
(24066).

## From power-on to play

1. Attach `wg-s1-pal.g64` as drive 8 and autostart it in VICE's
   accurate C64 (`x64sc`, PAL), as `kit/skills/c64/steps` (`media`) and
   `kit/skills/c64/tool-vice-mcp` say.
2. The BASIC line loads the shell, which loads the unpacker and the
   world records, then the title. No loader screen and no fast loader:
   every file comes through the KERNAL's own LOAD (shell, `$0BF9`).
3. The title plays its tune; the fire button on port 2 goes on to the
   menu.
4. Snapshots: a checkpoint on the shell's `JMP` into a part (`$09B2`)
   stops the machine with the part loaded and unpacked, before its first
   instruction. Each `entry-<letter>.vsf` in `work/` was saved there
   (`work/scripts/event.py`), and copied to the part's
   `parts/<id>/work/entry.vsf`, the snapshot its listing is built from.
   The shell's own snapshot, `parts/shell/work/loaded.vsf`, is the one at
   the hand-over to the title.

## The parts

In the order the game reaches them:

| Part | File | Route to its snapshot |
|---|---|---|
| shell | `L` | the hand-over to the title, after the boot |
| title | `A` | the same hand-over |
| menu | `B` | the title, then fire on port 2 |
| travelogue | `H` | the menu, a choice of event with the travelogue on (option 7), fire |
| weightlifting | `F` | the menu, key `4` (practice one event), key `A`, fire |
| barrel jumping | `E` | key `4`, key `B`, fire |
| cliff diving | `G` | key `4`, key `C`, fire |
| slalom | `I` and `J` | key `4`, key `D`, fire |
| log rolling | `M` | key `4`, key `E`, fire; at "INSERT WORLD GAMES SIDE 2", side 2 attached and fire |
| bull riding | `K` | key `4`, key `F`, fire; side 2 as above |
| caber toss | `O` | key `4`, key `G`, fire; side 2 as above |
| sumo | `N` | key `4`, key `H`, fire; side 2 as above |

With the travelogue on, its page comes first and fire goes on to the
event. A part ends by jumping back to the shell at `$0900`, which loads
the menu again or the next event.

## Steady state

The shell keeps `$0800`-`$0FFF` for the whole game: the players'
records and its variables in `$0800`-`$08FF`, its code from `$0900`,
the world records at `$0E00` and the unpacker at `$D000`, run with the
I/O area banked out. Every other part is loaded at `$1000` and replaces
the part before it; slalom starts at `$8000`. Each part sets its own
raster interrupt: weightlifting, cliff diving, slalom, log rolling, caber
toss and sumo
switch the KERNAL out (`$01` = `$35`) and point the hardware's vector at
`$FFFE` at their own handler, the others keep the KERNAL and use its
vector at `$0314`. The events keep pictures, sprite shapes and music in
the RAM under the BASIC ROM, and those with the KERNAL switched out under
the KERNAL too. Nothing is reloaded while a part runs.

## The loader, in a paragraph

The shell loads each part by its one-letter name through the KERNAL
(`$0BF9`), to the address the file names, then unpacks it in place with
the unpacker at `$D000`: the file's header lists chunks, each expanded
through a table of byte pairs built for it (shell, `$D000`). The shell
asks for the other side of the disk when the file it needs is not there
("INSERT WORLD GAMES SIDE n / THEN PRESS JOYSTICK BUTTON", `$0B1D`).
