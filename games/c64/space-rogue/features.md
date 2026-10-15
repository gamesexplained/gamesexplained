# Space Rogue — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources (every one read on 14 October 2026; the full list with titles is
in the research notes kept with the run, and each claim below carries
its tag). No C64 manual or reference card was found online: the C64 keys
come from C64-Wiki's transcription of the card, and the manual scan is the
platform-neutral Sunracer Owner's Guide.

- [S1] Wikipedia, "Space Rogue": https://en.wikipedia.org/wiki/Space_Rogue
- [S3] textfiles.com review `sprogue.rev` (Apple II, with C64 notes): http://mirror.cyberbits.eu/textfiles.com/games/REVIEWS/sprogue.rev
- [S4] Apple II Player Reference Card, typed in a 1989 BBS file `space.rg`: http://mirror.cyberbits.eu/textfiles.com/apple/DOCUMENTATION/space.rg
- [S5] the HIVE! leaflet, archive.org: https://archive.org/details/space-rogue-hive
- [S6] the Sunracer Owner's Guide (manual), Steam guide scan: https://steamcommunity.com/sharedfiles/filedetails/?id=1944986825
- [S9] Tildes ~games club threads (PC, one C64 player): https://tildes.net/~games/1ti0/cga_2026_04_insert_cartridge_space_rogue and https://tildes.net/~games/1txf/cga_2026_04_remove_cartridge_space_rogue
- [S11] CSDb releases: https://csdb.dk/search/?seinsel=releases&search=space+rogue
- [S12] C64-Wiki (German), "Space Rogue": https://www.c64-wiki.de/wiki/Space_Rogue
- [S16] Zzap!64 #58, February 1990, review p. 8: https://archive.org/details/zzap64-magazine-058
- [S20b] The Games Machine, June 1990, "Cheat Street" solution: https://archive.org/details/thegamesmachine199006
- [S21] QuestBusters vol. 6 no. 11, November 1989: https://archive.org/details/questbusters-v6n11
- C64 screenshots from LaunchBox, C64.COM, GameBase64 and C64-Wiki, saved in `reference/ext-*.png` (source per file in `reference/README.md`)

## Features

### Start-up, title and intro

| Feature | Status | Where |
|---|---|---|
| One double-sided disk: side 1 BOOT, side 2 DATA [S12] | live | `orientation.md`, "The image"; "Insert DATA disk..." and "Insert BOOT disk..." are the loader's prompts |
| Title sequence: Origin logo, the Space Rogue logo, credits; any key skips it [S12] | live | `reference/title.png`; title part |
| "Old or New Game?": N for a new game, O for an old one [S12] | live | `reference/old-or-new.png`; N was tested |
| A new game asks for your name | live | "What is your name?" after N (`reference/name.png`) |
| A password check asks for a word from the manual by page, line and word [S12] | open | the intro holds a list of manual words; when it asks is to be traced |
| Intro story: the *Princess Blue*, the derelict *Jolly Roger*, the Manchi attack [S14][S16] | live | `reference/intro-1.png`; intro part |
| You start aboard the derelict and walk to your ship [S1] | open | the first loads of a new game are the base overlay (`orientation.md`) |

### Flight

| Feature | Status | Where |
|---|---|---|
| Filled, clipped 3D polygons, up to about sixteen objects [S19] | live | `reference/starbase.png` |
| Keys W/X pitch, A/D turn, C/Z roll, S stops rotation [S12] | live | A, D, W and S were used to line up on Hiathra; rotation builds while a key is held and S stops it |
| + and - change speed; CF readout shows the set speed [S6][S12] | open | |
| Cruise and Newtonian flight, Ctrl-E toggles [S6] | open | |
| Camera views: cockpit, chase, cinematic, V cycles [S16][S12] | open | |
| T cycles targets; arrowheads at the screen's edges point to the target [S6] | live | `reference/tac-starbase.png`: "Starbase RAN 1972m"; the four arrowheads follow it |
| TAC data mode, five lines for a ship; Ctrl-T switches to the target's picture [S6] | open | |
| Beam weapons recharge; the M/A indicator and L toggles automatic fire [S6] | open | |
| Missiles: plasma torpedo, SM-1, Nova; R readies a weapon, Space fires [S6] | open | |
| Shields fore and aft, ECM, armour, damage to systems [S6] | open | |
| Collision damage grows with the square of the relative speed [S6] | open | |
| Docking: touch the docking face at 20 m/s or less [S6][S9] | traced | the collision handler (`$7033`) docks when the object is the base and the face is its docking face and the speed is under 21; the docking routine was called directly (`orientation.md`) |
| Shooting a station gets docking refused [S6] | open | |
| Hazards: asteroids, black holes, ion storms, nebulae, antimatter shard fields [S6][S16] | open | |
| Malir gates and wormholes: enter at 21 m/s or more, stay inside the rings [S6] | open | |
| Other ships hail, taunt and use ten tactics [S6][S16] | open | |
| G surrenders, J jettisons all cargo [S12] | open | |
| F1 pauses [S12] | open | |
| Ctrl-S saves, in space only [S12][S4] | open | the engine's save routine is `$1783` (`orientation.md`) |
| Death ends the game with no restart [S21] | open | |

### Navigation

| Feature | Status | Where |
|---|---|---|
| N opens Navigation Control: CHART, HELM, STATUS, QUERY, SCAN, COCKPIT [S6] | live | `reference/navigation.png` |
| Each system is a 32 by 32 grid of sectors [S6] | open | |
| CHART moves brackets to a destination; HELM is the autopilot; any key stops it [S6] | live | charted to 13,19 and flew there; "Ship has arrived at destination" |
| QUERY gives a sector's bases, hazards and lore [S6] | open | |
| Eight systems: Karonus, Deneb, Gryphon, Arcturus, Nar'see, Bassruti, Sigure, Zed N27 [S6][S23] | open | side 2 holds nine sector maps, `q0`-`q7` and `q9` |
| The clock starts at 00:00 HRS, 01 MAR 12 [S13] | open | |

### Bases

| Feature | Status | Where |
|---|---|---|
| Docking switches to a top-down tile view that scrolls as you walk [S16][S19] | live | `reference/hangar.png` |
| Starbases check the cargo for contraband [S6] | live | "We've done a routine check of your cargo hold and found everything in order" (`reference/docking.png`) |
| Commands: talk, inspect, status, done; leave by your ship's hatch [S4][S13] | open | the base's command words are at `$AA7E` |
| Conversations offer replies; OTHER takes a typed keyword [S4][S16] | open | |
| Repair, trading post, outfitter and cantina [S6] | open | |
| Twelve bases, four kinds [S6] | open | side 2 holds twelve maps, `l00`-`l70` |
| Pilot's licence quiz at Hiathra [S9][S20b] | open | |
| Guards throw you out of restricted areas [S9] | open | |

### Trading and story

| Feature | Status | Where |
|---|---|---|
| Buy and sell cargo; prices differ by system; some goods spoil [S6][S9] | open | |
| Contraband is confiscated at starbases [S6] | open | |
| Reputation with the Imperium, the Merchant Guild, the pirates, the Manchi; repute as a pilot [S6][S15] | open | |
| Docking at the Manchi homeworld ends the game [S20b] | traced | the docking routine (`$7094`) jumps to `$1532`, which loads `WON`, when the current system (`$071D`) is 9, the Manchi system on side 2's `q9`: docking at any base there wins; the ending was seen by calling it (`reference/ending-1.png`) |

### HIVE!

| Feature | Status | Where |
|---|---|---|
| An arcade cabinet in the cantinas [S6] | traced | the base's tile-action table at `$AB30` gives a Hive! tile the handler `$AAD6`, which loads `HCODE` |
| "Insert credit" or "Quit game" [own] | live | `reference/hive-menu.png` |
| Collapse a set number of mounds, then run back to the ship [S5] | live | "MOUNDS: 03" on drop 1 (`reference/hive-drop.png`) |
| Three mounds on drop 1, six on drop 2, nine on drop 3 [S21] | open | |
| Five drops win a prize [S5] (four, [S3]) | open | |

### Sound

| Feature | Status | Where |
|---|---|---|
| No music, only sound effects [S12] | open | |

## Beyond the documentation

Found in the code, not in the manual.

- On a PAL machine the interrupt can stop for good: the game's raster
  compare routine copies the beam's current bit 8 into the compare.
  Two clean boots out of two hung at "Old or New Game?", and it recurs
  in play (`orientation.md`).
- `END` on side 2 is `INIT` from side 1 under another name, loaded to put
  back the bytes a base overwrites.

## Open questions

- Which of the two keyword-protection sources is right for the C64, the
  Owner's Guide [S12] or the novella [S21]?
- Is there a ninth system? The novella says nine, the manual and map
  eight, and side 2 has a `q9` but no `q8`.
