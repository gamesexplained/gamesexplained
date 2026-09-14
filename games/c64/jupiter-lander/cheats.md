# Jupiter Lander — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

There is no BASIC to type these into. The KERNAL is switched out before the
title screen, so a monitor or an emulator's memory writer is the only way
in. All of these are zero-page bytes and all of them are safe to write at
any moment during a flight.

| Effect | Poke | Status |
|---|---|---|
| Fill the tank | `$12` = `$FF`, `$13` = `$FF` | tested live |
| Empty the tank (engines cut, OUT OF FUEL appears) | `$13` = `$00` | tested live |
| Make this landing as gentle as the first | `$14` = `4` | tested live |
| Make this landing as hard as the game ever gets | `$14` = `9` | tested live |
| Turn gravity off completely | `$14` = `0` | candidate: the value is read from `gravity_table` only at the start of a landing, so nothing reloads it, but a hovering ship has not been flown |
| Set which landing you are on, and so the gravity of the next one | `$15` = 0 to 16 | candidate: the table read at `next_landing` is traced but the effect was measured through `$14` instead |
| Set the score. Packed BCD, low byte first, and the display adds a trailing zero | `$18` = `$60`, `$19` = `$03` shows 3600 | tested live |
| Set the high score, same format | `$1A`, `$1B` | traced; the same printer draws it |
| Stop the ship dead | `$0B` = `$00`, `$0C` = `$00`, `$10` = `$00`, `$11` = `$00` | tested live |
| Put the ship somewhere. World X in `$09`/`$0A`, world Y in `$0E`/`$0F`, low byte first | `$09`=`$F0`, `$0A`=`$01`, `$0E`=`$7A`, `$0F`=`$01` puts it on the x10 pad | tested live |

## Two that are worth doing for the view rather than the advantage

**Land while climbing.** Set the ship on a pad (`$09`/`$0A` and `$0E`/`$0F`
as above) and give it an upward velocity, `$10` = `$F0`, `$11` = `$FF`. The
bonus comes out as `960 X 10= 9600`, more than the 8000 a perfect stop
scores. Tested live.

**See all three sprites at once.** The flames only appear while a thruster
is held, which is hard to catch. Patching the two bytes at `$E445` from
`8A 0A` (`txa` / `asl a`) to `A9 0E` (`lda #$0E`) makes the game enable
sprites 1, 2 and 3 on every pass; set `$07FA` = `$F9` and `$07FB` = `$FA`
for the flame shapes. `reference/closeup-x2-thrusters.png` and
`reference/lander-thrusters-wide.png` were taken that way. Restoring the two
bytes puts everything back. Tested live.

This one is a code patch rather than a variable poke, so it is listed apart
from the table above.

## What the release's own trainer does

The disk is a two-option trainer: INFINATE FUEL and NO BACKGROUND
COLLISION, both answered N for every measurement in `facts.md`. Its patches
were not examined; the loader is out of scope by policy.
