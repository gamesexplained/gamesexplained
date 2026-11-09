# Thrust — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Start the reactor countdown | `$6A` = 10 (`countdown`) | live: the status bar showed 9 twice after a beat |
| Invisible landscape on any level | `$A5` = `$FF` (`invisible`) | live: the walls went black until Space |
| Lives in reserve | `$9403` = `$09` (BCD, `lives`) | candidate |
| Fuel | `$9400` = `$99` (BCD, `fuel` middle byte: 9,900 and the low byte) | candidate |
| Guns hold fire | `$3D` = `$FF` (`guns_silent`), set again as it counts down | candidate |
