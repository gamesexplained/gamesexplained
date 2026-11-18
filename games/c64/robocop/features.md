# RoboCop — features

What the game is documented to do, with verification status against the
code. Statuses: **open** (documented, not found yet), **traced** (in the
code, could not be exercised; say what was tried), **confirmed** (in the
code, consistent with the emulator), **live** (observed directly),
**differs** (the code does something else).

Sources:

- C64-Wiki (German), "RoboCop", https://www.c64-wiki.de/wiki/RoboCop, revision 273285, read 17 November 2026: description, controls, upgrades, points, walkthrough, cheats, bugs.
- Zzap!64 issue 47 and Commodore User issue 64, the C64 reviews, as text from scans of the magazines on the Internet Archive, read 17 November 2026.

## Features

| Feature | Status | Where |
|---|---|---|
| Nine stages in three loads: two streets with a hostage stage between, the photofit, the drug factory, OCP with ED-209, the lifts, the steel mill, the boardroom | live | level-1 `$80B1`, `$80D7`, `$80FC`; level-2 `$8106`, `$80C5`, `$814F`, `$8191`; level-3 `$80BF`, `$80FB`; every stage seen (`reference/play-stage*.png`) |
| Joystick in port 2: walk, aim up and on the diagonals, jump, duck, fire | confirmed | move tables level-1 `$8B3C`, level-2 `$8EC7`, level-3 move tables A `$89D3` and B `$8A09` |
| Stairs in stages five, seven and eight | differs | stages five and seven have them (level-2 stair state `$079F`, seen in stage five); level three's stair code is a leftover of level two that no instruction reaches (level-3 `$9371`, `stairs_up_here`), so stage eight has none |
| Hostage stages (two and nine) with a crosshair; hitting the hostage is punished | confirmed | level-1 hostage stage `$8176` (20 hits on the gunman, HOSTAGE KILLED at 0:00); level-3 `$8A3F-$8ACA` crosshair, Dick Jones hit boxes `$AA98`, hostage hit is 24 damage, death |
| The photofit (stage four): match six features of the face | live | level-2 `$8681`, `$EF28`, faces `$EE73-$EF84`; MISMATCH turns the background red |
| Stage six: RoboCop cannot fire on ED-209 or Dick Jones, only punch | confirmed | level-2 punch hits `$8419` (70 points each, the sixth scores 300 more and destroys it) |
| Pickups: baby food (power), three-way shots, armour-piercing shots; they vanish after a while | confirmed | level-1 pickup routines `$9CEB`, three-way 15 shots `$07C1`, expiry; level-3 adds the Cobra cannon `$A688` |
| Power bar instead of lives: power 24, the game ends when it runs out or the clock reaches 0:00 | confirmed | level-1 power `$07BA`, bar `$C098`, clock death |
| Clock per stage, time bonus 100 points a second | differs | level-1 clock `$ABFC` (2:31, 0:36, 2:21), level-2 (3:31, 0:40, 1:01, 1:16), level-3 (2:01, 0:21); the bonus takes a second off every four frames, 100 points each in level one (`$ADB9`) but 300 in levels two and three (level-2 `$B7AD`, level-3 `$A813`) |
| Points: pickup 250, ED-209 punch 70, Dick Jones 75 a hit | confirmed | level-1 pickups, level-2 `$8419`, level-3 `$AA98` |
| Speech | confirmed | four-bit samples played through the SID's volume register: the voice saying "RoboCop" after fire on level one's title (level-1 `$EC93`), and level three's death (`$EB99`) |
| Level skip words SUEDEHEAD (first title) and DISAPPOINTED (second title) | live | level-1 `$F69E`, level-2 `$B892`; both used to reach the level snapshots |
| High-score table with typed names | confirmed | resident `$0E40`, level-3 `$E93E-$E9CD` |
| Flying: hold F, G, H and J with left or right in levels 1, 3 and 8 | differs | the only keys the three levels read are space (pause), RUN/STOP and the letters of the two level-skip words (`key_down` callers in each level); the cheat belongs to another version |
| POKEs for endless time and power after a reset (44179, 44368, 44392 and so on, with 96) | differs | in this build those addresses are not the starts of the clock and power routines (level-1 `$AC93` is inside the clock set-up, `$AD50` is not an instruction start); they belong to another version |
| Bug: the third level sometimes starts with a screen of rubbish; RUN/STOP and fire restart it | open | not met in play; which load "the third level" means is not clear |

## Beyond the documentation

Found in the code, not in the manual.

- The second disk image's LOAD1 has no stage-seven tiles at `$C400`, so
  that stage draws its walls from the wrong bytes on that disk
  (`reference/disk-b-stage7.png`).
- Stage seven's tiles are not in level two's files: they come with LOAD1
  and wait at `$C400` through level one (resident `$C400`).
- Level three's enemies all fire when the first enemy is low enough:
  `enemy_fire` at level-3 `$9522` tests `$2F`, the first slot, instead of
  each enemy's own `$2F,x`.
- The mirrored sprite shapes are built at run time in every level (level one `$A912`, level three `$A36E`); in level two: 174
  rows of arm and gun shapes reversed into `$ACA8` (level-2 `$AC49`).
- Leftovers: a tune no code plays and its instruments (resident
  `$BBCC`, level-1 `$B800`), a hex-number parser from a development tool
  (resident `$CD50`), and RAM's power-on pattern saved in the file
  (resident `$CD91`).
- The shipped high scores are ALIENATION, ANGST, MISERY, FRUSTRATION,
  TORMENT, DESPAIR, a row of dots and HAVE A NICE DAY, all 4,000.
- RESTORE is disarmed on the title: the NMI vector points at a handler
  that only acknowledges CIA2 (level-1 `$8510`, handler `$85E7`). The
  second disk's build leaves those 18 bytes out.

## Open questions

- Which version the C64-Wiki POKEs and the flying cheat come from.
- Whether the second disk image is an earlier or a later build than the
  first.
