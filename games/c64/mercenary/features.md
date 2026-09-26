# Mercenary — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources, each read on 25 September 2026 (the tag in brackets is how the
table cites it):

- The game's own screens and text: the opening sequence and the ground at
  `08-08` in the emulator, and every message the scripts can print,
  decoded from the image (**screen**, **text**).
- Novagen's UK instruction leaflet, which covers the C64 and the Atari,
  as OCR text on archive.org:
  https://archive.org/details/Mercenary-_Escape_from_Targ_1985_Novagen_4220_Instructions
  (**leaflet**).
- Datasoft's US manual for the Atari 8-bit and the C64 (1986), OCR on
  archive.org: https://archive.org/details/MercenaryEscapeFromTargDatasoft
  (**manual**).
- Zzap!64 issue 11 (March 1986), the C64 review, and issue 13 (May
  1986), the tips pages; OCR on archive.org
  (https://archive.org/details/zzap64-magazine-011,
  https://archive.org/details/ZZap64Issue0131986May) (**Zzap 11**,
  **Zzap 13**). Issues 15, 18 and 22 for single points (**Zzap 15**,
  **Zzap 18**, **Zzap 22**).
- The Mercenary Site, http://mercenarysite.free.fr/, read directly:
  `mercsol.htm` (solutions, teleporter table, items; the page says most of
  it is based on the 16-bit versions), `msurvkit.htm` (Novagen's Targ
  Survival Kit), `m1box.htm`, `mversions.htm` (**site**).
- Andy Krouwel, "The Making of... Mercenary", Edge 153, draft on
  https://www.sockmonsters.com/TheMakingOfMercenary.html (**Edge**).
- Wikipedia, "Mercenary (video game)",
  https://en.wikipedia.org/wiki/Mercenary_(video_game) (**Wikipedia**);
  GameBase64 entry 4740, https://gb64.com/game.php?id=4740 (**GB64**);
  CSDb (**CSDb**).
- C64-Wiki has no article on the game (the page is missing). Lemon64,
  MobyGames and zzap64.co.uk refused automated access (HTTP 403), so they
  were not read.

## Features

| Feature | Status | Where |
|---|---|---|
| **Opening sequence** (Zzap 11): the ship sits in space before a starfield; Benson engages the Novadrive, a fault develops, even maximum reverse thrust cannot stop the crash on Targ; then full manual control | live | the intro script at `$7001`: "NOVADRIVE COUNTDOWN" on the original disk ("ABC UNLIMITED" in the packed build, the cracker's edit: `orientation.md`), a countdown 3, 2, 1, O (the letter), "NOVADRIVE ENGAGED", "PRESTINIUM ON COURSE", "DESTINATION GAMMA FIVE", "DAMAGE CONTROL REPORT", "SOME CONFLICT DAMAGE", "CHECKING", "EMERGENCY", "GUIDANCE SYSTEM FAULT", "COLLISION COURSE", "DISENGAGING NOVADRIVE", "UNABLE TO CORRECT", "MAXIMUM REVERSE THRUST"; then script 0: "CRASH IMMINENT!", "RETURNING TO...", "MANUAL CONTROL" and one line picked at random ("YOU CRASHED" in the logged run); the starfield `$AA62`; about 75 s from `$5000` to standing at `08-08` (all logged live from the message row) |
| **First messages on the ground** (Zzap 11): crash-landed near the airbase; a message to go to 9,6 | live (the first half) | script 0 at `$086C`: "CRASH LANDED ON TARG", "STATE OF WAR BETWEEN PALYARS AND MECHANOIDS", "LOCATION NEAR AIRBASE", "AIRCRAFT ON PAD", "TYPE - DOMINION DART", "CRAFT FOR SALE", "PRICE 5000 CREDITS"; script 1 at `$0A3C`: "FOR MORE INFORMATION GO TO THE BRIEFING ROOM IN COMPLEX AT LOC 09-06" |
| **No title screen** on the Novagen version (Electron Dance, on another machine); the Datasoft release has one (GB64) | live | this build starts the intro straight after unpacking |
| **Control panel** (leaflet, manual, Zzap 11): EL (elevation dial), LOC (grid position), ALT, SPEED, COMP (compass) and Benson's message window | live | text screen `$5C00`, rows 16-24; labels in the small font (glyph = ASCII - `$20`), messages in the large one (ASCII + `$80`) |
| **Benson's messages scroll** across the window (Wikipedia, Zzap 11) | live | `$8DC3`, called from the panel interrupt: one character a frame into `$5F78`-`$5F8E`, with a tick on SID voice 3 per character |
| **LOC reads XX-YY**, X growing eastwards and Y southwards; city 0-15 by 0-15, wasteland to -99..+99 shown in reverse figures, `**` beyond (leaflet, manual, Survival Kit) | open | position is `$74:$73:$72` (X) and `$7A:$79:$78` (Y), high byte the grid square: walking forward from the start raised `$7A:$79:$78` from `$08:$88:$00` to `$08:$8C:$60` (live) |
| **Joystick in port 2** (manual, GB64) | traced | `$B2FE` reads `$DC00` (control port 2): directions to `$80`, fire to `$81` |
| **Walking**: forward and back, turn left and right (leaflet) | live | stick up walked forward, stick right turned |
| **Flying**: forward dives, back climbs, left and right turn (leaflet, manual) | open | |
| **Fire** launches a missile when the craft is armed (leaflet, manual) | open | |
| **B boards** a vehicle or craft from its centre; **L leaves** it (leaflet, manual, Zzap 11) | traced | B is key `$1C`, compared at `$970E` in the object routine `$9706`; L is key `$2A`, dispatched at `$B349` to `$98C8` |
| **E works an elevator** from the centre of a three-sided cage; E again returns to the surface (leaflet, manual) | traced | key `$0E`, dispatched at `$B3F6`; the handler checks the position at `$B40C`-`$B42A` against a table at `$B4B6`/`$B4BE` |
| **T takes an object, D drops it** (leaflet, manual); Zzap 11 says **P** picks up | differs (for Zzap) | T is key `$16`, compared at `$970A`; nothing traced tests P (`$29`). D is key `$12`, dispatched at `$B33F` to `$98FE` |
| **Y answers yes** when a message ends in "?"; anything else is no (leaflet, manual) | traced | script op 11 (key test) with key `$19` at `$0AB6` (buying) and `$10CF` (launching) |
| **Speed: 1-9 and 0** set forward power, 0 the fastest; **SHIFT + digit** reverse thrust; **+ and -** fine adjustment; **SPACE** brakes or hovers (leaflet, manual) | traced (digits, + and -) | digits through the key table `$BC50` at `$B47E` into `$ED`, SHIFT folded in at `$B489`; + (`$28`) and - (`$2B`) at `$B356`/`$B361` step the speed by `$B499`. SPACE not found yet |
| **CTRL + RETURN pauses** (leaflet, manual) | traced | `$B335`: while the key is `$81` (CTRL with RETURN) the reader loops |
| **CTRL + Q quits the situation**: back to a Central City location, carried objects scattered; with nothing carried it gives a new ship (leaflet, manual, Zzap 13) | traced | key `$BE` at `$B3E5`: resets the stack and restarts at `$80E8` |
| **CTRL + S saves, CTRL + L loads**, prompting for a number 0-9 and "PRESS RETURN WHEN READY" (leaflet, manual) | traced | keys `$8D` and `$AA` at `$B36C`/`$B377`; the digit through `$BC50` into `$825E`; the cassette motor bit of `$01` is cleared at `$B3B9` while it waits; RETURN goes to `$819E`, which hands the machine back to the KERNAL (`IOINIT`, `CINT`) for the transfer |
| **The Second City** loads into the running game with CTRL + L and number 0 (the Second City leaflet) | open | not analysed: the disk's `MERC 2ND CITY` is a separately packed program |
| **Save files hold the world state** (Edge) | open | |
| **Buying the Dominion Dart** for 5000 credits, or stealing it (Zzap 11; 5000 and a 9000 start on another machine, Electron Dance) | live (the offer, the 9000) | "PRICE 5000 CREDITS" then "YOU HAVE 9000 CREDITS" (canned message 15; the money is the BCD figure `$7700`-`$7703`, `00 00 90 00` read live); `$0AAB` asks "DO YOU WANT TO BUY?" and waits five seconds for Y (`$0AB6`-`$0ABA`); each refusal gets another line, "I THINK YOU SHOULD BUY", "IS THIS SENSIBLE", "YOU PLAN TO WALK", "YOU MUST BE CRAZY" (all live); Y subtracts 5000 (`$0A29`: BCD 9999 5000 added) and prints "TRANSACTION COMPLETED". Script 1 (`$0A3C`) holds "THIS CRAFT BELONGED TO THE PALYAR COMMANDER'S BROTHER-IN-LAW / HE IS NOT TOO PLEASED" |
| **Idle messages** when the player does nothing after the crash (Zzap 13, site) | live | script 0: after the fourth unanswered "DO YOU WANT TO BUY?" and "YOU MUST BE CRAZY", with no input since the status report (flag `$80` of `$BEC0`, set by any input at `$B31B`), "IS ANYBODY THERE", "AM I TALKING TO MYSELF", "ARE YOU STILL ALIVE", "WHERE ARE YOU", 18 s apart (a 15 s wait, `$0A84`, plus the scrolling); then it waits for input, answers "AH! YOU ARE BACK", "NOW YOU ARE HERE...", "I WILL START AGAIN" and repeats the status report (`$08BC`). Logged from the message row over five minutes with no input |
| **The city**: a 16 by 16 grid of locations, one structure at the centre of each, about eighty constructions (Zzap 5 preview, Electron Dance) | open | |
| **Named landmarks**: Coach & Horses 15-02, Moorby Arch 10-01, Science Museum 03-01, Bosher Stadium 08-07, Walton Monument 06-00, St. Stallards 06-03, Vector Henge 02-04; the Encounter billboard 02-03 (manual's map, Eurogamer); Benson names a building when it is destroyed (Electron Dance) | traced (names) | scripts 38-48 at `$0B70`-`$0C56` print "SABINS CUBE", "THE WALTON MONUMENT TO THE FAMOUS ARCHITECT", "ST. STALLARDS", "THE MOORBY ARCH", "TYLER POINT", "BOSHER STADIUM", "JORDAN AIRPORT", "VECTOR HENGE", "THE PALYAR COMMANDER'S BROTHER-IN-LAW'S HOUSE", "THE MECHANOID FORT", "THE COACH AND HORSES / YOU WILL NOT BE POPULAR" |
| **The author's advert** (the Encounter billboard): destroying it makes things tougher, and the game will not let you leave until it is repaired (Zzap 11, Zzap 13) | traced (text) | script 37 at `$0B41`: "THE AUTHOR'S ADVERT / THINGS ARE GOING TO BE TOUGH FROM NOW ON"; script 7 at `$107F`: "THE AUTHOR WON'T LET YOU LEAVE UNTIL YOU FIX HIS ADVERT" |
| **Commodore and Atari signs**: shooting one earns congratulation, the other "traitor" (Zzap 11) | traced (text) | script 49 at `$0C97` "TRAITOR!", script 50 at `$0CAB` "GOOD SHOW!" |
| **Novabill** the pirate: shooting him gives "WELL DONE" (Zzap 13, Edge) | traced (text) | script 36 at `$0B28`: "NOVABILL - WELL DONE!" |
| **Destroying buildings** by firing at their base (manual) | open | |
| **Elevators and hangars**: hangar complexes at 03-00, 03-15 (pass needed), 09-05, 09-06, 11-13, 81-35 and one at `**-**` (Zzap 13, site, Survival Kit) | open | |
| **Underground**: corridors, doors at each end, eight door types; shaped doors need a key of the same shape; "LOCKED" (Zzap 11, manual) | open | |
| **Transporter doors**, marked by a diagonal or a cross; one reverses east and west (Zzap 13, Zzap 18, site's table) | open | |
| **Dark rooms** need the Photon Emitter (Zzap 13, Survival Kit) | open | |
| **Rooms that earn money**: named rooms buy objects; Benson names the room on entry (manual) | traced (names) | scripts 3-6, 9, 14-25 print the room names: ENGINE ROOM, CONFERENCE ROOM, EXCHEQUER, KITCHEN, INFIRMARY, POWER ROOM, STORES, ARMOURY, LABORATORY, CONTROL ROOM, INTERVIEW ROOM, MECHANOID FUEL STORES, MECHANOID POWER ROOM, MECHANOID STORES, MECHANOID ARMOURY, MECHANOID LABORATORY; script 11 "PRISON / PLEASE LEAVE"; payments "HERE FOR [n] REWARD", "[n] CREDITS PAID" |
| **Briefings**: the Palyars reward deliveries to rooms in the Colony Craft, a big fee for a captured Mechanoid, and "very special gratitude" for destroying all Mechanoid-occupied locations; the Mechanoids pay for Palyar requirements delivered to their control and for destroying selected Palyar installations (manual, Zzap 11) | traced (text) | script 28 at `$0CE2` (Palyar briefing room), script 13 at `$0D9D` (Mechanoid briefing room) |
| **Sale prices** per object and buyer (Zzap 13; site's table, mostly 16-bit) | open | |
| **Carry up to ten objects**; the last taken is the first dropped (leaflet, manual, Zzap 11) | open | |
| **Objects** (Zzap 13, site): Antenna, Antigrav, Anti-Time Bomb, Photon Emitter, Sights, Metal Detector, Poweramp, Novadrive, Kitchen Sink, Cobweb, Cheese, Pass, keys, Coffin, Gold, Medical Supplies, Catering Provisions, Large Box, Useful Armament, Energy Crystal, Neutron Fuel, Winchester, Databank, Essential 12939 Supply, the Mechanoid leader | traced (names) | object names at `$152F`-`$1663`, and words of the dictionary `$1249`-`$151B` |
| **Metal Detector** colours the panel by a building's owner: red nobody, green Palyar, blue Mechanoid (Zzap 13) | open | |
| **Kitchen Sink** lets you take almost anything, and with the Cobweb opens any door (Zzap 13, site) | open | |
| **Vehicles**: two ground vehicles and four flight craft, plus the interstellar one; speeds per craft (leaflet, manual; Zzap 13's C64 table: Dart 1650/4950, Palyar Diamond 1650/1650, Jet 825/7400, Cheese 3300/9900, Land Dart 3837, Car 825) | open | |
| **Take-off needs speed; landing too hard crashes** (leaflet, Zzap 11) | open | |
| **The Brother-in-law's New Ship** shuttles between 00-00 and 00-15 at altitude 500 and speed 100 (Zzap 13) | traced (text) | script 27 at `$0C7F`: "THE PALYAR COMMANDER'S BROTHER-IN-LAW'S NEW SHIP" |
| **Attacks**: ships attack after you destroy a side's buildings; a homing missile (manual, Zzap 13) | traced (text) | "PALYAR SHIP ATTACKING", "MECHANOID SHIP ATTACK" at `$11B7`/`$11C3` |
| **You are never killed**: hit, you lose your ship; crashes cost nothing (leaflet, manual, Survival Kit) | open | |
| **The Colony Craft**: a dot in the sky above the city at about 65000 m; land on its pad and press E; a key is needed; three floors (manual, Survival Kit) | open | |
| **Escape 1, hire a ship**: with the Antenna the Communications Room's radio works, and Hertz rents a ship if you have the credits (Zzap 11, Zzap 13) | traced (text) | script 2 at `$0E04`: "NOT WORKING", "MESSAGE FROM HERTZ SPACESHIP RENTAL", "SHIP FOR HIRE ... CR", "DO YOU WANT TO HIRE?", "INSUFFICIENT FUNDS", "SHIP DESPATCHED", "IT WILL LAND AT LOC 08-08 IN n MINS" |
| **Escape 2, the Interstellar Ship** at 03-15, which needs the Novadrive (Zzap 13, site) | traced (text) | script 7 at `$107F`: "INTERSTELLAR SHIP", "NOVADRIVE REQUIRED", "PRESS Y TO LAUNCH" |
| **Escape 3?** Destroying every Mechanoid site: 500,000 credits (Zzap 13), the Pass (site), or a reward in the red hangar (Electron Dance); whether it is an escape of its own is unclear | traced (text) | `$11CE`-`$11DD` "WE ARE MOST PLEASED YOU HAVE DESTROYED ALL KEY OPPOSITION SITES"; script 10 at `$120B` "YOU WILL FIND A REWARD INSIDE THE RED HANGER" |
| **The ending**: a congratulation, "save the status for Mercenary II", then "GAME OVER" shown for ever; the game goes on (Zzap 13, leaflet) | traced (text) | script 7: "THE AUTHOR SENDS YOU CONGRATULATIONS ON YOUR ESCAPE FROM TARG", "THE PALYAR COMMANDER'S BROTHER-IN-LAW IS PLEASED YOU'VE GONE", "SAVE OUT THE STATUS AND SEE YOU IN MERCENARY II", "GAME OVER" |
| **Score is credits** (Zzap 12, Zzap 18: 1,909,000 the most the city pays) | open | BCD counters of four bytes at `$76E0`, set and added by script ops 13, 14 and 21 |
| **Floating objects**: carrying only the Kitchen Sink, take the Pyramid (75,39 or 79-39), and anything dropped stays in the air (Zzap 18, Zzap 11) | open | |
| **A crash over 1,000,000 credits**, and one when hiring without the funds (a reader, Zzap 15) | open | |

## Beyond the documentation

Found in the code, not in the manual.

- **An event-script machine.** 51 scripts, indexed by the word table at
  `$0800`-`$0865`, run on a byte-code interpreter at `$8AB2`: 35 operations
  through the handler table `$8D5E`, among them print a message, tests of
  the clock, a key, the grid location, a flag, an object and a memory
  byte, jumps and calls within the scripts, calls into machine code,
  money arithmetic in BCD, and poke. Bit 7 of an operation inverts its
  test, bit 6 makes a taken branch a call. Scripts wait for the message
  window to empty before going on (`$E6`).
- **Messages are built from a dictionary.** A message is a list of word
  numbers (pointers at `$2120`/`$2210`, the words at `$1249`-`$151B`),
  literal text after `$FF`, the name of an object in play (`$F0`-`$F7`)
  and money figures (`$F8`-`$FE`).
- **It refuses NTSC.** `$5024` reads the KERNAL's PAL flag `$02A6` and, on an
  NTSC machine, jumps back to `$5000`, whose copy loop then runs on over
  zero page and the screen until the machine crashes (live:
  `reference/ntsc-machine-crash.png`).
- **RESTORE does nothing**: the NMI vector `$8009` is a bare `RTI` (live: pressed in play, one hit on `$8009`, play went on).
- **A seconds clock** runs from the panel interrupt: `$E2` counts frames to
  50, `$E3`-`$E4` seconds. The scripts' clock tests read it.
- **Four names at `$760A`**, "KBCODE(", "MYONO (", "POWER (", "ALLFLG(", in a
  table the start-up code sits beside; what reads them is not known yet.

## Open questions

- Whether a third, independent escape exists.
- Altitude unit: metres (leaflet, Survival Kit) or feet (manual).
- Where SPACE (brake) is read; which code handles B and T beyond the key
  comparison at `$9706`.
- What the self-modifying fill loop at `$2170`, reached through
  `JMP ($BFFD)` at `$8215`, is for.
- Whether anything reads the RAM under the I/O area (`$D000`-`$DFFF`).
