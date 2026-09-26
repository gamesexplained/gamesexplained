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
| **Opening sequence** (Zzap 11): the ship sits in space before a starfield; Benson engages the Novadrive, a fault develops, even maximum reverse thrust cannot stop the crash on Targ; then full manual control | live | the opening's script at `$7001`: "NOVADRIVE COUNTDOWN" on the original disk ("ABC UNLIMITED" in the packed build, the cracker's edit: `orientation.md`), a countdown 3, 2, 1, O (the letter), "NOVADRIVE ENGAGED", "PRESTINIUM ON COURSE", "DESTINATION GAMMA FIVE", "DAMAGE CONTROL REPORT", "SOME CONFLICT DAMAGE", "CHECKING", "EMERGENCY", "GUIDANCE SYSTEM FAULT", "COLLISION COURSE", "DISENGAGING NOVADRIVE", "UNABLE TO CORRECT", "MAXIMUM REVERSE THRUST"; then script 0: "CRASH IMMINENT!", "RETURNING TO...", "MANUAL CONTROL" and one of canned messages 60-63 at random ("YOU CRASHED" in the logged run); the starfield `$72FA`-`$74C9`, the planet `$74CA`; about 75 s from `$5000` to standing at 08-08 (all logged live from the message row) |
| **First messages on the ground** (Zzap 11): crash-landed near the airbase; a message to go to 9,6 | live (the first half), traced (the job offer) | script 0 at `$086C`: "CRASH LANDED ON TARG", "STATE OF WAR BETWEEN PALYARS AND MECHANOIDS", "LOCATION NEAR AIRBASE", "AIRCRAFT ON PAD", "TYPE - DOMINION DART", "CRAFT FOR SALE", "PRICE 5000 CREDITS"; script 1 at `$0A3C`, 15 s after the bought Dart is boarded, then with chance 81/256 every 15 s on the surface: "FOR MORE INFORMATION GO TO THE BRIEFING ROOM IN COMPLEX AT LOC 09-06" |
| **No title screen** on the Novagen version (Electron Dance, on another machine); the Datasoft release has one (GB64) | live | this build starts the opening straight after unpacking |
| **Control panel** (leaflet, manual, Zzap 11): EL (elevation dial), LOC (grid position), ALT, SPEED, COMP (compass) and Benson's message window | live | text rows 17-24 of the matrix `$5C00`; labels in the small font (glyph = ASCII − `$20`), messages in the large one (ASCII + `$80`); readouts `$B53D`, dials `$B67B`-`$B899` |
| **Benson's messages scroll** across the window (Wikipedia, Zzap 11) | live | `$8DC3`, from the panel interrupt: one character a frame into `$5F78`-`$5F8E`, with a tick on SID voice 3 per character |
| **LOC reads XX-YY**, X growing eastwards and Y southwards; city 0-15 by 0-15, wasteland to −99..+99 shown in reverse figures, `**` beyond (leaflet, manual, Survival Kit) | live (the city), traced (the rest) | `$B64C`: each coordinate's high byte; negatives in reversed figures (glyphs `$80`-`$89`), `**` beyond ±99 from the `$AA` entries of `$803A`. Read live at 08-08, 08-07, 12-04, 13-04, 14-05 |
| **Joystick in port 2** (manual, GB64) | live | `$B2FE` reads `$DC00`: directions to `$80`, fire to `$81`; every stick and fire test ran on port 2 |
| **Walking**: forward and back, turn left and right (leaflet) | live | `$A18B`, `$A1ED`: 80 units a pass, turning 16/1024 of a turn |
| **Flying**: forward dives, back climbs, left and right turn (leaflet, manual) | live | `$9F17`-`$A13C`; in the Dart, stick back took the pitch to `$01DE` and climbed, stick forward to `$0206` and descended |
| **Fire** launches a missile when the craft is armed (leaflet, manual) | live | `$886A`: in a craft, on the surface; object 8 along the view direction, 4096 units a pass for 16 passes. "Armed" is any craft: no object is needed |
| **B boards** a vehicle or craft from its centre; **L leaves** it (leaflet, manual, Zzap 11) | live (B), traced (L) | B (`$1C`, `$970E`) boards one of objects 0-7 within 512 units, on foot (`$985D`); boarded the Dart live. L (`$2A`) at `$B349` → `$98C8`, only when landed |
| **E works an elevator** from the centre of a three-sided cage; E again returns to the surface (leaflet, manual) | live | `$B3FD`: `$73` and `$79` in `$70`-`$73` (inside the cage `$E9A7`) on a square of `$B4B6`/`$B4BE`; ridden down and up at 08-08 |
| **T takes an object, D drops it** (leaflet, manual); Zzap 11 says **P** picks up | differs (for Zzap) | T is key `$16` (`$970A`), within 256 units (`$9800`); nothing tests P (`$29`). D is key `$12` (`$B33F` → `$98FE`), the last object taken first |
| **Y answers yes** when a message ends in "?"; anything else is no (leaflet, manual) | live | script op 11 with key `$19` at `$0AB6` (buying: live) and `$10CF` (launching) |
| **Speed: 1-9 and 0** set forward power, 0 the fastest; **SHIFT + digit** reverse thrust; **+ and −** fine adjustment; **SPACE** brakes or hovers (leaflet, manual) | live (0), traced (the rest) | `$B47E` through `$BC50`: digits 2^(n+4), 0 2^14 (live: full throttle in the Dart), SHIFT the sign; SPACE and ← give 2^−31, a stop; + and − multiply by 1.03 and 0.98 each pass while held (`$B499`) |
| **CTRL + RETURN pauses** (leaflet, manual) | traced | `$B335`: the reader loops until the next new key, which is then acted on |
| **CTRL + Q quits the situation**: back to a Central City location, carried objects scattered; with nothing carried it gives a new ship (leaflet, manual, Zzap 13) | differs | `$80E8`: everything carried and the craft ridden are scattered at random over the city, and the player is always put in the Dart (object 1) on its pad at 08-08; no test of what is carried |
| **CTRL + S saves, CTRL + L loads**, prompting for a number 0-9 and "PRESS RETURN WHEN READY" (leaflet, manual) | traced | `$B382`, `$819E`: "@0:MER" and the digit on device 8, 1904 bytes from the 14 blocks at `$8260`; the cassette motor is switched on (`$B3B9`) while the prompt waits |
| **The Second City** loads into the running game with CTRL + L and number 0 (the Second City leaflet) | open | not analysed: the disk's `MERC 2ND CITY` is a separately packed program. The mechanism is traced: after a load, `JMP ($BFFD)` (`$8215`) runs whatever address the loaded file put in the zero-page copy |
| **Save files hold the world state** (Edge) | traced | the blocks at `$8260`: every square (`$2B00`), every object's position, room and flags, the script variables and state, credits, the motion record and the whole zero page |
| **Buying the Dominion Dart** for 5000 credits, or stealing it (Zzap 11; 5000 and a 9000 start on another machine, Electron Dance) | live | "PRICE 5000 CREDITS", "YOU HAVE 9000 CREDITS" (`$7700`-`$7703` `00 00 90 00`); `$0AAB` asks "DO YOU WANT TO BUY?" and waits 4 to 5 seconds for Y (`$0AB6`-`$0ABA`); refusals get "I THINK YOU SHOULD BUY", "IS THIS SENSIBLE", "YOU PLAN TO WALK", "YOU MUST BE CRAZY" (live); Y adds 99995000 (`$0A29`): "TRANSACTION COMPLETED", "YOU HAVE 4000 CREDITS" (live). Boarded unbought, script 1 prints "THIS CRAFT BELONGED TO THE PALYAR COMMANDER'S BROTHER-IN-LAW / HE IS NOT TOO PLEASED" and a Palyar ship attacks |
| **Idle messages** when the player does nothing after the crash (Zzap 13, site) | live | script 0: after the fourth unanswered offer and "YOU MUST BE CRAZY", with no input since the status report (`$BEC0` bit 7, set by any input at `$B31B`), "IS ANYBODY THERE", "AM I TALKING TO MYSELF", "ARE YOU STILL ALIVE", "WHERE ARE YOU", 18 s apart; then, on input, "AH! YOU ARE BACK", "NOW YOU ARE HERE...", "I WILL START AGAIN" and the status report again (`$08BC`). Logged over five minutes with no input |
| **The city**: a 16 by 16 grid of locations, one structure at the centre of each, about eighty constructions (Zzap 5 preview, Electron Dance) | live | `$2600`/`$2700`: one model per square, 91 different structures and 7 road pieces in use; only the player's own square's building is loaded and drawn (live: `reference/one-building-*.png`); 00-00 never shows its own |
| **Named landmarks**: Coach & Horses 15-02, Moorby Arch 10-01, Science Museum 03-01, Bosher Stadium 08-07, Walton Monument 06-00, St. Stallards 06-03, Vector Henge 02-04; the Encounter billboard 02-03 (manual's map, Eurogamer); Benson names a building when it is destroyed (Electron Dance) | traced; live (Bosher Stadium seen at 08-07) | every name on the manual's map stands on its square (`$2600`/`$2700`) and `$2B00` bits 0-4 give each its script, 36-48 (`facts.md`, "Named squares"); the Science Museum has no name of its own (script 35) |
| **The author's advert** (the Encounter billboard): destroying it makes things tougher, and the game will not let you leave until it is repaired (Zzap 11, Zzap 13) | traced | script 37 at `$0B41`: "THE AUTHOR'S ADVERT / THINGS ARE GOING TO BE TOUGH FROM NOW ON", an attack, and `$BEC0` bit 3, which nothing reads: the only lasting effect is script 7's refusal ("THE AUTHOR WON'T LET YOU LEAVE UNTIL YOU FIX HIS ADVERT", `$2B00`+`$32` bit 7). The Anti Time Bomb repairs it (`$8816`) |
| **Commodore and Atari signs**: shooting one earns congratulation, the other "traitor" (Zzap 11) | live | the Commodore logo (`$C82E`) at 13-04, 03-13, 09-13, 04-15, 09-15, script 49 "TRAITOR!"; the Atari logo (`$C7B2`) at 14-05, 14-08, 12-11, 06-15, 11-15, script 50 "GOOD SHOW!". Seen live, and 13-04's sign shot: "TRAITOR!" |
| **Novabill** the pirate: shooting him gives "WELL DONE" (Zzap 13, Edge) | traced | 03-08 (`$E88D`, a giant head), script 36 at `$0B28`: "NOVABILL - WELL DONE!", with no reprisal |
| **Destroying buildings** by firing at their base (manual) | live | `$871B`: a missile below height 2048 within 4096 units of the square's centre; the collapse, the count and the script follow only while the player is in that square (`$87A4`) |
| **Elevators and hangars**: hangar complexes at 03-00, 03-15 (pass needed), 09-05, 09-06, 11-13, 81-35 and one at `**-**` (Zzap 13, site, Survival Kit) | live (08-08), traced (the rest) | `$B4B6`/`$B4BE`: 09-06, 09-05, 03-00, 11-13, 03-15 (the Pass, `$B430`), 81-35, 136-136 (`**-**`), 08-08 (the Colony Craft: live, from the ground too) |
| **Underground**: corridors, doors at each end, eight door types; shaped doors need a key of the same shape; "LOCKED" (Zzap 11, manual) | traced | 174 room records `$3000`-`$3B16`; door outlines `$928A`: plain, triangle, up arrow, down arrow, cross, diagonal and seven key shapes; a keyed door needs object 8 + type (`$9493`), else LOCKED (`$9430`) |
| **Transporter doors**, marked by a diagonal or a cross; one reverses east and west (Zzap 13, Zzap 18, site's table) | traced | booths `$72`-`$87`: cross two-way (door 0 relinked on entry, `$9119`), diagonal one-way, `$72` random among eight, `$7F` toggles `$F1`: the stick's left and right swap and the view mirrors |
| **Dark rooms** need the Photon Emitter (Zzap 13, Survival Kit) | traced | 20 rooms whose door list ends in `$80`; dark ("ITS VERY DARK IN HERE") unless object 16 is carried (`$941A`) or in the room (`$9425`) |
| **Rooms that earn money**: named rooms buy objects; Benson names the room on entry (manual) | traced | scripts 3-6, 9, 14-25 name the rooms (ENGINE ROOM ... MECHANOID LABORATORY) and pay through `room_payment` (`$1010`), which also says PLEASE LEAVE; script 11 is the PRISON |
| **Briefings**: the Palyars reward deliveries to rooms in the Colony Craft, a big fee for a captured Mechanoid, and "very special gratitude" for destroying all Mechanoid-occupied locations; the Mechanoids pay for Palyar requirements delivered to their control and for destroying selected Palyar installations (manual, Zzap 11) | traced | script 28 at `$0CE2` (room `$29`) and script 13 at `$0D9D` (room `$66`); each paragraph only while the player stays in the room |
| **Sale prices** per object and buyer (Zzap 13; site's table, mostly 16-bit) | traced | the scripts' figures (`facts.md`, "Money and trade"): 40,000 to 250,000, the Mechanoids paying more for five objects |
| **Carry up to ten objects**; the last taken is the first dropped (leaflet, manual, Zzap 11) | traced | `$9827` (at most ten), list `$BEB1`, count `$EB`; D drops from the top (`$990D`) |
| **Objects** (Zzap 13, site): Antenna, Antigrav, Anti-Time Bomb, Photon Emitter, Sights, Metal Detector, Poweramp, Novadrive, Kitchen Sink, Cobweb, Cheese, Pass, keys, Coffin, Gold, Medical Supplies, Catering Provisions, Large Box, Useful Armament, Energy Crystal, Neutron Fuel, Winchester, Databank, Essential 12939 Supply, the Mechanoid leader | traced | 64 objects; names are canned messages (`$151F` on); 55 models at `$1700`-`$2098` and `$3B25`-`$3FFE`; each object's use is in `facts.md`, "Objects" |
| **Metal Detector** colours the panel by a building's owner: red nobody, green Palyar, blue Mechanoid (Zzap 13) | traced | `$B542`: with object 26 carried, on the surface and low, the message window is blue for `$2B00` bit 6, red for bit 5, green otherwise |
| **Kitchen Sink** lets you take almost anything, and with the Cobweb opens any door (Zzap 13, site) | traced | the Sink (47) skips the fixed and heavy checks (`$980B`); object 48, drawn as a cobweb, opens every lock (`$948E`) on its own, but taking it needs the Sink |
| **Vehicles**: two ground vehicles and four flight craft, plus the interstellar one; speeds per craft (leaflet, manual; Zzap 13's C64 table: Dart 1650/4950, Palyar Diamond 1650/1650, Jet 825/7400, Cheese 3300/9900, Land Dart 3837, Car 825) | traced | eleven motion records at `$9DAD`: craft 2 and 5 on the ground only, 0, 1, 3, 4 and 6 flying, 7 interstellar; top speeds by calculation within 1 % of Zzap 13 (`facts.md`, "Moving") |
| **Take-off needs speed; landing too hard crashes** (leaflet, Zzap 11) | live (take-off), traced (landing) | the craft stays down below speed 128 (`$A024`); a touchdown crashes when the pass's height step is 256 or more, or the nose is more than 45° down (`$A0AF`); forward speed is not tested |
| **The Brother-in-law's New Ship** shuttles between 00-00 and 00-15 at altitude 500 and speed 100 (Zzap 13) | differs | object 0 (`$85C5`) moves one way along column 00, +1/256 square each surface pass, wrapping from row 15 to 0; shooting it runs script 27 |
| **Attacks**: ships attack after you destroy a side's buildings; a homing missile (manual, Zzap 13) | differs (the missile) | `$BEF8`, set by the squares' scripts: the attack ship (object 15) homes on the player at 1/32 of the distance a pass, but its missile (object 14) is aimed once at launch and not steered |
| **You are never killed**: hit, you lose your ship; crashes cost nothing (leaflet, manual, Survival Kit) | traced | a hit prints SHIP DESTROYED and sets mode 9, a fall (`$8964`); a crash throws the player out (`$98C8`) |
| **The Colony Craft**: a dot in the sky above the city at about 65000 m; land on its pad and press E; a key is needed; three floors (manual, Survival Kit) | live | object 63 at height `$40FCC0` over 08-08, drawn as a dot; landing on its deck (`$40FF3F`, ALT 64997) has no crash test; reached live by the lift at 08-08 from the ground; three floors, three doors keyed to object 23 |
| **Escape 1, hire a ship**: with the Antenna the Communications Room's radio works, and Hertz rents a ship if you have the credits (Zzap 11, Zzap 13) | traced | script 2 at `$0E04` (room `$10`): 999,999 credits, tested as at least 1,000,000 (`$0E6F`); object 7 lands at 08-08 after 780 passes |
| **Escape 2, the Interstellar Ship** at 03-15, which needs the Novadrive (Zzap 13, site) | traced | object 7 in room 5, the hangar under 03-15 behind the Pass; script 7 at `$107F`: "NOVADRIVE REQUIRED", "PRESS Y TO LAUNCH", unless 02-03 is destroyed |
| **Escape 3?** Destroying every Mechanoid site: 500,000 credits (Zzap 13), the Pass (site), or a reward in the red hangar (Electron Dance); whether it is an escape of its own is unclear | traced | a reward, not an escape: when the Mechanoid count leads by 105 (`$87EE`), script 10 moves the Pass into room 1, the red hangar, or pays 500,000 if the Pass has already left its room `$50` |
| **The ending**: a congratulation, "save the status for Mercenary II", then "GAME OVER" shown for ever; the game goes on (Zzap 13, leaflet) | traced | script 7 and the starfield `$AA62`, which never returns; `$BEC0` bit 6 is never cleared, so GAME OVER repeats for ever, a 15-second wait and a 3-second line apart |
| **Score is credits** (Zzap 12, Zzap 18: 1,909,000 the most the city pays) | traced | figure 8 at `$7700`, BCD; the scripts' prices add up to Zzap 18's 1,909,000 |
| **Floating objects**: carrying only the Kitchen Sink, take the Pyramid (75,39 or 79-39), and anything dropped stays in the air (Zzap 18, Zzap 11) | traced | carrying object 56, a pyramid, lets D work in the air and leaves the object at the player's height (`$98FE`) |
| **A crash over 1,000,000 credits**, and one when hiring without the funds (a reader, Zzap 15) | open | not reproduced: with credits poked to 1,509,000, buying the Dart printed "YOU HAVE 1504000 CREDITS" and play went on (live, `work/live-tests.md`); credits are eight BCD digits (`$7700`-`$7703`) printed through `$8E74`, and no code treats seven digits differently. The hiring path with too little money (`$0E6F` → "INSUFFICIENT FUNDS") was not run |

## Beyond the documentation

Found in the code, not in the manual.

- **Only one building exists at a time**: the player's own square's
  (live: `reference/one-building-a-0808-facing-north.png`, `-b-…`).
- **The lift at 08-08 works from the ground**: E there goes down into the
  Colony Craft's hangar, and E again comes up on its deck (live:
  `reference/lift-0808-*.png`).
- **A building shot from the next square is never counted**: no name, no
  reprisal, no credit toward the site reward (live:
  `reference/blind-shot-*.png`).
- **The original hangs on reset** (`CBM80` at `$8004`, a loop at `$2170`);
  the crack returns to BASIC (live: `reference/reset-*.png`).
- **The Dart cannot reach the Colony Craft on its own**: its ceiling is
  `$0A` (height 655,360, ALT 10000) against the Colony Craft's `$40`; the
  Poweramp raises it to `$5A`, as the jet and the CHEESE have.
- **Roads** are drawn only from height 2048 up, and above `$200000` a fixed
  13-road picture replaces them.
- **00-00 never shows its building** (`$E424`): square number 0 means
  "outside the city".
- **An event-script machine.** 51 scripts, indexed by the word table at
  `$0800`-`$0865`, run on a byte-code interpreter at `$8AB2`: 35 operations
  through the handler table `$8D5E` (`facts.md`, "The event scripts").
- **Messages are built from a dictionary** of 239 words, with literal text,
  money figures and 25-character lines.
- **Numbers are logarithms**: two-byte floats multiplied by adding logs
  from the tables at `$5800`/`$5900`.
- **It refuses NTSC.** `$5024` reads the KERNAL's PAL flag `$02A6` and, on
  an NTSC machine, jumps back to `$5000`, whose copy loop then runs over
  zero page and itself until the machine crashes (live:
  `reference/ntsc-machine-crash.png`).
- **RESTORE does nothing**: the NMI vector `$8009` is a bare `RTI` (live:
  one hit on `$8009`, play went on).
- **A seconds clock** runs from the panel interrupt: `$E2` counts frames to
  50, `$E3`-`$E4` seconds.
- **Leftovers**: the Atari DOS 2 menu at `$BC90`-`$BCFF`, in the Atari's
  screen code; four names at `$7606`, "KBCODE(", "MYONO (", "POWER (",
  "ALLFLG(", read by nothing.
- **Save files carry `$8000`-`$803F`**: a save made with the original disk
  restores its `CBM80` signature in any copy that loads it.

## Open questions

- The Second City: `MERC 2ND CITY` has not been unpacked or read.
- What `$BEBD` was for: only the unused script operations 22 and 23 touch
  it.
- Altitude unit: the code's ALT is height × 1000/65536; the leaflet says
  metres, the manual feet.
