# Mayhem in Monsterland — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki (German), "Mayhem in Monsterland", https://www.c64-wiki.de/wiki/Mayhem_in_Monsterland, read 9 October 2026 (the page was last edited 22 August 2025). The English C64-Wiki had no page for the game (404 on 9 October 2026).
- Wikipedia, "Mayhem in Monsterland", https://en.wikipedia.org/wiki/Mayhem_in_Monsterland, read 9 October 2026.
- The box, front and back, scanned on the German C64-Wiki (`reference/box-front.jpg`, `reference/box-back.jpg`): the loading instructions and the protection.
- Games That Weren't, "Mayhem in Monsterland", https://www.gamesthatwerent.com/2020/11/mayhem-in-monsterland/, read 9 October 2026: the unreleased PC and Game Boy Color conversions only, nothing on the C64 code.
- No manual scan was found: the Internet Archive's search for the title on 9 October 2026 listed only disk images and videos.
- The game's own screens: the intro, the protection screen, the title, the stage cards and play in each land, recorded in `reference/`.

## Features

| Feature | Status | Where |
|---|---|---|
| A multiload on two disk sides: side 1 boots and plays the intro, then asks for side 2 ("insert side b and press fire") | live | `orientation.md`; the prompt is in the protection code, `$45A4`-`$45D7` |
| Code-sheet protection: a grid reference (e.g. "F27") and a five-digit code of colours 1-5 typed on the keys | live | `$44A4`-`$47FF` in `game`; answer bytes at `$017B` exclusive-ORed with `$45` |
| Five lands in order: Jellyland, Pipeland, Spottyland, Cherryland, Rockland | live | the stage card of each; level index `$CF89`, file `L`+`A`-`E` (`$CC00`-`$CC17`) |
| Each land loaded from disk when it starts | live | the loader around `$CD00`-`$CF0F`, destination `$5A00` |
| An ending after the fifth land | live | file `CF`, level index 5; reached by setting the index, not by playing (`orientation.md`) |
| A land starts sad, in grey and drab colours ("status : sad" on the stage card) | live | `reference/stage-card-*.png`, `reference/play-*-sad.png` |
| Defeating enemies gives magic dust; the MAGIC counter counts down what is still needed | open | the counter is three decimal digits at `$CF83`-`$CF85` (010 at the start of Jellyland) |
| With enough dust, go to Theo's cave; the land turns happy: colours, music and monsters change | open | |
| In the happy land, collect a number of magic stars, then cross the finish line | open | |
| Faster-spinning stars are worth more | open | Wikipedia |
| A Super-Star bonus, on the first and last stages only | open | Wikipedia |
| Happy-land bonuses: point multipliers, extra lives, extra time and others | open | |
| The finish-line bonus depends on speed, measured by the slide while braking | open | |
| Portals (rainbows): one is active; a lost life restarts there; touching another makes it the active one | open | |
| The first touch of an enemy does not cost a life, the second does; a portal or a bonus gives the protection back | open | the wiki's invincibility POKE (`$B61D`) lands on `INC $1BB7` |
| Jump on enemies to defeat them, sometimes several times or from a height | open | |
| Spiked enemies must be rammed from the front, not jumped on | open | |
| The lightning power-up gives the charge: left/right + fire runs fast and rams enemies | open | without it, right+fire moved exactly as right did (below) |
| Some enemies come back and give nothing the second time | open | |
| Hidden areas reached by ducking and running; platforms nearly invisible against the background | open | |
| Down + fire drops through a platform | open | |
| Controls: joystick in port 2 | live | port 2 moves the player; port 1 untried |
| Left and right walk; the screen scrolls and the player stays near the middle | live | 40 frames of right move the position bytes `$1BD9`/`$1BDA` by +2, left by -2; facing `$1B5E` is `$01` or `$FF` |
| Up jumps | live | the player's sprites (6 and 7) rise 66 lines and fall back in 40 frames |
| Down ducks | live | sets `$1B62`/`$1B63` and changes `$1B4D` |
| RUN/STOP pauses; the stick resumes; Q while paused quits | open | |
| Time limit: TIME counts down on the panel | live | three decimal digits at `$CF86`-`$CF88`, set from the land's table at `$9044` (`$BD3E`) |
| Lives on the panel ("1UP x03") | live | two decimal digits at `$CF81`-`$CF82`, decreased at `$BDC7`-`$BDD3` |
| Continues | open | the wiki's disk-version POKE (`$3EAF`) lands on `DEC $CF8A` |
| Score, nine digits on the panel; a top score on the title | live | `reference/play-jellyland-sad.png`, `reference/title-jellyland.png` |
| Two players taking turns | open | the German wiki only |
| The intro: credits, and each dinosaur shown sad, in grey, then happy, in colour | live | `menu`; `reference/intro-*.png` |
| VSP for fast scrolling, sprites laid over the player for more detail, interlaced mixed colours | open | the German wiki's trivia. The player is two sprites at one position (6 and 7); `$D011` is written twice on line 50, five cycles apart; the wiki's screenshots look pastel where a single frame does not |
| "A longer intro can be loaded separately" | open | the German wiki; nothing on these two sides is named for it |

## Beyond the documentation

Found in the code, not in the manual.

- The title shows the levels scrolling behind the logo, and swaps pages of
  the level area out of the way and back to do it (`$3F6F`-`$3F77`).
- `game` holds the text `DOWNLOAD BY JAZ ` at `$47F0`, in the protection's
  memory. What it refers to is unknown.

## Open questions

- Does turning a land happy load anything from disk, or is the happy land
  in the same file as the sad one?
- The wiki's POKEs for unlimited lives at `$BE15` and extra time at
  `$37FD` land on a `BNE` before `DEC $1BED` and on `DEC $1BAA`; what
  `$1BED` and `$1BAA` count is not yet known.
