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
| Boots from side 1 to a credits screen, then the commentator and the menu | live | `reference/title-loading.png`, `reference/title-credits.png`; RECO (`$BC64`, 50 bytes) is read at boot |
| Menu of five events and the Galactic Championship, picked with the joystick and fire | live | `reference/menu.png`; menu `$0FF4` |
| Each event loads on its own; side 2 events ask for the disk to be turned over | live | `reference/side-prompt.png`; menu; resident `$0800` |
| Each event opens with its name in big letters, then (manual and reviews) a humorous text introduction | confirmed | the name: resident `$C540`, `reference/*-title.png`; the text is the menu's commentator, typed before each event loads (menu messages) |
| 100m Slither: DOWN bunches the worm, UP stretches it; rhythm sets the speed | confirmed | slither `$3388` (DOWN adds 2 to the speed, at most 8), `$34DE`, `$350F` (a late press takes speed off) |
| 100m Slither: DOWN then RIGHT gives a "super-slither" | confirmed | slither `$3247`: RIGHT with 12 or more slime, speed `$10`, costs 12 slime |
| 100m Slither: FIRE squirts slime; a dry slime gland overheats the worm, which bursts into flames if not slowed | confirmed | slither `$32FF` (FIRE spends 2 slime, cools by 4), `$1547` meters, `$346C` burnt |
| 100m Slither: disqualified after 70 seconds | traced | slither message 3 "TIME LIMIT EXCEEDED RACE TERMINATED" (`$27AD`), result `$82` (`$291F`); the 70 seconds were not timed |
| 100m Slither: two lanes, each scrolling on its own | live | `reference/slither-race.png`; slither `$15DA`, `$16DC` |
| Space Hockey: goals are black holes left and right that suck in players; the puck is a creature that tries to stay out | confirmed | hockey `$1A51`, `$1B15` (pull grid); the puck is pushed away except while dazed |
| Space Hockey: FIRE brakes, stopping the rebound after a hit | confirmed | hockey `$1DF5`: five frames of brake |
| Space Hockey: 3 points for the puck in the opponent's hole, 1 point when the opponent falls into either hole | confirmed | hockey `$0D91` |
| Space Hockey: four rounds of 60 seconds; a scanner shows puck and players | confirmed | hockey `$0BA0`, `$0CA8`, `$188A`; level scores give an overtime round (`$0CC1`) |
| Space Hockey: a demo mode plays before the match | live | `reference/hockey-demo.png`; hockey `$0C93` |
| Psychic Judo: hold FIRE to charge a bolt from the reserve, release to launch, steer it round the shields | confirmed | judo `$1F0D`, `$3567` (1 from the reserve every 5 frames) |
| Psychic Judo: shields over six body zones; FIRE with a direction covers pairs | confirmed | judo `$2A34`, `$2C30` (16 x 16 body map) |
| Psychic Judo: catching a bolt adds to the reserve, a hit costs energy | confirmed | judo `$2B37` |
| Psychic Judo: rounds of 60 seconds, best of five; a timed-out round is replayed | confirmed | judo `$1D2A`, `$1DB8`, `$1DE5` |
| Head Throwing: alternate LEFT and RIGHT to run up | confirmed | head `$1AC4` |
| Head Throwing: hold FIRE while the angle turns, release to throw | confirmed | head: the angle drops a step every 10 frames, and throws by itself straight up at 0 |
| Head Throwing: alternate UP and DOWN to waggle the ears for lift | confirmed | head: DOWN flaps (lift for 10 frames), UP is needed between strokes |
| Head Throwing: FIRE before landing sticks the nose in; too early it topples, too late it does not tip | confirmed | head: FIRE starts the head turning; a landing angle of `$0C`-`$0F` sticks |
| Head Throwing: three throws each, longest wins; foul over the line or if the nose does not stick | confirmed | head `$1EBC` end_contest (with a bug: see Beyond) |
| Metamorph Marathon: obstacle course against the clock; two players take turns (`marathon_main` `$1FDC`, message 6 `$2F9F`) | live | `reference/marathon-play.png` |
| Metamorph Marathon: from the blob, RIGHT Runner, LEFT Burrower, DOWN Jumper, UP Flyer; FIRE back to the blob | confirmed | marathon `$1F1A` form, `$1F1C` shape sets |
| Metamorph Marathon: four red energy bars, power pills refill; the run ends when energy runs out | confirmed | marathon `$1F1F` (16 bits, four bars of `$100`), `$1F31`, `$1F1E` |
| Events 1 to 4 two players; the computer takes the second player when the same fire answers both prompts | differs: in Slither, Hockey and Judo the computer plays player one ("PLAYER ONE IS COMPUTER"; slither `$0B68`); in Head Throwing it takes player two after 256 frames with no fire (head `$1CBB`); the keyboard with joystick two is refused in Slither, Hockey and Judo | `reference/hockey-play.png`; hockey `$24BE`, judo `$3D40`; slither's pace-maker `$3632` |
| Player 2 on the keyboard: `@` up, `:` down, `K` left, `H` right, up-arrow fire, RUN/STOP quits | differs | the code reads `H` as left and `K` as right (slither `$35DE`, hockey `$2468`, judo `$3F0C`, head `$2BB3`); any player may take the keyboard |
| QUIT gives a choice between replaying the event and the menu | differs | RUN/STOP leaves for the menu at once (slither `$30A8`, hockey `$2DE7`, judo `$6D36`, head `$34DB`); all five events carry a message "STOP TO QUIT ANY KEY TO CONTINUE" that nothing shows (slither `$2840`, hockey `$2DC1`, judo `$3CE3`, head `$2B8E`, marathon `$3045`) |
| Galactic Championship: every event in turn, scored overall | confirmed | menu sets `$B800`; resident `$D32D`, the points at marathon `$AD0C`, the champion `$D619` |
| Records kept on disk (file RECO on side 1) | confirmed | resident `$BC64`, `$D005`, `$D77D`; the menu saves RECO when `$08FE` is set |

## Beyond the documentation

Found in the code, not in the manual.

| Feature | Status | Where |
|---|---|---|
| Space Hockey pauses on the Commodore key | confirmed | hockey `$1176` |
| A Galactic Champion's name and points are kept on disk, with a name entry for a new champion | confirmed | resident `$BC8C`, `$D619` |
| A closing title after the championship, reading THE END | traced | resident `$B8A7`; title 5 at `$C857` places shapes T, H, E over E, N, D, the same shapes the other titles spell with; not reached live |
| Title screens: a starfield of 80 stars and rainbow letters | live | resident `$CD29`, `$C965` |
| Head Throwing: player one ahead by less than a metre is called a draw whenever the metres of the difference are zero (equal metres and ahead on centimetres, or a metre ahead and behind on centimetres) | confirmed | head `$1EBC` |
| Metamorph Marathon: player two's best time is dropped when its two bytes are equal (the test is CMP #$FF with BNE where player one's is CMP #$99 with BEQ) | confirmed | marathon `$7451`, `$746F` |
| Psychic Judo's records keep only seconds and hundredths: the minutes byte is never copied, which cannot show because the record on the disk is under a minute | confirmed | resident `$D77D`, `$BC70` |
| The resident's volume clear reads the write-only `$D418` and ANDs with a zero-page byte | confirmed | resident `$B86C` |
| Leftovers of earlier builds in every event file | confirmed | slither, hockey, head (`$35D5`), menu (`$2564`): an earlier Psychic Judo |

## Open questions

None: the closing title's letters were read from its entry (title 5 at `$C857`).
