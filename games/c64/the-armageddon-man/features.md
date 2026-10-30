# The Armageddon Man — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The C64 instruction booklet, Martech Games 1987, scanned as
  "Commodore C64 Manual: Armageddon Man, The (1987)(Martech Games)",
  https://archive.org/details/Armageddon_Man_The_1987_Martech_Games, its
  OCR text read 30 October 2026. It credits the Spectrum program and game
  design to J Wilson, D Martin, B Notarianni and R France, graphics to
  Malcolm J Smith and music to "Millers"; it names nobody for the C64.
- "Global Commander", Wikipedia, https://en.wikipedia.org/wiki/Global_Commander,
  read 30 October 2026: the North American title, published by Datasoft.
- C64-Wiki has no page for the game (`The_Armageddon_Man` and
  `Armageddon_Man` both empty, 30 October 2026). Lemon64 answered 403 and
  the Wayback Machine 429 on 30 October 2026.
- The game's own screens, played in VICE from `work/week1-menu.vsf`.

## Features

| Feature | Status | Where |
|---|---|---|
| The player is Supreme Commander of the U.N.N.: 16 member countries, each with its own personality, aims and problems | live | the country list in the OUT tray: Canada, U.S.A, Central American Alliance, European Unite, Libya, Argentina, Black African Republic, South Africa, Israel, Islamic Alliance, Pakistan, India, Australia, China, Japan, Eastern Block (`country_names`); each country's own event levels (`event_levels`) are its personality |
| Control by keyboard (A up, Z down, N left, M right, SPACE fire) or a joystick in port 2, chosen with F1 or F3 at the start | live | `options_panel`, `read_keys`, `read_joystick` |
| An arrow cursor picks one of five main icons and fire chooses | live | `main_icons`, `hit_test`; the map is a sixth place, for moving satellites |
| A weekly U.N.N. Council communique rates the player's performance and the world's radiation, with CARRY ON, RAMSAVE GAME, RAMLOAD GAME and QUIT GAME | live | `week_end`, `communique_menu`; the rating is the 16 countries' confidence summed and divided by 512, poked to Excellent live |
| Information: intelligence reports per country on food, resources and missiles; green when a country has what it needs, red when it lacks | differs | the C64 has three reports, missile power, technology and natural resources (`report_missiles`, `report_tech`, `report_resources`); food is natural resources, and the colour marks the countries a memo or mail is about (`report_marks`), not need |
| Three missile types, Mx1 (enormous warhead, high radioactivity), Mx2 (medium), Mx3 (small, tactical); any reaches any target | differs | three types are kept and fired MX1 first (`take_missiles`, `launcher_pick`), but every missile that lands is one hit and adds to the radiation by the same chance, whatever its type (`war_damage`, `radiation_up`) |
| The Strategic Arms Limitation Agreement: the Commander sets each country's allowed warheads; a country may comply, refuse or build in secret | confirmed | the letters "Reduce missiles" and "Increase missiles" change a country's stock by 10 of each type, the first only when the country trusts you or has the force on its soil (`letter_reduce_missiles_script`); mail 1 and 2 ask about missile allowances. No routine builds missiles in secret |
| IN tray: letters from countries; reading one discards it; a letter left too long falls off the top of the stack and the sender takes it as ignored | confirmed | `in_tray_next` shows the newest of the week first; mail unread at the week's end runs its follow-up (`mail_unread`) |
| OUT tray: standard letters to a chosen country, with details where they apply | live | `write_letter`, `letter_scripts`: Reduce missiles, Increase missiles, Reprimand, Letter of Support, Allocate food, Allocate Technology, Two Countries Improve, One Country Improve |
| Satellites: six laser-defence (SDI) satellites, numbered 1 to 6, and three Big Bird reconnaissance satellites, picked up and placed in geostationary orbit over the map | live | `icon_satellites`, `satellite_pick`, `satellite_grab` |
| An SDI satellite shoots down nuclear missiles within its range | confirmed | `sdi_check`, `laser_on`: each frame a missile flies under an SDI satellite it is caught by a 1 in 4 chance and a laser line is drawn to it |
| A Big Bird detects increased military activity beneath it | confirmed | `bigbird_report` every fourth tick: a message from `bigbird_texts` for a country under a Big Bird (`bigbird_over_a`), chosen by its hostility to another (`bigbird_levels`) |
| The eye in the satellite panel shows reconnaissance and SDI cover | confirmed | `cover_report`: "SATELLITE DEFENCE COVER" and "RECONNAISSANCE COVER" lists, or "No Foot prints!" |
| Radio: six frequency bands (1800-3499, 3500-6999, 7000-13999, 14000-20999, 21000-25000, 28500-50000 kHz); each country transmits in one band | confirmed | `band_bottoms`, `band_tops`, `country_bands` |
| Frequency select: a typed frequency or a band's lower limit, adjusted up and down; a message on or near the frequency is shown | differs | a typed frequency only picks its band (`radio_tune_typed`); intercepts come from any country on the radio's band (`intercept_pick`), not from a frequency |
| Frequency scan: scans a band; what it intercepts is scrambled and is unscrambled by setting eight signal filters f0 to f7 | live | `radio_scan_irq`, `radio_message`, `scramble_char`: each filter that matches the country's key (`scramble_keys`) lets about another eighth of the characters through |
| U.N.N. Force: a rapid deployment force the Commander moves into any country; a country with the force on its soil follows the Commander's instructions; countries resent it staying | confirmed | `force_menu`, `force_weeks`; the letter scripts obey when the force is stationed in the country (`force_test`), and a Total Missile Attack from or on it is stopped (`force_check`) |
| Disputes: a country demands units of food or technology from another, and the Commander answers Ignore, Yes or No | live | `demand`: Yes moves one unit and cancels the event, No lets it happen, Ignore runs a harsher event |
| News memos about a country, answered Neutral, Support, Criticise or Ask for Talks | live | the event scripts at `$9FDB`-`$A4D5` |
| Each country tracks its relationship with the Commander and with each of the other 15 (240 relationships) | confirmed | confidence in you, byte 9 of each record; hostility, `relations`, 16 by 16 |
| Food and resources: a country short of either is less stable and seeks the shortfall from others | confirmed | `demand`: a country with less than 11 of natural resources or technology demands 10 units from its target |
| Conventional wars: punitive, little damage, escalate to nuclear if not over quickly | differs | the conventional attack events (2 and 3) are memos whose answers change confidence and hostility; no routine counts damage from them. Escalation comes through hostility rising to the missile attacks' levels |
| Nuclear wars: missiles track to their targets on the world map; SDI satellites in place may shoot them down | live | `war_run`, `missile_fly`, `sdi_check`: China and Israel's war watched to its end |
| Radioactivity rises with every nuclear exchange, and enough of it ends the world (Armageddon) | live | `radiation_up`, `week_end`: radiation 255 at the week's end ends the game |
| Music | live | tune 0 plays from the options panel on (`options_panel`, `mus_start_tune`) |

## Beyond the documentation

Found in the code, not in the manual.

| Finding | Status | Where |
|---|---|---|
| Two countries at the friendliest relationship, hostility 0, start a Total Missile Attack on each other | live | `country_events`: the level `$FF` less 0 is -1 as a signed byte |
| Answering Neutral to an assassination, a mobbed embassy, a car bomb or aid to an opposition ends the game half the time, "recalled to earth immediately. Due to your incompetence." | live | `ev15_18_neutral`, `ev15_18_1` |
| A war fires more missiles than the countries hold: the last of each type can fly two or three times | live | `launcher_a`, `missile_done`: 108 landings from 101 missiles |
| A country already destroyed still adds radiation when hit | traced | `war_damage` |
| The title picture is loaded with the game and never shown | live | `$2000`, `$0C00`; only the leftover `dev_loader` points the video chip at it |
| A developer's loader is left at `$1000`, naming the files TITCOL, TITLES, SWMA and PAIN | traced | `dev_loader` |
| A sound effect player with 17 effects, an alarm and three short tunes that the game never plays | traced | `sfx_start`, `alarm_start`, `tune_table` |
| After talks a coin is tossed and never looked at, so the branch that raises both countries' hostility is never reached | traced | `after_talks`, `$9FE0` |
| Mail 9 (a threat warning) and mail 16 have scripts nothing posts | traced | `mail_threat_warning_script`, `mail_16_script` |
| Japan's and the Eastern Block's radio intercepts are chosen by bytes of code past the end of their table | traced | `intercept_levels` |
| A missile power of 511, 766, 1021 or 1276 reads as none | traced | `script_has_missiles` |
| The year's end rating is 100 with no country destroyed, about 6 less for each one lost | live | `year_over` |
| RESTORE does nothing | traced | `nmi` |

## Open questions

- What the original versions did where the C64 version calls
  `do_nothing` (around RAMSAVE and RAMLOAD, as windows open, as a
  satellite moves, at the end of a war).
- Who wrote the C64 conversion: the manual names only the Spectrum team.
