# North & South — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

No cheat of the game's own was found: no word typed and no keys held do
anything beyond the controls in `facts.md`, "Controls".

| Effect | Poke | Status |
|---|---|---|
| The fort's attacker keeps four knives | fort `$8115` (`knives_left`) set back to 4 | candidate |
| A side's level, as the menu sets it | resident `$0380` (the Union), `$0381` (the Confederacy): 0 to 2 | candidate; the menu writes the same bytes (menu `$1193`) |
| The fort's clock stands still | fort `$8105`/`$8106`, the clock sprite's x, held below `$132` (`fort_clock`, `$8945`) | candidate |
