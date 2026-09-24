# Master of Magic — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The tape inlay's instructions, as typed into the crack's document reader
  ("These docs adapted from the tape cover by HOK of REMEMBER in 1997"),
  read from the contributor's image on 2026-09-24 (**inlay**).
- The game's own screens: title scroller, controls screen, five
  instruction pages, menus and messages, seen in the emulator on
  2026-09-24 (**screen**).
- C64-Wiki, "The Master of Magic",
  https://www.c64-wiki.com/wiki/The_Master_of_Magic, read 2026-09-24: a
  stub (credits, year, Zzap!64's 88 %), no cheats.
- Wikipedia, "Master of Magic (1985 video game)",
  https://en.wikipedia.org/wiki/Master_of_Magic_(1985_video_game), read
  2026-09-24: credits, December 1985, the music's source.
- Zzap!64 issue 12 (April 1986), review, 88 %, OCR at
  https://archive.org/details/zzap64-magazine-012, read 2026-09-24
  (**Zzap**).
- Commodore User issue 30 (March 1986), 5/5, and Commodore Horizons
  issue 27 (March 1986), 8/10, OCR on archive.org, read 2026-09-24.
- Crash issue 31 (August 1986), review of the Spectrum conversion, which
  says the game first appeared on the C64, and Crash issue 36 (January
  1987), a reader's partial solution for the Spectrum version, OCR on
  archive.org, read 2026-09-24 (**Crash**).
- The CRPG Addict, "Game 222: The Master of Magic (1985)",
  http://crpgaddict.blogspot.com/2016/05/game-222-master-of-magic-1985.html,
  read 2026-09-24: a full play-through to the win (**Addict**).
- Spectrum Computing (ZXDB) entry 3054 and the Spectrum inlay
  (https://spectrumcomputing.co.uk/entry/3054/ZX-Spectrum/Master_of_Magic),
  read 2026-09-24: "Original game by Richard Darling. Conversion by Tim
  Miller".
- CSDb (https://csdb.dk/release/?id=41592, https://csdb.dk/release/?id=72945,
  https://csdb.dk/sid/?id=14325), read 2026-09-24: Remember's two "+2D"
  releases (1997; 2008 with a "bug-fix" credit), the SID rip.
- The High Voltage SID Collection's STIL and song lengths for
  `/MUSICIANS/H/Hubbard_Rob/Master_of_Magic.sid`, read 2026-09-24
  (**HVSC**).
- Lemon64 and MobyGames refused automated access, so their pages
  (including Lemon64's instructions, doc 370) were not read.

## Features

| Feature | Status | Where |
|---|---|---|
| **Goal** (inlay, screen, Addict): bring the Amulet of Immortality back to the pedestal by the pool where you arrived; Thelric's parting message says so at the start of every game. The Addict won by dropping it on the pedestal; the ending is text | open | the parting message is live (`reference/play-first-menu.png`); the win is `$03C7` = `$7B` in the main loop (`$0851`), which prints the ending at `$5A5D`; what sets it is not found yet |
| **The Minotaur guards the amulet and falls only to the Dagger of Death** (Addict, Lemon64 snippets; a scroll: "THE DAGGER OF DEATH IS A SPECIAL KIND, WHEN USED ON THE MINOTAUR IT WEAKENS HIS MIND") | open | the scroll text is at `$53EF` |
| **Vampires need the wooden dagger** (Addict, Crash; a scroll: "AS SURELY AS THE EAST WIND BLOWS, THE DAGGER OF WOOD IS THE VAMPIRES FOE"); one of two vampires carries the Dagger of Death | open | the scroll text is at `$55A4` |
| **Controls** (inlay, screen): joystick in port 2, or keys H up, B down, Commodore key left, SHIFT right, SPACE fire | confirmed | `$0CC6` reads `$DC00` (port 2) into `$0387`/`$0388`/`$0389`, then SHIFT and Commodore from `$028D` and H and B from `$C5`; port 2 movement and B live |
| **Demonstration mode** (inlay, Crash): runs on its own after the title scroller; fire or SPACE leaves it | live | `reference/demo-orc-attack.png`; SPACE left it |
| **Controls screen and five instruction pages** (screen): "FIRE TO START OR B FOR INSTRUCTIONS"; the pages are HOW TO CONTROL THE GAME, THE DISPLAY, TO PLAY THE GAME, USING MAGIC, MAGICAL OR PHYSICAL COMBAT | live | B and stick down both open them (`reference/controls-screen.png`, `reference/instructions-page1.png`); text at `$8391`-`$8F9A` |
| **Menu across the middle** (inlay, screen): chosen with the stick and fire; the cursor starts on RUN; some options open submenus | live | RUN INVENTORY EXAMINE CAST at the start; eighteen verbs dispatched through `$4C03` (facts.md) |
| **The menu offers only what applies** (inlay: "other options will appear"; Crash, Your Sinclair: PICK UP, OPEN, CLOSE, ATTACK appear when relevant, so ATTACK's position drifts) | open | |
| **RUN** (inlay): move about; fire returns to the menu | live (moving) | the view scrolls as you move |
| **Doors** (inlay, Crash): OPEN in front of one, CLOSE once through; many monsters open and close doors too | open | handlers OPEN `$1B9D`, CLOSE `$1C31` |
| **Doorways need exact alignment** (Zzap: you can get stuck in a doorway unless exactly lined up with the passage) | open | |
| **Picking up and putting down** (inlay): stand on top of an object | open | PICK UP `$195C`, PUT DOWN `$1AED` |
| **Two hands, worn items and a backpack** (inlay, Crash, Addict): the right hand's weapon is the one you fight with; the left holds a shield; WEAR/TAKE OFF; the backpack carries more; "YOU CANNOT CARRY THAT MUCH WEIGHT." | open | handlers WEAR `$1D00`, TAKE OFF `$1D8B`, PUT IN `$1E21`, TAKE OUT `$1F15`, LOOK IN `$1FCB`, SWAP `$20A5`; the message at `$46B3` |
| **INVENTORY** (inlay, screen) | live | "YOU ARE CARRYING -NOTHING- IN YOUR RIGHT HAND, -NOTHING- IN YOUR LEFT HAND, AND YOU ARE WEARING NOTHING BUT YOUR CLOTHES." (`reference/play-inventory.png`) |
| **EXAMINE** (screen, Addict): a submenu of what is near; each object and creature has a description | live (empty) | "-NOTHING-" at the start (`reference/play-examine-nothing.png`); descriptions at `$51D1`-`$5704` |
| **Weapons** (Addict, Crash): fists, dagger, mace, axe, sword, wooden dagger, Dagger of Death | open | |
| **Armour** (Addict, Crash): helmet, shield, a suit of armour; they lower the enemy's chance to hit and the damage | open | |
| **Potions** (inlay, Addict, Crash, Lemon64): two of healing; one that restores mind, its label written backwards ("ALUMROF ECNEGILLETNI ARTXE", Extra Intelligence Formula); a trap, "POTION OF ORCANIAN INTELLECT", that lowers mind | open | the strings are at `$51ED`, `$52ED`, `$5341` |
| **Rings** (inlay, Addict): Ring of Dexterity, Ring of Protection from Evil, others of unknown effect; a scroll says "THE SAPPHIRE IS CURSED, IT BRINGS BAD LUCK" | open | strings at `$5545`, `$551A`, `$524F`, `$5294` |
| **Scrolls with hints, some misleading** (inlay: "some of the messages might be misleading"; Addict: the scroll about a healing wizard, Leggoless, lies) | open | "THE KIND OLD WIZARD LEGGOLESS WILL HEAL YOUR WOUNDS" at `$5445` |
| **CAST**, four spells known from the start (inlay, screen) | live (menu) | the submenu lists MAGIC MISSILE, FIREBALL, MAGICAL SHIELD, ENERGY DRAIN, -NOTHING- (`reference/play-cast-menu.png`) |
| **Magic Missile** (inlay): a fiery arrow at any live target in sight; heavy damage, high chance of missing | open | |
| **Fireball** (inlay): a 15-foot radius round you, burns everyone else in it | open | |
| **Energy Drain** (inlay): at any creature in sight, an instant loss of some body strength; an Addict commenter says it also restores yours | open | the demonstration casts it |
| **Magical Shield** (inlay): protects you until uncast (UNCAST), draining mind power all the while | open | UNCAST `$2F22` |
| **Spells cost mind power**; "THE SPELL DID NOT WORK PROPERLY BECAUSE YOU DID NOT HAVE ENOUGH MIND POWER" (inlay, screen text); enough for about two spells at the start (Crash); mind and body never regenerate (Addict) | open | the message at `$48BA` |
| **Mind and body strength shown at the top** (inlay, screen) | live | the M and B bars (`reference/play-first-menu.png`) |
| **Body strength and hits**: every creature has one; a hit takes off an amount set by the weapon and the attacker's strength; hit or miss is partly luck, and depends on protection, skill and magic (inlay) | open | the trainer's body option patches `SBC $038A` at `$24D0` out of the update of `$4EC5` (orientation.md) |
| **A dead monster's possessions can be picked up and used** (inlay, Zzap) | open | |
| **DEAD stamped on a killed creature's picture, in red** (Zzap, Crash) | open | |
| **Game clock** (inlay, screen): top right; stops while you choose from the menu, and (Crash) the monsters with it | live (clock) | 00:00:00 in the first menu, running during RUN; the monsters open |
| **The view window**: only what is in your line of sight (inlay, Zzap, Sinclair User) | live | corridors appear as they come into view (`reference/play-corridor.png`) |
| **Several levels, with stairs and doors; items always in the same places** (Your Sinclair, Addict, Crash) | open | |
| **The picture strip**: pictures of every creature and object near you (inlay) | live | the orc in the demonstration |
| **The message window**: says what is happening (inlay) | live | attack messages in the demonstration |
| **Monster habits** (inlay, Crash, Addict): varying intelligence; most hostile; want your meat and your possessions; guard treasure; some easily scared; a chaser that loses sight of you may give up and go home, go to where it last saw you and search there, or hunt you for a long time; always moving even unseen; most patrol round their lair, some wander; snakes ignore you unless you are on top of them | open | |
| **Thelric's warning** (inlay): "a sharpened blade may not be best!" | open | |
| **Title screen** (screen): the logo over a cave picture, the story on a scroller | live | `reference/title.png` |
| **Music by Rob Hubbard**, three tunes (HVSC: "Main Theme", "Game Over (You're dead)", "Game beaten"); the main theme is an arrangement of Synergy's "Shibolet" (HVSC, Wikipedia) | live (title and play) | the SID plays on the title and in play (`$03D1` set); the other two open |
| **No sound effects, only music** (Addict) | open | the play interrupt has a voice-1 noise burst when `$03CF` asks for one (`$2778`) |
| **Credits** (inlay): programmed by Richard Darling, graphics by James Wilson, music by Rob Hubbard | open | not found in the game's own text |

## Beyond the documentation

Found in the code, not in the manual.

- **M switches the music off and on** in the menu (live): `$0C94` toggles
  `$03D1`; with it clear the play interrupt stops calling `$1949` and the
  voices fall silent; a second M starts them again.
- **RESTORE restarts the game** (live): `CBM80` at `$8004` makes the
  KERNAL's NMI handler jump through `$8002` to `$0818`, the restart, which
  shows the title again. A reset goes the same way through `$8000` (live),
  but the title then came up with its colours wrong; why is not
  established.

## Open questions

- Is the loading picture the tape's own loading screen, or the crackers'?
