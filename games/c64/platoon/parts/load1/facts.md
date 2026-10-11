# Platoon, load 1 (jungle and village) — verified technical facts

Current truth for this part. The workflow lives in `kit/skills/`; how this
understanding developed lives in `../../agent-history.md`. Every fact
names the routine or table it comes from. Unless marked *live*, a fact
comes from reading the code in `work/entry.vsf`, the hand-over snapshot
named in `../../orientation.md`.

## Build

PAL disk, side 1, file OVL1 (64,508 bytes with its load address),
`$0400`-`$FFF9`. No build identifier was found in the strings.

## Memory layout

| Thing | Where |
|---|---|
| Entry from the loader | `$0400` |
| NMI handler | `$17DA` |
| Raster interrupt chain of the play screen | `$17FE`, `$18C1`, `$1916`, `$1966`, `$1A12`, `$1A8A`, `$1ACA`, `$1B12`, `$1B63`, `$1C2E` |
| Title-screen interrupt | `$1CCC` |
| Screens | `$4000` and `$4400` (sprite pointers at `$43F8` and `$47F8`) |
| Character set at the top of the frame | `$4800` |
| Messages of the title and high scores | `$A9F4` |
| Messages of the jungle and village | `$C7FD` |
| Key test and its tables | `$BA6A`, `$BAA6`, `$BAAE` |
| Sound effect start | `$EE00`; SID set-up `$E0DE` |
| Starting high-score table | `$FEFE`, copied to `$0200` by `$0400` |

## Timing

The game loop at `$07B5` ran 79 times in 1.5 seconds of play, as did the
first raster handler `$17FE`: one pass a frame (*live*, 7 October 2026).

## Controls

| Input | Read at | What the code does |
|---|---|---|
| Joystick port 2 | `$0D3D` | stored in `$0306` |
| SPACE | `$14B9` | with a grenade left, `$BD31` takes one and the throw starts |
| F1, F3, F5, F7 | `$080A` | each calls `$BFB8` |
| Z, A, C, H and 1 together | `$07B5` | `$60` written over `$2BC8` (*live*) |
| N | `$07DD` | `$EA` written back over `$2BC8` |
| P / G | `$1E55` | `$0C85` set to 1 / cleared |
| RUN/STOP | `$0893` | jumps to `$A709` |
| Y / N at the trapdoor | `$B019`, `$B023` | |

`$BA6A` takes the KERNAL's key number (eight times the row plus the
column) and answers with the carry; 23 calls use it.

## Graphics

Ten raster interrupts a frame, each naming the next in `$FFFE`. In the
frame recorded from `play-jungle.vsf`: the first (`$17FE`, about line 20)
sets the scroll registers and the sprites for the top of the screen
(lines 20 to 30); the third puts every sprite behind the background (line
146); the fourth moves sprite 0 (line 150); the fifth turns the sprites
off at the foot of the play area (lines 195 and 196); the sixth and
seventh change `$D018` and `$D016` for the status panel (lines 202 and
210); the eighth and ninth set the border and background to light grey
and back to black (lines 213 and 216).

## Mechanics

`$2BC8`, called each pass from `$0768`, compares the soldier's position
(`$0C73`, `$0C7B`) with each entry of a list (`$0C74`, `$0C7C` indexed by X,
most likely the enemies) within 20 by 6 and on a match goes to `$2CB7`, not yet read.

## Data tables

The messages are PETSCII, 40 characters a line, padded with spaces.

## Sound

`$EE00` starts effect A on voice X from three tables, `$F07A`, `$F08C`
and `$F09E`; 24 calls start effects. `$E0DE` clears the driver's state
and all SID registers and sets the volume to 15.

## Hardware register census

From every code block of the listing, by absolute address.

| Register | Accesses | What the game does with it |
|---|---|---|
| `$D000`-`$D005`, `$D00E`, `$D00F` | 15 stores, 2 loads | sprite positions, in the raster handlers and at `$A753`, `$BAC6`, `$BB48` (?) |
| `$D010` | 4 | sprite X high bits, raster handlers |
| `$D011` | 6 stores, 3 loads | screen on and off, vertical scroll (`$0400`, `$17FE`, `$3D9C`, `$A742`) |
| `$D012` | 15 stores | the next raster line of the chain |
| `$D015`, `$D017`, `$D01B`, `$D01C`, `$D01D`, `$D027`, `$D02E` | | sprite enable, expansion, priority, multicolour, colours |
| `$D016`, `$D018` | 5, 6 | scroll and multicolour; screen and character set, per band |
| `$D019`, `$D01A` | 13, 2 | raster interrupt acknowledge and enable |
| `$D020`-`$D026` | | border, background and sprite multicolours |
| `$D400`-`$D406`, `$D418` | 29 | voice 1 only, by absolute address (other voices through an index, ?) |
| `$D800`-`$DBDF` | many | colour RAM: the panel at `$B45D`-`$B553` and `$F276`-`$F321`, messages `$A7A2`-`$A9EB` |
| `$DC00`, `$DC01` | 14, 8 | joystick port 2 and the keyboard |
| `$DC0D`, `$DD0D` | 4, 11 | interrupt masks; CIA 2 raises the NMI |
| `$DD00` | 3 | video bank |
| `$DD04`-`$DD07`, `$DD0E`, `$DD0F` | | CIA 2 timers for the NMI (?) |

Never touched by absolute address: the sprite-collision registers
`$D01E` and `$D01F`, and CIA 1's timers.

## Strings

| Address | Text |
|---|---|
| `$A9F4` | THE FIRST CASUALTY OF WAR IS INNOCENCE · ENTERING THE COMBAT ZONE 111 · GAME OVER · TEN BEST SCORES · ENTER YOUR NAME |
| `$C7FD` | A SACK OF FLOUR · A STOOL · A TABLE · A POT OF RICE · WHAT ! · SET THE EXPLOSIVES ON THE BRIDGE · WELL DONE ! THE BRIDGE HAS BLOWN UP · YOU HAVE FOUND A TRAPDOOR · YOU MUST FIRST FIND A TORCH · YOU WILL NEED A MAP · YOU MUST FIND A MAP AND A TORCH · EMPTY · THIS TRAPDOOR LEADS TO AN UNDERGROUND SYSTEM OF TUNNELS · YOU HAVE FOUND THE EXPLOSIVES · THE EXPLOSIVES ARE SET RUN FOR IT ! · DO YOU WISH TO GO DOWN [Y/N] · PRESS FIRE TO LOAD NEXT SECTION · HERE IS A MAP OF A TUNNEL SYSTEM · YOU HAVE FOUND A TORCH · A POT OF WATER · RUBBISH · PROVISIONS · YOUR PLATOON HAS BEEN WIPED OUT · YOU SHOULD HAVE DESTROYED THE BRIDGE · WATCH OUT FOR THE VIET CONG BOOBY TRAP · YOU SHOULD NOT KILL INNOCENT VILLAGERS · TURN THE DISK OVER TO SIDE B |
| `$3DDE` | LAY2, the file name of the KERNAL load before the disk turn |
| `$FEFE` | PLATOON 199998 … PLATOON 009145, the ten starting scores |

The title's credits and the panel's words (AMMO, MORALE, SCORE, HITS,
STATUS) are not in PETSCII or screen codes; they are drawn from the
game's own character set (`30-text`, not yet run).

## Live tests

- 7 October 2026, `play-jungle.vsf`: holding Z, A, C, H and 1 for 1.5
  seconds changed `$2BC8` from `$EA` to `$60`; execute checkpoints at
  `$07B5`, `$07BC` and `$07D8` counted 79, 78 and 76, the control at
  `$17FE` 77.
