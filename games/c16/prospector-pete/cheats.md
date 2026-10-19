# Prospector Pete — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Unlimited lives: a death takes nothing off MEN | `$1888` = `$00` (the `SBC #$01` in `main_loop`) | live: MEN stayed 02 after a death |
| Unlimited sticks: laying one takes nothing off STICKS | `$2C40` = `$00` (the `SBC #$01` in `dynamite`) | live: STICKS stayed 05 after seven sticks |
| Restart the game from its first instruction, keeping the high scores | `G 1800` in the machine-language monitor (`start`) | traced |
| Start on any level, 1 to 16 | none needed: left and right on the title screen (`change_level`) | live |
| Never let the creatures out | `$186C` = `$2C` (turns `JSR release_creature` into a `BIT`) | live: no creature came out in 1,500 frames of level 1 (the water still rose up the shaft and drowned Pete) |
