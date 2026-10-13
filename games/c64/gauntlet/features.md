# Gauntlet — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Gauntlet", https://www.c64-wiki.com/wiki/Gauntlet (revision 45583), read 11 October 2026
- Mindscape's US manual, "Commodore C64 Manual: Gauntlet (1987)(Mindscape)(US)", the Internet Archive's OCR text of https://archive.org/details/Gauntlet_1987_Mindscape_US, read 11 October 2026. It covers the C64, Atari 8-bit and Atari ST versions in one booklet; where it names a machine, only its C64 lines are used here. The disk analysed is U.S. Gold's, and the manual is Mindscape's: what the two editions share is not known
- The game's own screens: credits, controls, selection and play, 11 October 2026 (`reference/`)

## Features

| Feature | Status | Where |
|---|---|---|
| One or two players; the glove on the selection screen picks the count, then each player's hero | live | selection program `$3390`-`$3420` (not in the play image); `orientation.md` |
| Four heroes: Thor the Warrior, Thyra the Valkyrie, Questor the Elf, Merlin the Wizard | live | selection screen; str_hero_names `$AED8` |
| Each hero differs in armour, shot power, hand-to-hand and magic | differs | shot power and magic are per hero (power_tables, magic_vs_monsters); armour does nothing (damage_taken is never read, *live*) and hand-to-hand is `$40` a blow for every hero (fight_damage, *live*); only fight power against generators differs (fight_power) |
| A one-player game gets a second, computer-chosen hero | differs | *live*: in a one-player game player two's panel shows "Press fire" and waits for a second player (`reference/play-level1.png`); the play program reads both joysticks and has no computer player (players_join) |
| A second player can join at any time by pressing their joystick's fire button | confirmed | players_join, join_beside: the new player appears beside the other |
| Player one: joystick 1 and SPACE for magic; player two: joystick 2 and the function keys | live | controls screen; magic_keys reads SPACE for player one and any of F1, F3, F5, F7 for player two |
| Health starts at 2000 and counts down all the time | live | health_tick: 1 every 64 frames, *live* 23 in 1,501 frames |
| Hold fire to shoot, release to move; shots travel in eight directions, diagonals included | confirmed | scroll_decide stops a player while fire is held; shot_fire takes the stick's facing |
| Unlimited shots | confirmed | shot_fire fires whenever the player's slot is free; one shot in flight per player |
| Moving into a monster fights it hand to hand; hand-to-hand scores more than shooting | live | fight_back: 25 points a blow against 5 a shot (shot_score); *live*, a level-one grunt died from one blow |
| Monster generators make one kind of monster each, at three strengths; they can be shot, pounded, or destroyed with magic | confirmed | generators `$20`-`$2E`, three levels of five kinds; generators_run, gen_thresholds, fight_generator, magic_generator |
| Monsters come in three levels of toughness: a level one takes one hit, a level three takes three | live | the kind byte's level bits are its strength, `$40` off a blow; *live* for level one |
| Ghosts hit once and vanish | confirmed | monster_attack, ghost_touch: 10, 20 or 30 health by level |
| Grunts close in and club | confirmed | monster_hits: 5, 8 or 10 health by level, *live* 10 for a level-three grunt |
| Demons shoot fireballs and bite | confirmed | fireballs take 10 health (shot_hits_player); demons fire once in four moves |
| Lobbers throw rocks over walls and run away | confirmed | rock_path, rock_fly (3 health); monster_aim turns a lobber away nearer than `$18` |
| Sorcerers flicker in and out of sight and cannot be hit while invisible | confirmed | bit 3 of `$0640`, skipped by shot_hits_monster |
| Death takes up to 200 health, then dies; only magic kills it | confirmed | deaths_first: 50 touches of 4; blast_monster always kills Death; shots only score (death_points) |
| Potions: SPACE uses one; its effect scales with the hero's magic; a potion that is shot works too, but less | confirmed | magic_use, blast_monster (magic_vs_monsters by hero), potion_shot (blast_owner 1) |
| Special potions: extra armour, magic power, shot speed, shot power, fight power, pickup power | differs | all six are picked up and announced (power_apply); the armour potion writes values nothing reads, and the fight-power potion's hand-to-hand half writes `$ACCC`, which nothing reads (*live*) |
| Food: +100 health and +100 score | confirmed | food_eat, score_100 |
| Cider: as food, but a shot destroys it | confirmed | tile `$14`, shot_tile |
| Poison: takes one special power and 100 health | differs | poison takes one power from a player who has any; otherwise a potion, if carried, and 100 health, subtracted without decimal mode or a borrow test: *live*, 2000 became `$1F00` (600 health too many) and 50 became `$FF50` (16,550 ticks of the clock) |
| Keys: 100 points each, open doors | confirmed | key_take, door_unlock (the door spreads in two directions, doors_open_step) |
| Treasure chests: 100 points | confirmed | chest_take, score_100 |
| Amulet: invisibility for a short time | confirmed | amulet_take: 255 passes, monster_aim ignores the player, amulet_flash |
| Some walls crumble under repeated shots | confirmed | tiles `$33`-`$35`, one stage a hit (shot_tile) |
| Traps: glowing floor patterns that make some walls disappear | confirmed | trap_set, trap_wait, trap_spring: the walls with bit 7 set go when both sticks are let go |
| Transporters: to the nearest visible transporter, a random one when several are as near | confirmed | teleport_add, teleport_sort (ties broken by chance), teleport_place |
| Exits are labelled with the level they lead to; some skip levels | confirmed | exits_special, exit_targets: after level 1, exits to 4 and 8; after level 4, to 8 |
| After 30 seconds without action every wall vanishes; after another 30, the walls become exits | differs | idle_timer: after 30 game seconds the doors and keys become floor; after 150 more the walls become exits (*live*) |
| An exit can lead to a treasure room: collect within the time limit and escape for the bonus | confirmed | treasure_clock_set (20-30 s), treasure_result: 100 a chest, or "NO BONUS" |
| From level 10 shots stun the other player | differs | set per level by the level file's header (bits 0 and 1 of `$0A01`, level_messages), not by the level number |
| 512 dungeons; the disk holds 128 level files | differs | levels 1-7 are files 1-7, then random files 8-117 without end, treasure rooms from 118-128 (level_pick) |
| A dead player in a two-player game can come back by pressing fire while the other is alive | confirmed | leave_timers puts "PRESS FIRE" back in a dead player's panel; players_join |
| A short form of the title tune plays while each level loads | traced | level_intro plays the jingle DITTIDATA at each level's start, after the load; whether the jingle is taken from the title tune was not compared |
| Scrolling play area with the status panel below | live | `reference/play-level1.png`; panel split at raster line `$CF` (raster_frame) |
| Music by Ben Daglish (credits) | live | credits screen; PLAYER-$E000 and the tune player at `$A036` |

## Beyond the documentation

Found in the code, not in the manual.

- The disk carries PINN232, a cable-link program for moving memory between two machines through the user port, loaded with the game and never called: a developers' tool left on the disk (`$1388`).
- "INSERT SIDE 2 OF DISK" is in the program with code to wait for it, and nothing reaches it (unused_side2).
- The hidden potion: from level 8, a level says "FIND THE HIDDEN POTION" on six rolls in sixteen (hidden_potion_roll) and hides one on five of them: the shot-speed potion's roll prints the message and hides nothing (*live*).
- The treasure-room tune's player is tuned for NTSC machines, so on a PAL machine the tune plays about 65 cents flat; the level jingle's player is tuned for PAL.
- When a sound effect on voice 3 ends, the game clears the wrong two SID registers (`$D414`/`$D415`).
- Monsters are characters, not sprites, and the three maze fonts are the monsters' animation frames: changing font animates every monster at once.

## Open questions

- Whether the jingle at each level's start is a short form of the title music.
