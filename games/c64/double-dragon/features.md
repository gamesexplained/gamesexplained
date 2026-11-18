# Double Dragon (C64): feature checklist

## Sources

The supplied AD and TO G64s, run in VICE with PAL video and drive emulation. Title and first mission captures are in `reference/`. Both titles show 1988 and name Technos Japan as licensor and Binary Design for the conversion. AD credits Arcadia Software; TO credits Mastertronic. The disk directory and byte comparison are recorded in `orientation.md` and `media.json`.

The [1988 Melbourne House instructions](https://uta.pokefinder.org/Ultimate_Tape_Archive/Double_Dragon_%281988_Melbourne_House%29_%5B10075%5D/Extras/Instructions.pdf) have a separate Commodore 64 section. The controls, stage count and programmer's note below come from that section. The [July 1989 *Compute!* review](https://www.commodore.ca/gallery/magazines/compute/Compute-110.pdf) describes the Arcadia release. Its reports are hypotheses to check on these two disks.

| Feature | Status | Evidence or question |
|---|---|---|
| Title offers one or two players | live | The TO title labels keys 1 and 2. On both disks, key 1 began a one-player game and key 2 set the two-player selector at `$2F0A`. The two-player port assignment was also tested. |
| Opening street | live | First mission screenshot shows a fighter outside a garage next to the English Tearoom frontage. |
| Status panel | live | First mission screenshot has counters and coloured bars for each side and a central countdown display. The timer decreased from 70 to 68 in the 800-frame test on both disks. Score, health and lives rules remain open. |
| Joystick movement and combat | live | Port 2 moved the lone fighter right and down on both disks. Fire changed the animation state. Individual attacks, collisions and recovery remain open. |
| Mission progression and ending | confirmed | On both disks, setting the requested load index then letting the native transition run reached six street or interior scenes and the ending. Normal progression triggers and retained state remain open. |
| Game over display | confirmed | Setting the game-over flag led both builds through their separate display routines. The two captured `GAME OVER` screens are pixel-identical. |
| Music and effects | live | VICE measured about one update per frame in the title, gameplay and ending. The page plays all twelve selections from the original driver. The complete list of cue callers remains open. |
| Differences between AD and TO during play | live | The six level files match byte for byte and the same joystick port moves the lone fighter. Both Game Over screens match visually, though the loaders use different routines. Broader gameplay equivalence remains open. |

| Eight directions and fire combinations | live | The manual gives eight ways to move. It lists punch, kick, elbow, head-butt, hair grab, turning kick and three jump directions. It says to reverse the horizontal directions when facing left. All 36 unarmed fire input cases agreed across the disks. Contact rules and the effect of carried weapons remain open. |
| Dropped weapons | documented | The manual says a player can take and use an opponent's weapon after defeating them. Trace how the game distinguishes a bat, whip and other objects. |
| Cooperative play | live | Key 2 started a simultaneous game on both disks. Port 2 moved the first actor and port 1 moved the second in separate controlled tests. |
| Running out of time | live | The manual warns that the timer costs a life. Both disks keep the life when 01 becomes 00, then subtract a life, refill health, clear held weapons and reset the timer to 70 on the following tick. |
| Five stages and a victory cue | documented | The manual says a tune plays on completion and counts five stages. Native loading exposed six numbered resources and a separate ending. Establish the relation between the six files and the printed stage count. |
| Sprite stacking and the waist gap | traced | The programmers' note describes the use of sprite stacking and warns of a gap at the waist. The raster code positions a pair of shapes above the waist, then assigns another pair below it. The exact circumstances of the gap remain open. |
| Upper edge jump affects enemy movement | open | *Compute!* reported that jumping at the top of the play area freezes enemy movement while they can still attack. Reproduce it and compare against jumping farther down. |
| Return from the ending | live | Each disk reached the final pose, then entered the title at `$1A60` on fire. The TO test used port 1 and the AD test used port 2. |
