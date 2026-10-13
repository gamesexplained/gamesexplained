# Gauntlet — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Player one's health to 2000 (player two: `$B932`, `$B930`) | `$B931` = `$20`, `$B92F` = `$00` (health_hi, health_lo, decimal) | live: poked during play, the panel read 2000 and the countdown went on from there |
| Start at another level (level 8 here) | `$99CD` = 8 (level_number) while a level ends, before level_start runs | live: the next level loaded was level 8, a random file, with its extras and hidden-potion roll |
| Never lose health to the clock | `$B933` = `$60` (RTS at health_tick) | candidate: health_tick also counts down the freeze timers and the magic key's debounce and takes a player whose health has run out out of the game, so all three stop with it |
| Walls become exits a game second after the doors open when nobody fires | `$B65D` = 1 (idle_second, normally `$96`, 150 game seconds) | candidate |
| Carry 15 keys and potions | `$B667` = 15 (carry_limit, player one; `$B668` player two) | candidate: the value the carrying potion sets |
| Monster blows take 1 health | `$C3F5`-`$C3FA` = `$01` (monster_damage, two bytes a level) | candidate: ghosts, fireballs, rocks and Death keep their own values |
