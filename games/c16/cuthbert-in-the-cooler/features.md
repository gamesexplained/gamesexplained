# Cuthbert in the Cooler — features

## Sources

- [Microdeal's C16 cassette instructions](https://plus4world.powweb.com/dl/covers/c/cuthbert_in_the_cooler_back.gif), read 11 November 2026, saved as `reference/web-cover-back.gif`. Primary controls and rules source.
- [Cuthbert In The Cooler – Plus/4 World](https://plus4world.powweb.com/software/Cuthbert_In_The_Cooler), read 11 November 2026. Game Rules and Cheats are checked against the supplied program. External cover and gameplay images are in `reference/`.
- [Cuthbert In The Cooler – Centre for Computing History](https://www.computinghistory.org.uk/det/31367/Cuthbert-In-The-Cooler/), read 11 November 2026. C16/Plus4 cassette, Microdeal, 1985.
- The supplied PRG's screens and code; the reproducible state is specified in `orientation.md`.

The Dragon/CoCo release and Game Boy remake describe other programs. Their controls and rules are not attributed to this C16 image.

## Features

| Feature | Status | Evidence |
|---|---|---|
| Collect every object, then leave through the top exit. | confirmed | `draw_maze_packet` counts object packets; `collect_object` decrements the count; `move_player` requires zero objects and player_y=0 for the upward exit. Original-code comparisons exercise all ten object sets. |
| Guards move through the corridors and kill Cuthbert on contact. | confirmed | Enemy update and direction selection at $1C47/$1DCC/$1E64; player contact range $69-$F9 at $1A34; live first-maze references. |
| Keyboard movement is RUN/STOP up, COMMODORE down, L left and colon right. | confirmed | Row/mask tables $136D/$1372 and controlled live input flags from the same boundary. Allowed down/right moves and blocked initial left/up moves are observed. |
| Joystick port 1 provides movement and fire. | traced | $1378 selects $FB and reads direction bits plus bit 6 for fire. The emulator's joystick hardware checks passed; the game-specific control probes used keyboard equivalents. |
| Starting Cuthberts. | differs | The cassette says three. This image shows spare digit 4 and reaches game over after five live forced timeouts. |
| Objects increase the score. | confirmed | Key/ring/apple parameters are 1/2/3 hundreds. Every original object record is tested through the collector. The adder loses overflow remainder, so actual gains can differ from face values. |
| Finishing quickly earns a time bonus. | confirmed | Reset shows 20 segments; one is consumed per 100 main-loop updates. Completion makes four ten-point additions per remaining segment. This clock follows game updates, not fixed real seconds. |
| Extra lives come from score milestones. | confirmed | $1952 compares the ten-thousands character before redraw. Original-code tests exercise the limit error and every award through its zero-byte failure. |
| Three starting bombs. | live | $7B=3 at the verified first-play boundary; a legal bomb route ends with two. |
| Fire lays a bomb and a second press detonates it. | differs | The code accepts a held fire flag after a six-update delay. Holding SPACE from first play lays and detonates the bomb without releasing it. |
| Explosions can kill Cuthbert and guards. | confirmed | Player range check and guard checks accept fire glyphs $69-$6C. A guard-kill test confirms the score call; the legal held-fire route produces five live explosion deaths. |
| An extra bomb is awarded for a completed screen. | live | Forced completion of level 255 advances to 0 and changes bombs 3→4 through the original transition. |
| Up to nine bombs can be stored while five icons are drawn. | confirmed | Completion caps $7B at nine; $1F49 clamps drawing to five. A live inventory of nine draws five icons. |
| Ten layouts repeat. | confirmed | Ten 24-byte records at $2011-$2100. Decoder matches full original characters/attributes for all 256 level numbers; all ten layouts have live screenshots. |
| Guard count depends on the tens digit. | confirmed | Four for tens=0, five for tens=1, six for tens=2-9. Original-code tests include all level bytes and verify the active slots and spawn addresses. |
| Enemy shapes and colours repeat every four/eight levels. | confirmed | Eight-entry tables at $1B97/$1B9F; every level byte is compared with the original initialiser. |
| Level 255 is followed by 0. | live | Original transition with the normal exit preconditions produces level byte 0 and returns to the next gameplay loop. The boundary is forced, not reached by a full played route. |
| Extra-life limit has a 208-attempt boundary. | confirmed | $FF permits 208 decrements to game over. The next award wraps the inline character to zero and enters BRK at $1A27, verified live in the C16 monitor. |
| Game over retains a high score and shows mazes until fire restarts. | traced | $118D compares/copies the six digits, clears the score, chooses timer-derived nonzero levels and polls fire. Live death checks stop at its entry; no claim of a separate title screen is made. |
| P pauses and R resumes. | live | Matrix polling at $1339; P stops in the scan loop and R returns play to $1172. |
| Graphics and sound. | confirmed | Original-data frame reconstruction matches 64,000 pixels; all source frames are shown on Graphics. Three audible sound excerpts regenerate from original-code input routes. |

## Beyond the documentation

- Carry remainder is discarded by the score adder. Seven apples from zero give 1900 rather than their nominal 2100; 800+300 gives 1000 live.
- A bomb planted at the starting exit persists through death. Holding SPACE without moving consumes all five attempts at input polls 8–12, reproduced in plus4emu and on the kit's C16 model.
- A guard destroyed by fire ends the entire enemy scan for that update.
- Each enemy bank retains a fifth image beyond the normal four shape selectors. A further 24-byte graphics tail has no established intended arrangement.
- The seventh allocated enemy slot is inactive in normal play and has a faulty glyph-destination calculation.

## Open questions

- **open:** who programmed this C16 version? The scanned cassette credits Microdeal without a named programmer.
- **open:** which exact preserved release produced this packed PRG? Its code addresses match the catalogue's C16 cheat addresses, but no alternate release was downloaded for comparison.
- **open:** what was the intended use of the retained fifth guard images and graphics tail?
