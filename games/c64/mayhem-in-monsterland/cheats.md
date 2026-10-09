# Mayhem in Monsterland — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game has a cheat of its own: typing 2 1 5 4 3 5 1 4 3 2 5 2 3 1 4 4 1
2 5 3 2 4 3 5 1 on the keys 1 to 5 at the title screen writes RTS over the
start of `life_lose` (`$BDC1`), so losing a life takes none
(`parts/jellyland/facts.md`).

| Effect | Poke | Status |
|---|---|---|
| Lives are never taken, as the title cheat does | `POKE 48577,96` (`$BDC1` = `$60`, RTS) | live: with the byte set, a stage whose clock ran out kept the lives at 03, where the control lost one (`facts.md`, Live tests) |
| Lives: set the count | `$CF81` (tens), `$CF82` (units), decimal digits | candidate; the variable is traced (`$BDC7`-`$BDD3`) |
| Time: set the clock | `$CF86`-`$CF88`, hundreds, tens, units | live: TIME poked to 001 ran out and cost a life in a moment |
| The clock stops for a while (item effect 6) | `$1BAA` = ticks to skip | candidate; read at `$37F8` |
| Continues | `$CF8A` | candidate; taken at `$3EAF` |
| Magic dust still needed | `$CF83`-`$CF85`, decimal digits | candidate; counted down at `$370F` |
| Start at any land | `$CF89` = 0-4 (5 is the ending), set just after `INC $CF89` at `$CBB0` and before the loader runs | live: every land and the ending loaded this way (`orientation.md`) |
| Invincibility (C64-Wiki) | `POKE 46621,173` (`$B61D`: `INC $1BB7` becomes `LDA $1BB7`) | candidate; the first touch's flag is then never set, so every touch is a first one |
| Unlimited lives (C64-Wiki) | `POKE 48587,0` (`$BDCB`: `SBC #$01` becomes `SBC #$00`) | candidate; the subtraction then takes nothing off the units |
| Unlimited continues, disk (C64-Wiki) | `POKE 16047,173` (`$3EAF`: `DEC $CF8A` becomes `LDA $CF8A`) | candidate |
