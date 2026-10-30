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
| The player is Supreme Commander of the U.N.N.: 16 member countries, each with its own personality, aims and problems | live | the country list in the OUT tray: Canada, U.S.A, Central American Alliance, European Unite, Libya, Argentina, Black African Republic, South Africa, Israel, Islamic Alliance, Pakistan, India, Australia, China, Japan, Eastern Block |
| Control by keyboard (A up, Z down, N left, M right, SPACE fire) or a joystick in port 2, chosen with F1 or F3 at the start | live | options panel |
| An arrow cursor picks one of five main icons and fire chooses | live | main screen |
| A weekly U.N.N. Council communique rates the player's performance and the world's radiation, with CARRY ON, RAMSAVE GAME, RAMLOAD GAME and QUIT GAME | live | week 1 |
| Information: intelligence reports per country on food, resources and missiles; green when a country has what it needs, red when it lacks | open | the C64 menu showed Missile Power (Estimates) MX1 MX2 MX3, Technology Capability and Natural Resources tables; no food table seen yet |
| Three missile types, Mx1 (enormous warhead, high radioactivity), Mx2 (medium), Mx3 (small, tactical); any reaches any target | open | |
| The Strategic Arms Limitation Agreement: the Commander sets each country's allowed warheads; a country may comply, refuse or build in secret | open | |
| IN tray: letters from countries; reading one discards it; a letter left too long falls off the top of the stack and the sender takes it as ignored | open | |
| OUT tray: standard letters to a chosen country, with details where they apply | live | Reduce missiles, Increase missiles, Reprimand, Letter of Support, Allocate food, Allocate Technology, Two Countries Improve, One Country Improve; "TO Canada / Reduce your missiles by 30 Warheads." with Send letter / Exit |
| Satellites: six laser-defence (SDI) satellites, numbered 1 to 6, and three Big Bird reconnaissance satellites, picked up and placed in geostationary orbit over the map | live | satellite panel |
| An SDI satellite shoots down nuclear missiles within its range | open | |
| A Big Bird detects increased military activity beneath it | open | |
| The eye in the satellite panel shows reconnaissance and SDI cover | open | |
| Radio: six frequency bands (1800-3499, 3500-6999, 7000-13999, 14000-20999, 21000-25000, 28500-50000 kHz); each country transmits in one band | open | radio panel seen: frequency display 1800, keypad, BAND, START/STOP, AM/FM, EXECUTE, up and down |
| Frequency select: a typed frequency or a band's lower limit, adjusted up and down; a message on or near the frequency is shown | open | |
| Frequency scan: scans a band; what it intercepts is scrambled and is unscrambled by setting eight signal filters f0 to f7 | open | |
| U.N.N. Force: a rapid deployment force the Commander moves into any country; a country with the force on its soil follows the Commander's instructions; countries resent it staying | live (memo only) | "TROOP MOVEMENT U.N.N forces are in Argentina" with Exit and Re-direct |
| Disputes: a country demands units of food or technology from another, and the Commander answers Ignore, Yes or No | live | "Israel / The Above country has demanded 10 U.N units of Tech. Please Advise. Libya" |
| News memos about a country, answered Neutral, Support, Criticise or Ask for Talks | live | "China has record trade with Israel", "Israel has claimed responsibility for car bomb in South Africa", "Black African Republic has closed the Embassy of Pakistan" |
| Each country tracks its relationship with the Commander and with each of the other 15 (240 relationships) | open | |
| Food and resources: a country short of either is less stable and seeks the shortfall from others | open | |
| Conventional wars: punitive, little damage, escalate to nuclear if not over quickly | open | |
| Nuclear wars: missiles track to their targets on the world map; SDI satellites in place may shoot them down | open | |
| Radioactivity rises with every nuclear exchange, and enough of it ends the world (Armageddon) | open | |
| Music | open | the manual credits "Millers" |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
