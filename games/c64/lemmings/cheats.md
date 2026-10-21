# Lemmings — cheats

Pokes and codes that change the game within its own parameters. Each one
names the variable it changes and whether it has been tested live.
Untested pokes are labelled as candidates.

| Effect | How | Status |
|---|---|---|
| Answer the code sheet: type, in decimal, the word at `$A092`-`$A093` (low byte first, menu part) while the prompt is up | none; read it | live, 19 October 2026 |
| Any page's numbers: the page's first number (menu `$A070`/`$A080`), plus 23,171 per line, less 56,831 when the sum reaches it | the How it works tab lists all sixteen pages | confirmed on the game's code |
| Cheat mode: a level given up (SHIFT, then the back arrow) counts as 100 % saved, and its end screen gives the next code | type WANNABFREE at the title's option 3; it sets bit 7 of `$CB61` (resident part) | live, 20 October 2026 |
| Start at any level | its access code at the title's option 3; all 100 are on the Maps / levels tab | traced |
| See the end sequence: the level after level 1 becomes the 101st, which runs the end | `$CB48` (resident part) = 99 at level 1's briefing, then win level 1 | live, 20 October 2026 (`work/toend.py`) |
