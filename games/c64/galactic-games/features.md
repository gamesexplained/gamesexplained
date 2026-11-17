# Galactic Games — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The instruction text for the Spectrum, Amstrad and C64 versions, https://spectrumcomputing.co.uk/pub/sinclair/games-info/g/GalacticGames.txt, read 17 November 2026
- GameBase64 entry, https://www.gb64.com/game.php?id=3013&d=18, read 17 November 2026
- Zzap!64 issue 34 (February 1988), page 17, https://archive.org/details/zzapp_64_issue_034_600dpi, read 17 November 2026
- Commodore User issue 53 (February 1988), page 28, https://archive.org/details/Commodore_User_Magazine_Issue_053, read 17 November 2026
- The game's own screens, from the two G64 disk sides in the emulator

## Features

| Feature | Status | Where |
|---|---|---|
| Boots from side 1 to a credits screen that cycles while the event menu loads | live | `reference/title-loading.png`, `reference/title-credits.png` |
| Menu of five events and the Galactic Championship, picked with the joystick and fire | live | `reference/menu.png`; menu part |
| Each event loads on its own; side 2 events ask for the disk to be turned over | live | `reference/side-prompt.png`; resident `$0916` |
| Each event opens with its name in big letters, then (manual and reviews) a humorous text introduction | open | `reference/*-title.png` |
| 100m Slither: DOWN bunches the worm, UP stretches it; rhythm sets the speed | open | slither part |
| 100m Slither: DOWN then RIGHT gives a "super-slither" | open | slither part |
| 100m Slither: FIRE squirts slime; a dry slime gland overheats the worm, which bursts into flames if not slowed | open | slither part; TEMP and SLIME meters in `reference/slither-ready.png` |
| 100m Slither: disqualified after 70 seconds | open | slither part |
| 100m Slither: two lanes, each scrolling on its own | live | `reference/slither-race.png` |
| Space Hockey: goals are black holes left and right that suck in players; the puck is a creature that tries to stay out | open | hockey part |
| Space Hockey: FIRE brakes, stopping the rebound after a hit | open | hockey part |
| Space Hockey: 3 points for the puck in the opponent's hole, 1 point when the opponent falls into either hole | open | hockey part |
| Space Hockey: four rounds of 60 seconds; a scanner shows puck and players | open | hockey part; `reference/hockey-play.png` |
| Space Hockey: a demo mode plays before the match | live | `reference/hockey-demo.png` |
| Psychic Judo: hold FIRE to charge a bolt from the reserve, release to launch, steer it round the shields | open | judo part |
| Psychic Judo: shields over six body zones; FIRE with a direction covers pairs | open | judo part |
| Psychic Judo: catching a bolt adds to the reserve, a hit costs energy | open | judo part |
| Psychic Judo: rounds of 60 seconds, best of five; a timed-out round is replayed | open | judo part |
| Head Throwing: alternate LEFT and RIGHT to run up | open | head part |
| Head Throwing: hold FIRE while the angle turns, release to throw | open | head part |
| Head Throwing: alternate UP and DOWN to waggle the ears for lift | open | head part |
| Head Throwing: FIRE before landing sticks the nose in; too early it topples, too late it does not tip | open | head part |
| Head Throwing: three throws each, longest wins; foul over the line or if the nose does not stick | open | head part |
| Metamorph Marathon: one player, obstacle course against the clock | live | `reference/marathon-play.png` |
| Metamorph Marathon: from the blob, RIGHT Runner, LEFT Burrower, DOWN Jumper, UP Flyer; FIRE back to the blob | open | marathon part |
| Metamorph Marathon: four red energy bars, power pills refill; the run ends when energy runs out | open | marathon part |
| Events 1 to 4 two players; the computer takes the second player when the same fire answers both prompts | live (hockey: "PLAYER ONE IS COMPUTER") | `reference/hockey-play.png` |
| Player 2 on the keyboard: `@` up, `:` down, `K` left, `H` right, up-arrow fire, RUN/STOP quits | open | |
| QUIT gives a choice between replaying the event and the menu | open | |
| Galactic Championship: every event in turn, scored overall | open | resident `$D000` |
| Records kept on disk (file RECO on side 1) | open | resident `$BC64` |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions

- Which control port each player uses: fire on port 1 and on port 2 both started things in the menu.
