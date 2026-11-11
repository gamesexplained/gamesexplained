# Icicle Works: feature checklist

This is the supplied 64 KB Plus/4 program. The original leaflet names the
Plus/4 and C64 versions. Confirmed means observed in plus4emu; traced means
followed through the original code. A routine test does not establish a
legal input route through a complete game. A stock 16 KB C16 cannot hold
this program; expanded C16 compatibility is open.

| Feature | Status | Evidence / limit |
|---|---|---|
| C selects keyboard/joystick; M toggles music; P selects one/two players | confirmed | All three title toggles observed; `$891A`. |
| SPACE/fire begins; idle title starts a demonstration; any key returns | traced; delay open | `$891A` polls SPACE/fire and a three-byte idle counter; `$8EAD` steers the demonstration. Demonstration observed. The leaflet's exact 45-second delay was not measured. |
| Keyboard P/L/A/S moves up/down/left/right | confirmed | All four intents, plus SPACE, observed at `$6D42`; neutral control compared. |
| SPACE/fire digs or collects beside Santa without moving | confirmed and traced | `$6CA0` handles the held-fire path; keyboard/port-2 fire intents observed. Door opening has its own completion/fire checks at `$6C46`. |
| H pauses/resumes; RUN/STOP sacrifices a life; ESC aborts | confirmed | Pause held time for 100 frames; resume restarted it; sacrifice reduced spares from 2 to 1; ESC reached the title. |
| Three lives; timeout loses a life | confirmed | Two spare lives plus the active life. An assisted time of 0001 reached death effect `$6E32` at 0000. |
| Santa clears snow; enemies and objects use the cleared passages | traced and observed | `$6BCC/$6CA0` movement; `$6F53` grid simulation. First-room movement and digging observed. |
| Snowballs fall, roll, crush Santa, and can be pushed horizontally | traced and tested | `$6F91/$70A3`; rolling tries left before right. Full original sweep distinguishes already-falling from stationary objects above Santa. Horizontal push path `$6DB9`. |
| Penguins and bears are lethal on contact; falling objects crush them | traced and tested | `$7141/$71C2`; contact reaches ordinary explosion; an object above an enemy triggers crushing even without the falling flag. |
| Crushing a penguin produces presents | traced and tested | `$71C2` starts gift explosion 14, resolved by `$7284` into parcels. Original branch checked by the independent listing sample. |
| Parcels assemble the toy at lower right | confirmed and tested | First toy is a car. All sixteen room loads and every assembly prefix agree with `$6377/$73F7`. |
| Completion flashes the screen, sounds a ping, and unlocks doors | traced and tested | Completion call `$6190`, conversion `$66CD`, higher collection tone `$6C68`; original door rule tested on 64 combinations. |
| Spare parcels become bonuses worth 20 points | traced | `$66CD` changes tile 6 to tile 5; `$6EC8` adds 2 internal BCD units and display appends zero. |
| Holding fire toward a door leaves a finished room | traced and tested | `$6C46-$6C65`; all sixteen destinations with completion/fire combinations. |
| Sixteen interconnected rooms with different requirements | confirmed and tested | All sixteen original room loads match 38-by-27 nibble decoding, toy windows, and times. Maps tab draws every room and exit. |
| Completed rooms can be revisited; parcels become bonuses; time retained | differs | `$6377` gives every completed room 40 countdown units on loading. The persistent completion flag is saved on door exit at `$61AA`; `$66CD` clears only the active flag. |
| Extra lives every 1,000 points | confirmed | `$6EEA`; assisted 990-point score plus an adjacent parcel reached 1,000 and increased spares from 2 to 3. |
| Springs spread into passages; animals block them | differs; reachability open | `$70F9` accepts low tile kinds 0-3, including bears/penguins. Original routine tested on 4,096 cases with successful controls. A legal room route demonstrating water replacing an enemy remains open. |
| High-score table with three-letter names | differs; confirmed | `$8D5E` accepts five letters/spaces. Assisted qualifying score accepted and stored ABCDE; all 256 byte inputs and editing sequences checked against original code. |
| Music and sound effects | confirmed and tested | Two complete tunes and four effect examples on the page; original sound writes match independent emulator captures. Melody names remain open. |
| Two-player alternation | traced | Death path from `$6253` selects the next player; room, score, and completion state are separate. Full alternating playthrough remains open. |

## Sources

Read on 11 November 2026, with the contributor's permission:

- [Original Commodore Multi Soft instruction leaflet, page 1](https://plus4world.powweb.com/dl/covers/i/icicle_works_inst1.gif), saved as `reference/web-instructions-1.gif`.
- [Instruction leaflet, page 2](https://plus4world.powweb.com/dl/covers/i/icicle_works_inst2.gif), saved as `reference/web-instructions-2.gif`.
- [Icicle Works at Plus/4 World](https://plus4world.powweb.com/software/Icicle_Works), preservation catalogue and external screenshots `reference/web-title.gif` and `reference/web-play.gif`. The catalogue year is 1985; its release table separately says 1984. The title screen says 1985, used for this build.
- Bundle instructions: `reference/web-bundle-instructions.jpg`.
- Ulysses777's published map: `reference/web-map.gif`, linked from the same catalogue.
- Tune-name searches included `"Icicle Works" music tune title Jingle` and `"Icicle Works" "Plus/4" music tune`. [Music discussion](https://plus4world.powweb.com/forum/8730), [Doug Turner discussion](https://plus4world.powweb.com/forum/35837), and [memorial discussion](https://plus4world.powweb.com/forum/45086) did not settle the names.

No game program was downloaded. The only program input is the supplied PRG.
