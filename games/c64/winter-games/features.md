# Winter Games — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Epyx, *Winter Games* instruction manual for the Commodore 64/128 (part
  number 089Q7D-S0 rev. A), the OCR text of archive.org's scan,
  https://archive.org/details/Winter_Games_1985_Epyx, read 29 October 2026
- C64-Wiki, "Winter Games", https://www.c64-wiki.com/wiki/Winter_Games,
  read 29 October 2026 (controls and point tables per event, the nations,
  the versions, the Figure Skating "cheat")
- Wikipedia, "Winter Games", https://en.wikipedia.org/wiki/Winter_Games,
  read 29 October 2026 (credits, release dates, reception)
- The game's own screens, from this run's emulator sessions

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: "EPYX presents WINTER GAMES by Action Graphics, © 1985 Epyx, Inc." | live | part `title` |
| Opening ceremony: the torch bearer climbs the steps and lights the flame, doves fly, flags fly | live | part `opening` |
| Menu of seven options: compete in all, some or one event, practise one, number of joysticks, world records, opening ceremonies | live | part `menu` |
| Up to eight players, each typing a name and choosing one of 18 countries by its flag; `S` plays that country's anthem | open | part `menu` |
| A verification screen after the names (YES/NO, or `Y`/`N`) | open | part `menu` |
| Compete in some events: events chosen by number key or joystick, shown in white, DONE to finish | open | part `menu` |
| Number of joysticks: 1 (port 2) or 2 (ports 2 and 1) | open | part `menu` |
| World records: the best score in every event, with the holder's name and country, saved to the disk | open | parts `menu`, `resident` |
| Awards ceremony after each event: every competitor's name, country and score in order, the gold medallist's anthem | open | part `menu` |
| Champion ceremony after all seven events: gold 5 points, silver 3, bronze 1; the most points wins | open | part `menu` |
| RUN/STOP with RESTORE returns to the menu from anywhere, asking for side 1 when side 2 is in | live | part `resident` |
| The disk's other side is asked for by name ("INSERT WINTER GAMES SIDE 2") | live | part `resident` |
| **Hot Dog Aerials**: fire starts the run; six stick directions are six moves (back flip left, forward flip right, Daffy up-left, back scratch up-right, mule kick down-left, swan down-right); centre lands | open | part `hot-dog` |
| Hot Dog scores: 1 stunt 6.3, 1 flip 7.2, 2 same stunts 8.7, 2 same flips 9.2, 2 different stunts 9.6, a stunt and a flip 10.0, 2 different flips 10.0; 1.4 off for each awkward move; no score for a fall | open | part `hot-dog` |
| Hot Dog judges: eight countries' marks and a total under them (URS, YUG, FRG, ITA, SUI, GDR, USA, CAN seen) | live | part `hot-dog` |
| **Biathlon**: left-right rhythm skis; faster on the uphill; stick down when the arms are forward double-poles on the downhill | open | part `biathlon` |
| Biathlon shooting: five targets at each range, stick down opens the chamber, up loads, fire shoots; the heart rate (PULSE) moves the sights; 5 seconds' penalty a miss; 20 shots shown at the start | open | part `biathlon` |
| **Speed Skating**: two skaters side by side, "PRESS YOUR BUTTON" for each, a countdown to GO, left-right rhythm, 250 metres; a computer pacer when one player | live (screen) | part `speed-skating` |
| **Figure Skating**: one minute, seven compulsory moves (camel spin, sit spin, double and triple axel, double and triple lutz, camel into sit spin) | open | part `skating` |
| Figure Skating points: camel .7, sit .7, double axel .6, triple axel 1.1, double lutz .6, triple lutz 1.1, camel into sit 1.2; total 6.0; only the first of each counts | open | part `skating` |
| Figure Skating penalties: the manual says .7 a fall and .2 an awkward move; C64-Wiki gives other figures | open | part `skating` |
| Skating rules: a jump is elegant or awkward by the legs' position when fire is pressed; six turns of a spin; falls from jump to spin, spin to jump, jump to jump, sit spin to camel; skating backward when time runs out is a fall | open | part `skating` |
| **Free Skating**: two minutes, the same seven moves up to three times each; per attempt camel .3, sit .3, camel into sit .5, double jumps .2, triple jumps .4; ceiling 6.0, with falls and awkward moves taken off the ceiling too | open | part `skating` |
| The C64-Wiki "cheat": falling at every flag gives 6.0 in Figure Skating | open | part `skating` |
| **Ski Jump**: fire starts the run and jumps at the take-off; in the air the corner close-up shows the fault to correct: knees bent (up), too far forward (left), too far back (right), skis crossed (down) | open | part `ski-jump` |
| Ski Jump score: distance × 3 + style points | open | part `ski-jump` |
| **Bobsled**: fire starts, left and right steer; capsizing in the turns; a speed bar; the track map beside the view | live (screen) | part `bobsled` |
| Practice: no scores kept | open | part `menu` |
| "PLAY AGAIN? YES" after an event in practice | live | every event |

## Beyond the documentation

Found in the code, not in the manual.

- The loader's file table has a twelfth record, number 2, named `?`,
  which nothing was seen to load (`orientation.md`).

## Open questions

- Who programmed the C64 version: Wikipedia names Richard A. Ditton
  (artists Lonnie D. Ropp and Michael Kosaka, music David Thiel); C64-Wiki
  names Chris Oberth, whom Wikipedia credits with the Apple II version.
  The title screen says only "Action Graphics".
