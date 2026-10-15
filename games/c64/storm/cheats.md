# Storm — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Keys held, shared by both players (`keys` at `$811A`; never reset, so they last into the next game) | `POKE 33050,9` | live: 7 keys poked lasted through a game over into the next game |
| Scrolls held (`scrolls` at `$8123`, player A's magic; never reset) | `POKE 33059,9` | live: 5 scrolls poked lasted into the next game |
| Snake brooches held (`brooches` at `$811D`): the laboratory door opens only on exactly 3, so this also undoes the carried-over lock | `POKE 33053,3` | live: with 3 the door in room 3 opened; with 4 it refused |
| Player A's armour (`armour_a` at `$811E`, decimal): armour above a pass's drain stops all loss, hunger included | `POKE 33054,4` | live: energy unchanged over 500 frames with armour 4 |
| Player B's armour (`armour_b` at `$811F`, decimal) | `POKE 33055,4` | candidate |
| Amulets held (`amulets` at `$8121`, player B's magic; never reset) | `POKE 33057,9` | candidate |
| Player A's energy, thousands and hundreds (`energy_a` high byte at `$8613`; 153 is `$99`, 9900 and up) | `POKE 34323,153` | candidate |

Values are decimal digits (`$09` is 9); the game counts in BCD. The game
never returns to BASIC, so a POKE means a freezer cartridge or the
emulator's monitor. Each pass copies a player's record into a work copy
(`load_a`) and back (`save_a`), so a poke made between the two is lost;
poke again if it does not show.
