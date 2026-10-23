# Shadowfire — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Shadowfire operator's manual (Beyond, 1985, both machines in one
  booklet), scanned with the tape in the Ultimate Tape Archive,
  https://archive.org/download/uta_Shadowfire_1985_Beyond_2440/Extras/Instructions_text.pdf,
  read 22 October 2026. The text layer is OCR; the keyboard table is
  garbled in it.
- Shadowfire (video game), Wikipedia,
  https://en.wikipedia.org/wiki/Shadowfire_(video_game), read 22 October 2026.
- Screenshots of the tape loading, Ultimate Tape Archive item
  `uta_Shadowfire_1985_Beyond_2440`, and of a cracked copy's play
  (`Shadowfire_1985_Beyond_Software_cr_Yak_Society`), archive.org, read
  22 October 2026. Saved in `reference/` as `web-*.png`.
- C64-Wiki has no page for the game (`Shadowfire` and `Shadow_Fire` on
  c64-wiki.com and c64-wiki.de were empty on 22 October 2026). Lemon64
  refused the fetch (a browser check).

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen shown while the tape loads ("Beyond © 1985, Shadowfire by Denton Designs") | open | |
| Control menu: F1 keyboard, F3 digital joystick, F5 analog joystick (paddles), F7 light pen | open | |
| Keyboard control: keys by row move the cursor; F7 or any top-row key enters a command | open | |
| Joystick moves the cursor over the icons; fire enters | open | |
| Analog joystick (paddles) moves the cursor | open | |
| Light pen moves the cursor; its button or any key enters | open | |
| Self-display (demonstration) mode starts after the first screen; any key leaves it | open | |
| Scrolling welcome message in the command panel ("Welcome ally of the Empire...") | open | |
| Start menu: Old game, New game, Load game, Save game | open | |
| Start menu summary: surviving Enigma Force, enemy killed or captured, mission status, Kryxix rescued or not | open | |
| New game starts the real-time countdown: one hour forty minutes | open | |
| Save and load to cassette or disc, with a file name spelt with on-screen letters, a RUB icon and a carriage-return icon; Run/Stop on a tape failure | open | |
| Enigma team screen: the surviving characters, chosen with the cursor | open | |
| Up and down arrows on the team screen turn the background music on and off | open | |
| Four screens per character: Status, Objects, Movement, Battle, reached by green, yellow and red monitor icons; Quit goes back or cancels | open | |
| Status screen: agility, strength, stamina and weight bars; weight bar red when overloaded; weakened characters may recover | open | |
| Objects screen: objects in the location (left), carried (middle), weight bar; Pick-up, Drop, Ready for use, Activate | open | |
| Weapons fire automatically in combat, but only one held "ready for use"; otherwise bare hands | open | |
| Manto's transporter: Pick-up, Transporter, Activate, Ballistic control beams Manto to the Fighter Bay or the top or bottom Shuttle Bay | open | |
| Beaming the rest of the team: Drop, Transporter, Activate, Transporter, then the character | open | |
| Movement screen: filled arrows show the directions possible; a text description of the location | open | |
| A character refuses to move at a locked door without a key card, or when about to be attacked | open | |
| Battle screen: Location scan (characters in this or the next location), Attack, Defend, Retreat | open | |
| Battles in the same location or between adjacent ones; weapons differ in strength and range; "the computer will tell you if a battle cannot be resolved" | open | |
| A successful attacker advances into the enemy's location | open | |
| Mission command panel above every screen: status icons, view screen, character in play | open | |
| Status icon colours: white inactive, blue moving, purple attacking, orange defending, yellow retreating, green picking a lock; grey when weak, black when dying | open | |
| View screen: an iris opens on the chosen character; icons flash for each other character in the location | open | |
| Six characters with different speed, strength, stamina and carrying: Zark Montor, Syylk, Sevrina Maris, Torik, Maul, Manto | open | |
| Zark Montor is the translator: Kryxix follows only him (Wikipedia) | open | |
| Syylk's hatred of Zoff "could prove a weakness" | open | |
| Sevrina picks locks (with the tool kit) | open | |
| Torik is the fastest; Maul slow and well protected; Manto the only transporter | open | |
| Enemies: General Zoff (purple icon), Captain Chur (white or grey), Marshalls, Squad leaders ("Targs"), Troopers ("Eugs"), humanoid and robotic | open | |
| Ambassador Kryxix appears as a green icon; he must be located and beamed off | open | |
| The Phantom, Zoff's invisible pet, attacks characters at random. Wikipedia says this was a bug in the C64 version, later fixed | open | |
| Objects: projectile pistol, lazer rifle, rocket launcher, grenade, smoke bomb, tool kit, colour-coded key cards, self-destruct card, self-destruct unit, time delay unit, transporter beacon | open | |
| Rocket launcher best fired into an adjacent location; grenade and smoke bomb in the same location | open | |
| Time delay unit: the character who activates it is the only thing not held in a time lock | open | |
| Self-destruct unit, armed with the self-destruct card, counts down four minutes to the end of Zoff V | open | |
| Transporter beacon: only Manto operates it, and only after it is dropped in a location | open | |
| Objectives in any order: rescue Kryxix, capture Zoff, capture or destroy Zoff V | open | |
| Music by Fred Gray | open | |

## Beyond the documentation

Found in the code, not in the manual.

## Open questions
