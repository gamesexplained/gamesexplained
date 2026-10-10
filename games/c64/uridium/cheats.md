# Uridium — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Infinite lives: losing a Manta takes nothing from the lives | `POKE 3452,0` (`$0D7C`, the operand of `SBC #$01` in `life_over`) | live: five Mantas lost, lives stayed at 3 |
| Start each game with up to 99 lives | `POKE 13467,n` with n in BCD (`$349B`, `player_template`'s lives) | live: `$09` gave nine lives |
| Start each game on level n (1-15) | `POKE 13468,n : POKE 13469,n` (`$349C`/`$349D`, `player_template`'s level and next level) | live: 5 started on "05. Iron." |
| Start at a higher difficulty | `POKE 13470,n` with n = `$10`, `$20` or `$30` (`$349E`, `player_template`'s difficulty) | candidate |

The pokes are made with the game in memory, from a cartridge monitor or
the emulator's monitor; the game's own code has no cheat mode.
