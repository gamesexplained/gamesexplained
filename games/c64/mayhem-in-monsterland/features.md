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
| Defeating enemies gives magic dust; the MAGIC counter counts down what is still needed | traced | three decimal digits at `$CF83`-`$CF85`, set from the land's `$903E`-`$9040` (`$E54F`); one off at `$370F`; at 000 `$36F3` is set and the label flashes (`$F0D9`) |
| With enough dust, go to Theo's cave; the land turns happy: colours, music and monsters change | traced | the cave scene is engine code kept at `$D100`-`$D6FF`, swapped to `$6000` and entered at `$638D` (`$3BBF`-`$3BD3`); `$B785` then swaps the land's two character sets (`$A900` with `$7800`, checked) and the page `$A800` with `$8900`, and the sad and happy versions of each object (bytes 3 and 7 of its record); happy objects use type + 25 (`$E8AE`), the happy tune is `$FDB6`. Nothing is loaded from disk |
| In the happy land, collect a number of magic stars, then cross the finish line | traced | the star code is switched off in the sad land by an RTS written over its first byte (`$B7C3`); the star quota comes from the land's `$9041`-`$9043` (`$3BC6`); the finish line is tested at `$2B4C` |
| Faster-spinning stars are worth more | traced | a star's points come from its spin delay through the table at `$EDF5`: 500, 200, 100, 50 or nothing (`$38C4`-`$39A2`) |
| A Super-Star bonus, on the first and last stages only | traced | "SUPER STAR BONUS" when the star count reaches 000 at the tally (`$F29D`); no test of the stage number was found there |
| Happy-land bonuses: point multipliers, extra lives, extra time and others | traced | items map through the land's `$9075` to nine effects (`$F994`/`$F99D`): charge, multiplier, ten stars off, power-up, extra life, one star off, clock stopped for 20 ticks (`$CB4B`), an extra continue (`$10C1`), and `$10D5` |
| The finish-line bonus depends on speed, measured by the slide while braking | traced | the skid distance is counted in decimal digits `$1BF0`/`$1BF1` with a rising sound (`$1EFD`), worth 1000 each in the tally (`$BE84`) |
| Portals (rainbows): one is active; a lost life restarts there; touching another makes it the active one | traced | objects with behaviour `$80`-`$8F`; `$E4E3` makes the touched one active (`$1D60`, bit 7 of its record's byte 0) |
| The first touch of an enemy does not cost a life, the second does; a portal or a bonus gives the protection back | traced | the first touch sets `$1BB7` and gives `$64` frames of grace; the second costs the life (`$B4A8`-`$B5E9`). The wiki's invincibility POKE at `$B61D` turns `INC $1BB7` into a load |
| Jump on enemies to defeat them, sometimes several times or from a height | traced | an object's kind below `$F7` is its strength; a stomp takes off `$1BAB`, which grows with the fall |
| Spiked enemies must be rammed from the front, not jumped on | traced | kinds `$FB` and `$F7` cannot be stomped; `$F8`, `$FC` and `$FA` always hurt |
| The lightning power-up gives the charge: left/right + fire runs fast and rams enemies | traced | item effect 0 sets the charge flag `$1BEB` (`$BC55`); without it, right+fire moved exactly as right did (live, below) |
| Some enemies come back and give nothing the second time | traced | defeat sets bit 4 of record byte 10 (`$CB02`); a respawned object with it is freed without its item (`$C962`); `$E595` clears the marks when a land starts |
| Hidden areas reached by ducking and running; platforms nearly invisible against the background | open | |
| Down + fire drops through a platform | traced | player movement, `$2A3A`-`$2FFF`: glyphs below the land's `$9020` are platforms he can drop through and jump up through, below `$9021` walls |
| A variable jump: letting go of up early cuts the jump short | traced | jump index `$1B5D` with speeds from `$3460` |
| An extra life for every million points | traced | when the score's millions digit `$CF7A` rises (`$3534`/`$355E` → `$3636` → `$3866`) |
| Controls: joystick in port 2 | live | port 2 moves the player; port 1 untried |
| Left and right walk; the screen scrolls and the player stays near the middle | live | 40 frames of right move the position bytes `$1BD9`/`$1BDA` by +2, left by -2; facing `$1B5E` is `$01` or `$FF` |
| Up jumps | live | the player's sprites (6 and 7) rise 66 lines and fall back in 40 frames |
| Down ducks | live | sets `$1B62`/`$1B63` and changes `$1B4D` |
| RUN/STOP pauses; the stick resumes; Q while paused quits | traced | RUN/STOP with the stick centred pauses, read in the raster handler `$2222`; RUN/STOP up and the stick moved resumes; Q (row 7, column 6) quits from the pause (`$1EAB`-`$1EBC`) |
| Time limit: TIME counts down on the panel | live | three decimal digits at `$CF86`-`$CF88`, set from the land's table at `$9044` (`$BD3E`) |
| Lives on the panel ("1UP x03") | live | two decimal digits at `$CF81`-`$CF82`, decreased at `$BDC7`-`$BDD3` |
| Continues | traced | `$CF8A`, set to 3 for a new game (`$E52D`), taken at `$3EAF`; game over and "CONTINUE : YES/NO" at `$3DEC` |
| Score, nine digits on the panel; a top score on the title | live | `reference/play-jellyland-sad.png`, `reference/title-jellyland.png` |
| Two players taking turns | open | the German wiki only |
| The intro: credits, and each dinosaur shown in two moods | differs | the dinosaur walks in in colour, then the scene flashes white and fades to grey while its name scrolls in (`$8064`, `$8AC2`, `$8ADE` in `menu`): happy to sad, not sad to happy. Ten dinosaur pages, each followed by a credits page; `reference/intro-*.png` |
| VSP for fast scrolling | confirmed | `$2162` enters the NOP slide at `$B182` + column/2 and writes `$12` then `$1B` to `$D011` on line `$30`; live: one recorded frame shows the two writes five cycles apart on line 50 |
| Sprites laid over the player for more detail | traced | Mayhem is sprites 6 and 7 at one position, X fixed at `$AC` (`$E426`, `$EE9E`); live: both rise together in a jump |
| Interlaced mixed colours | open | the German wiki's trivia; the wiki's screenshots look pastel where a single frame does not |
| "A longer intro can be loaded separately" | open | the German wiki. The intro's only disk accesses are `2` loading "MENU", an Initialize (`$53E2`) and the loader's "GAME" (`$53DE`); no other file name is in `menu` (its "S0:MENU" at `$9FF9` lies in the uninitialised tail nothing reads). Such an intro would be on another disk or release |

## Beyond the documentation

Found in the code, not in the manual.

- The title shows the levels scrolling behind the logo, and swaps pages of
  the level area out of the way and back to do it (`$3F6F`-`$3F77`).
- `game` holds the text `DOWNLOAD BY JAZ ` at `$47F0`, in the protection's
  memory. What it refers to is unknown.

## Open questions

- The wiki's second POKE for unlimited lives, at `$BE15`, lands in the
  lightning's timer in this build, not in the lives code; its POKE for
  extra time at `$37FD` lands on `DEC $1BAA`, the clock-stop counter. The
  wiki's POKEs may have been written for another release.
- The hand-over's `$4800`-`$4BFF`, beside the text `DOWNLOAD BY JAZ`,
  holds code the game never runs: a disk routine and a saver for a file
  named "GAME". Whether this copy passed through someone's hands after
  Apex mastered it (it still runs the protection check) is not known.
