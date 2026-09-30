# A View to a Kill — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

The game is five programs, loaded one after another (`orientation.md`).
Each row names its part; the addresses are in that part's own listing.

Sources:

- The game's own screens: the instruction page before each section, the
  memos, the code prompts and the intro's credits, read in the emulator
  on 30 September 2026.
- Wikipedia, "A View to a Kill (video game)",
  https://en.wikipedia.org/wiki/A_View_to_a_Kill_(video_game), read 30
  September 2026: the sections, the password system, the music, the
  reviews.
- C64-Wiki (German), "A View to a Kill",
  https://www.c64-wiki.de/wiki/A_View_to_a_Kill, read 30 September 2026:
  credits, the three codes, the ratings.
- MI6-HQ, "A View To A Kill (1985)",
  https://www.mi6-hq.com/sections/games/avtak, read 30 September 2026:
  per-platform programmers, the section descriptions, the mine's
  detonator number.
- c64.com, interview with Grant Harrison, published 31 March 2015,
  https://www.c64.com/gt_display_interview.php?interview=38, read 30
  September 2026: Softstone, the deadline, his view of the game.
- FRGCB blog, "James Bond 007: A View to a Kill (Domark, 1985)", 12 April
  2023, https://frgcb.blogspot.com/2023/04/james-bond-007-view-to-kill-domark-1985.html,
  read 30 September 2026 through a summarising fetch tool (the site was
  refused directly): the licence and delay, Dominic Wheatley in Retro Gamer
  96, the C64 credits, the gun barrel, the ending as Q's robot's view, the
  speech heard as "My name is Bond... James Bond", the Lemon64 rating.
- The English C64-Wiki, Lemon64 and its manual page, the Internet Archive
  and the Zzap!64 archive could not be read from this session (the
  network refused them, or they answered 403), so no manual text was
  available.

## Features

| Feature | Part | Status | Where |
|---|---|---|---|
| Gun-barrel opening picture, the Domark logo and a scrolling roll of credits | intro | live | `reference/intro-gun-barrel.png`, `intro-credits.png`; `white_wipe` `$C100`, `logo_assemble` `$C430`, `credits_scroll` `$C54E` (intro) |
| Spoken words, "speech by B.-Jones" | intro | traced | a 1-bit sample player, `speech_play` `$A000` (intro), heard as a burst of about 2.2 s; it says "My name's Bond. James Bond" (heard by the contributor); Paris adds "Well done, 007" (`$1225`), "You failed, Bond" (`$190A`) and "Damn it" (`$1090`) |
| Music by Tony Crowther: the James Bond theme and Duran Duran's "A View to a Kill" (Wikipedia, MI6-HQ) | all | traced | two tunes: one in the intro and City Hall (`$C640`, notes from `$E000`), one in Paris and the mine (notes `$E000`-`$FFFF`); which is which was not checked by ear |
| A choice of theme tune only, sound effects only, or both | paris | confirmed | `$02E0`, chosen with the stick on the instruction page (`title_page`, `$4F30`, paris) |
| Chase May Day by car while she parachutes from the Eiffel Tower; be at her drop point when she lands | paris | confirmed | `mayday_update` `$5200`: she circles, then lands at one of eight points; a catch is possible below 060 (paris) |
| A first-person view from the car over an overhead map of the streets | paris | live | `reference/paris-chase.png`; `build_3d_view` `$4600` (paris) |
| May Day's altitude counting down (the 890 readout) | paris | live | `reference/paris-chase.png`; `altimeter_tick` `$5315` (paris) |
| A clock, a damage gauge | paris | live | `update_clock` `$4170`, `add_damage` `$49A0` (paris) |
| Police and road blocks | paris | confirmed | fourteen police cars follow the player's route; `place_roadblock` `$4900` (paris) |
| Stick: forward accelerates, back is reverse and brake, left and right steer, fire shoots, back with fire is a handbrake turn | paris | confirmed | `$5AE0`, `$5B59`, `$5B9B`, `fire_bullet` `$4570` (paris) |
| Room-to-room view of the burning City Hall, with the building in miniature beneath it | city-hall | live | `reference/city-hall-play.png` |
| Memos from M and Q before the section | city-hall | live | `reference/city-hall-memos.png`; `memo_page` `$1800` (city-hall) |
| Collect and use objects (keys, buckets of water) from icon menus to get through the floors and rescue Stacey before the fire spreads | city-hall | confirmed | `item_menu` `$7A00`, `word_menu` `$8000`, 24 USE handlers at `$7CA6`; `fire_spread` `$94F0` (city-hall) |
| A thermometer and a clock | city-hall | live | `$69E0`, `tick_clock` `$6E40` (city-hall); nothing reads the clock |
| Side view of the mine under Silicon Valley; find May Day, who is trapped | mine | confirmed | `reference/mine-briefing.png`; blasting rock fall 3 frees her (`$3E00`, mine) |
| Collect the code numbers that defuse Zorin's bomb before the time runs out | mine | live | `end_check` `$25E0` (mine), run with set digits |
| A countdown clock (89:40:xx) and a Geiger counter | mine | traced | the clock is live (`reference/mine-play.png`, `clock_tick` `$1C20`); a meter on the panel (`$3000`) rises towards the upper right, whether it is the Geiger counter is open |
| Objects: a grapnel gun, wooden planks, a mine pass, a winch (Wikipedia, C64-Wiki) | mine | traced | planks (`$3970`), a rope (`$38D8`), the winch's four parts (`$3F23`), explosive and detonator (`$3827`, `$39E0`); the objects' names were not matched to their icons |
| The detonator combination 32768 (MI6-HQ) | mine | differs | the part checks 6 7 1 3 4 (`$26F0`, mine) |
| Each later section asks for the code the previous one gave; RETURN plays it without one | city-hall, mine, finale | live | the prompts, `reference/city-hall-code-prompt.png`; RETURN at the finale's prompt only asks again |
| The codes CCPHJ (City Hall), DB4CT (mine) and ILVCT (the ending) | city-hall, mine, finale | live | each typed at its prompt and accepted; `read_code` in each part |
| The ending: Bond seen through binoculars, then the lens cracks | finale | confirmed | `reference/finale-shower.png`, `finale-cracked-lens.png`; `show_ending` at `$1000` (finale) |
| Keyboard control as well as the joystick (C64-Wiki) | all | differs | every playable part reads only the joystick in port 2 and stops the keyboard scan; keys are read only at the code prompts |

## Beyond the documentation

Found in the code, not in the manual.

- The finale's code is a fixed string, compared at `$8061` (finale):
  nothing derives it from play, and the ending prints no code.
- RESTORE brings the finale's code prompt back: `finale_start` points the
  NMI vector at itself (`$8000`, finale).
- City Hall and the mine can be finished only with the previous code
  typed: without it City Hall starts again and the bomb goes off
  (`facts.md`, "The codes").
- In City Hall, Bond's room catching fire ends the part: the next code
  with CCPHJ typed, a new game without (`$7090`, city-hall).
- Paris starts through the KERNAL's reset and a cartridge header in RAM
  (`$4FBB`, `$8000`, paris).
- The intro's credits can stall for good, depending on where the raster
  beam is at one store (`$C540`, intro).
- The police in Paris follow the route the player drove (`$4E80`, paris).

## Open questions

- Whether the code prompts and end screens are the original game's or
  the crackers' (`facts.md`, "Layers of the copy studied").
