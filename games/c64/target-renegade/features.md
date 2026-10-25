# Target Renegade — features

## Sources

- [Target Renegade — C64-Wiki](https://www.c64-wiki.de/wiki/Target_Renegade), read 25 October 2026. Its animated reference is saved as `reference/wiki-stages.gif`. Claims about other conversions have not been imported.
- The supplied EasyFlash edition, observed in VICE v3.13.2 on 25 October 2026. The title names Commodore as pause and Space as music on/off.
- [Target Renegade manual](https://www.lemon64.com/doc/target-renegade/594) could not be read: the web reader and a direct fetch returned HTTP 403. The Spanish manual below supplies the controls as well.

- [Total compilation manual](https://spa2.speccy.org/Instructions/t/Total.pdf), Commodore section on printed pages 4–5, read 25 October 2026. It specifies joystick port 1, directional attacks, pause, scoring, and two loads: stages 1–3, then stages 4–5. These claims remain open unless tested below.

## Features

| Feature | Status | Evidence / next check |
|---|---|---|
| Title credits Dave Collier, John Palmer, Martin McDonald, and Gary Biasillo | live | `reference/title-ready.png` |
| Fire on joystick port 1 starts play | live | 100 frames held from title; port 2 fire for 150 frames left title unchanged |
| Single-player street fighting | live | `reference/stage1.png` |
| Two original loads: stages 1–3, then 4–5 | open | Commodore manual; second-load snapshot and cartridge mapping pending |
| Five stages: car park, Seedy Street, park, shopping street, bar | open | Wiki descriptions and animated reference; capture each loaded stage |
| Joystick movement across the floor | open | Commodore manual / wiki controls; compare from neutral state |
| Up + fire jumps; diagonally up + fire performs a jump kick | open | Commodore manual / wiki controls; test from a neutral pose |
| Down + fire ducks and collects a weapon | open | Commodore manual / wiki controls |
| Horizontal direction + fire punches/swings or back-kicks | open | Commodore manual / wiki controls; determine facing dependence |
| Lower diagonals + fire provide a special move and crouching punch | open | Commodore manual / wiki controls; trace exact direction/facing rules |
| Enemies can hold the fighter while another attacks | open | Commodore manual / wiki stage-one description |
| Motorbike riders can be kicked off their bikes | open | Commodore manual / wiki stage-one description |
| A baseball bat can be taken from an enemy | open | Commodore manual / wiki stage-one description |
| Stage two includes an armed enemy with a reload interval | open | Wiki description |
| Later enemies include dogs and Mr. Big | open | Commodore manual / wiki stage descriptions |
| Bottom panel displays endurance, lives, score, level, and time | live | First-stage screen shows score 000000, level 1, endurance bar, lives 5, and a running timer |
| Supplied edition starts with five lives; wiki describes three | differs | $8000 stores $35 AND $0F = 5 at $020C; first-stage display says LIVES 5 |
| Extra life at 50,000 points, then each additional 100,000 | open | Commodore manual / wiki; trace before treating as a rule |
| Attack scores vary from 200 to 2,000 | open | Commodore manual / wiki; trace award table |
| Commodore key pauses/resumes | open | Title legend and wiki; test during play |
| Space switches music on/off | open | Title legend; test during play |
| Ending follows the final fight | open | Wiki ending picture; reach native ending load |

## Open questions

Detailed fighting, scoring, and level rules remain open for a later pass. A documented feature has not been declared absent because it has not been reached.
