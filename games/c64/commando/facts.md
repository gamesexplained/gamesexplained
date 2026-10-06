# Commando — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names the
routine or table it comes from. Unless marked *live*, a fact comes from
reading the code in the snapshot named in `orientation.md`.

## Build

The working copy is the REMEMBER `Commando 100% +5`/high-score-saver crack release in a D64. It is not a verified retail image. It displays its own manual and offers a trainer choice. No trainer option was selected in the observed route.

## Memory layout

| Thing | Where |
|---|---|
| Main code/data | Partial map: the raster IRQ chain, SID tick/update routines, two short routines, and selected tables are annotated. The main game loop and much of the memory image remain unmapped. |
| Raster interrupt dispatch pointer | `$0406-$0407` in low RAM; live value at the captured point `$41A7`. These addresses are not in the selected visible screen matrix. |
| RAM IRQ vector | `$0314-$0315 = $4116` in the gameplay snapshot. `$4116` jumps indirectly through `$0406`. |
| Visible screen | The selected screen matrix begins at `$E000`. `$0400-$0407` hold game state and the raster-handler pointer; they are not the selected visible screen. |
| VIC screen matrix and character sets | Frame capture: CIA2 port A `$C4` selects VIC bank `$C000`; screen matrix `$E000`; `$D018=$81` selects character data `$C000`, then `$D018=$85` at line 216 selects `$D000`. Both 2 KiB character sets are RAM that the VIC-II reads beneath the CPU-visible I/O overlays. The CPU sees VIC-II registers at `$D000-$D3FF` and SID/CIA registers at `$D400-$D7FF`, so those charset addresses must not be used as CPU-facing symbol names. |
| Processor port | `$01 = $36` in the gameplay snapshot. |

## Timing

VICE reports PAL (312 raster lines, 63 cycles per line). The frame recorder captured VIC-II register writes during gameplay; its reconstructed 384×272 frame matched the emulator on all 104,448 pixels. The IRQ chain is `$416A → $41A7 → $4266 → $436B → $4119 → $416A`. `$416A` starts the frame and schedules raster `$1E`; `$436B` schedules `$D5`; `$4119` increments the frame counter at `$040B`, schedules `$DE`, and returns to `$416A`. `$D018` changes at raster line 216.

## Controls

*Live:* Joystick port 2 fire starts play from the title. During play, holding port-2 up scrolls the terrain relative to the player. Space throws a grenade; the displayed grenade count fell from 5 to 4 and a grenade appeared on screen in the same test. Port-2 left moved the player left in a short test, but the player died during that attempt.

## Graphics

*Live:* The battlefield is top-down and scrolls vertically. The HUD displays score, grenade count, men/lives, and high score. `$41A7` updates the initial sprite band; `$4266` handles sprites 7 through 4; `$436B` handles sprites 3 through 0 and advances the raster schedule. `$4119` clears sprite pointers and closes the frame. `$0406-$0407` holds the indirect next-handler pointer. The tables around `$040D-$04C2` supply sprite positions, colors, and shapes; their individual fields remain under analysis.

## Mechanics

The underlying game loop, enemies, collision handling, scoring, grenade pickups, death/respawn, area transitions, and ending have not yet been mapped.

## Data tables

The raster handlers index sprite fields by slot: `$040D,X` supplies the X-coordinate MSB bits, `$041D,X` the X coordinate, `$043D,X` sprite/background priority bits, `$044D,X` color, `$045D,X` the sprite pointer byte, and `$04C2,X` the Y coordinate. `$004B-$005A` supplies the object-slot indices used by the split handlers. The complete object layout and the other fields around `$040D-$04C2` remain under analysis. The `COMMANDO HI /REM` PRG is 93 bytes total: two load-address bytes plus 91 data bytes at `$0EED-$0F47`. The routine at `$44E0` calls the KERNAL SAVE vector for filename `@S:COMMANDO HI /REM`, starting at `$0EED` and ending exclusively at `$0F48`; the 91 saved bytes match the supplied PRG payload byte-for-byte in the gameplay snapshot.

## Sound

The release credits Rob Hubbard for the score. *Live:* `vice_sid_get_state` showed changing frequencies on all three voices over ten gameplay frames; voice 1 changed 5,295→5,000 and voice 2 changed 4,718→4,456, with pulse wave selected and master volume 15.

In code, the raster handler calls `$5012` once per frame. That routine advances the music tick at `$5525` and updates three channel states using SID register offsets `$54E8-$54EA` (0, 7, 14). `$50AA` reads sequence commands, looks up note periods in the 96-word little-endian table at `$5428-$54E7`, and writes frequency and instrument/envelope settings to the selected SID voice. The 13 eight-byte instrument parameter records occupy `$5591-$55F8`. `$5531` loads a selected 16-byte effect preset from `$55F9-$56F8` and writes register values to SID voices 1 and 2. The table mapping and audible identities of individual score events still need work.

## Live tests

- Started gameplay from the crack release without selecting trainer options; the title screen and battlefield displayed.
- Port-2 up plus fire held for 45 frames moved the terrain; the player position remained near the same screen coordinates as the world scrolled.
- Pressing Space in gameplay reduced the grenade HUD from 5 to 4 and displayed a grenade projectile.
- Several sampled PCs during play differed, consistent with execution progressing through the game.
