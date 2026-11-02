# Driller — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

| Effect | Poke | Status |
|---|---|---|
| Fill the energy and the shield | `POKE 34933,63` (`$8875`, the energy) and `POKE 34936,63` (`$8878`, the shield) | candidate: 63 is what the refill block over Amethyst writes to both (`features.md`), not tried as a poke |
| Make 17 sectors safe, so Obsidian's wall shows its switch | `POKE 34974,17` (`$889E`, variable 32, the safe sectors) | candidate: run through the port's own scripts at 17 (`discoveries.html`), not tried as a poke in the game |
