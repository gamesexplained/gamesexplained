# ACE 2 — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The C64 instructions as transcribed on c64.krissz.hu, "ACE 2 - play online", https://c64.krissz.hu/ace-2/play-online/, read 25 October 2026. The section "Arming The Aircraft" that the text points to, and the instrument panel diagram, are not in the transcription.
- The Amstrad and Spectrum inlay (Gamebusters re-release), text on World of Spectrum, https://www.worldofspectrum.org/pub/sinclair/games-info/a/ACE2-TheUltimateHeadToHeadConflict.txt, read 25 October 2026: the same quick-play guide with other keys.
- Wikipedia, "ACE 2 (video game)", https://en.wikipedia.org/wiki/ACE_2_(video_game), read 25 October 2026: credits and reviews.
- The game's own screens and strings (`$6704`-`$6E96`, stored in a letter cipher that `$6F7F` undoes), from `work/entry.vsf`.

## Features

| Feature | Status | Where |
|---|---|---|
| One or two players, each flying a different fighter; plane one from a carrier, plane two from an airbase | differs | the two planes fly by the same code with the same numbers (`$4252`, `$5A1C`, loadouts at `$74E9`-`$7508`); only their hangar pictures (`$F2B3`, `$F3C1`), panels and bases differ. Plane one takes off from the west edge of the map, plane two from the east (`$2F8E`) |
| One player: the computer flies plane two, at a skill level the options set | traced | `$5A1C` clears plane two's stick and keys and calls `$5B47`, which acts on a throw of 0-21 only when it is below the skill (`$090D`); side panel COMPUTER LEVEL (`$1C44`) |
| Two games: a close-range dogfight (cannon and heat-seekers, both planes already flying, placed close together at random) and the full-scale aerial and ground attack (spy ship, radar station, airbase) | traced | `$090E`; take-off `$2F8E`: in the dogfight 20,000 feet plus up to 1,023, a random heading, within 20 of the other plane when it is flying, loadout 3,000 rounds and 8 heat seekers; in the full-scale game the two ground targets are placed by `$308C` |
| A pilot shot down gets a fresh plane; the game ends when one pilot has none left | differs | `$0E1D`: a pilot with no planes left sees ALL AIRCRAFT DESTROYED (`$6339`), or MISSION COMPLETED in the full-scale game, and the game ends only when both pilots are out of planes (`$54C0`) or a pilot with none presses fire; the full-scale game also needs the other side's ground target destroyed (`$64B4`) |
| Options: one or two players, the computer's skill level, the scenario, planes each, crash detection on or off, missile hits to kill an aircraft, save the options to disk | live | options screen (`reference/options.png`), `$2970`, `$635D`; the record `$0903` is written to track 18 sector 2 |
| Colour code security system: the colour of a square of the grid on the inlay; three wrong answers wipe the game | live | `$37E1`; the game's own copy of the 40 squares asked about is at `$FA00`. Asked for square DD 5, the game accepted orange (8), the colour in its table |
| Plane one: joystick in port 1, F more power, S less, X map view, E select weapon, Q flares and chaff | traced | key flags `$0200`-`$020D` (`$366B`): F `$0205`, S `$0204`, X `$0201` (`$0DAF`), E `$020B` (`$0D7D`), Q `$0209` (`$0D6E`) |
| Plane two: joystick in port 2, H more power, K less, V map view, U select weapon, T flares and chaff | differs | K is more power and H is less (`$4252` is passed K, `$0207`, as more and H, `$0206`, as less; `$21B6` presses them the same way); V `$0202` (`$1008`), U `$020C`, T `$020A` |
| F3 held: quit the game and restart; F5 held: music on or off during the game | traced | `$11E9`: each needs ten passes held; F3 ends the game through `$54C0`; F5 swaps the music and the sound effects (`$4EAD`, `$E574`) |
| Stick up and down changes the pitch, left and right banks; a steep bank with the stick pulled back turns quickly; in a steep bank the stick has little effect on pitch | traced | `$29FC`: how often the stick changes the pitch depends on the bank (`$6F56`); the heading turns by `$5143` from the bank, the roll and the stick, in the interrupt (`$43FC`) |
| Above 75 % power the afterburners light: much more thrust, heavy fuel use; needed above Mach 1.0 (about 760 knots) | traced | `$4252` halves the thrust below throttle `$C0` (75 % of 255); `$43FC` halves the fuel burnt below `$C0` |
| Stall speed 140 knots; ceiling 60,000 feet | traced | `$5A1C`: below a speed of 140 STALL WARNING and the nose is pushed down; above 58,880 feet CEILING 60000 and the nose is pushed down now and then |
| The plane is faster and more agile in thin air (high altitude) | traced | `$4252`: thrust is multiplied by 126 plus the altitude / 512 |
| Cannon: less than 1 mile | differs | a hit needs the enemy drawn as a medium or large picture (`$D8`, `$2C86`), which is a range below 2.0 on the RANGE read-out (`$3F2E`), and in the sight (`$1769`); then a chance of one in four a pass (`$181B`) |
| Heat-seeking missile: less than 8 miles | traced | `$23E0`: range below 8 and ten passes with the enemy boxed lock it; once fired it needs nothing more |
| Radar-guided missile: less than 25 miles, guided to the target | traced | `$23E0`: range below 25; the box must stay on the target or the lock breaks (LOCK BROKEN) |
| Air-to-ground (ship) missile: below 2,000 feet, slower than 500 knots, guided | differs | `$23E0`: range below 4 and below 2,304 feet; no speed is checked, there or at the launch (`$2243`) |
| Arming the aircraft: the pilots choose the weapon load in the full-scale game | traced | `$5852`: up to 9 heat seekers, 7 radar missiles and 2 of the third kind, within a load of 16 (`$5949`); the computer arms its plane by chance (`$109D`) |
| Six flares and six chaff pods; the game picks the one that fits the missile; best at about 1 mile | traced | six each at `$0BFF` and `$208E`; `$2531` drops chaff against a radar missile and flares against a heat seeker; `$265B`: a flare turns a heat seeker within 2 |
| A hit leaves the controls dead for a few seconds | traced | `$27FB` sets the hit timer `$0254` (8 for a cannon hit, 25-32 for a missile); while it runs `$5A6F` takes the stick over and shakes it; it counts down every fourth tick of the 50 a second clock (`$43FC`): about 0.6 seconds for a cannon hit, 2 to 2.6 for a missile. CONTROL LOST shows only in the spin after a kill (`$5A1C`) |
| Return to base: plane one off the west edge of the map below 1,000 feet, plane two off the east edge; repaired, rearmed and refuelled | traced | `$3D57` holds a plane at its own edge (state 2); `$1FAD`: below 1,024 feet with the nose near level OK FOR LANDING, landing with the wings level resets the plane (`$208E`: fuel full, six flares and six chaff, damage cleared) |
| Surface-to-air missiles defend the ground targets | traced | `$64CD`: the enemy within 6 of the target and below 13,824 feet, a chance of 10 in 256 a pass |
| The planes can collide | traced | `$282F`: within `$1A` across and `$1E` in height |
| Map view: both planes' positions | traced | `$13EA`: the planes, the missiles and both ground targets, blinking |
| Scoring: 20 a cannon hit, 50 a missile hit, 200 a plane destroyed, 2,000 a ground target | traced | `$181B` (20), `$2531` (50), `$282F` (200), `$250C` (2,000); scores are kept in tens (`$1C25`) |
| Fuel runs out; "FUEL IS LOW" | traced | `$43FC` burns fuel by the throttle; `$282F` flashes FUEL IS LOW below `$30`; `$594F` runs the throttle down with none left |
| Greatest Aces: the top five scores with names, entered by the pilot, saved to the disk | traced | `$54C0`, `$5738`; `$1F30` writes the table to track 18 sector 3 |
| Demo mode: the computer flies both planes between title pages | live | `reference/demo-mode.png`; `$0BCA`: a one-player dogfight at skill 20 |
| Title music by Rob Hubbard | live | driver `$E03F`; the tune runs 5,880 steps (5 minutes 14 seconds) before it starts again |

## Beyond the documentation

Found in the strings and the code, not in the manual.

- **The hamster cheat** (traced, and live). The programmer's message (`$51B4`-`$53D3`) says a hacker will find the hamster's name in the code. It is at `$6A30`, enciphered: DUSTY BUG. After a game `$5634` compares the first eight letters of the name buffer with it, whether or not anyone qualified for the table, so DUSTY BU is enough, and so is a pilot two entry. The flag `$0975` is never cleared and is saved to the disk with the high scores. With it set plane one burns no fuel, cannot die (`$0D93`, `$27FB`) and the side panel shows IMMORTAL in place of the planes left (`$1C44`). Set in the kit's machine, the fuel stopped falling and the side panel showed IMMORTAL.
- **YOU TRAITOR** (traced). Message 12 is in both pilots' lists (`$7432`, `$7472`), but every call to the message routine `$34F8` passes a fixed number and none passes 12, so the message never shows. Message 19, a first copy of TARGET LOCKED, is never shown either.
- **The NMI repair** (live). Twice a frame `$6066` breaks two bytes of the game and starts a timer on CIA 2 whose NMI, a few cycles later, repairs them (`$2AA6`). With the NMI vector pointed anywhere else, the two bytes stayed broken in the kit's machine.
- **The chaff bug** (live). With no chaff left, the NO CHAFF path at `$25EF` runs on with the message number in X, and moves plane two by a fraction of a map square, whichever pilot pressed the key.
- **Plane two's weight uses plane one's fuel** (traced): `$282F` divides plane one's fuel by 64 for both planes.
- "PAUSE ON" (`$6E98`): RUN/STOP pauses (`$12FF`).
- An older copy of the game's text and tables at `$C000`, loaded but never read: the same block as `$6730`-`$712F`, with the text in plain letters.

## Open questions

None.
