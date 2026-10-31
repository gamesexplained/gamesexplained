# Explorer — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Energy to 40,000 again | `$43`/`$44` (`energy`): `$40`, `$9C` | live: a poke of 12,345 read 12,330 after the next view's 15 |
| Score to 250, so a bug comes almost every view | `$42` (`score`): `$FA` | live: a bug came within a few views (`reference/bug.png`) |
| Go anywhere: type a name at a doorway, after a crash or when the energy runs out | none needed; `discoveries.html#fragments` lists a name beside each fixed fragment | live for CSBBII and RMOYFV |
