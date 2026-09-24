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
| **Goal** (inlay, screen, Addict): bring the Amulet of Immortality back to the pedestal by the pool where you arrived; Thelric's parting message says so at the start of every game. The Addict won by dropping it on the pedestal; the ending is text | live | PUT DOWN (`$1AED`) sets `$03C7` to `$7B` when the object put down is `$15`, the amulet, and the player stands on map cell `$9677` (`$1B82`-`$1B96`); with the amulet poked into the right hand and the player onto that cell, the ending printed (`reference/ending.png`). The amulet starts at `$961F`, on the far side of the map from the start `$947B` |
| **The Minotaur guards the amulet and falls only to the Dagger of Death** (Addict, Lemon64 snippets; a scroll: "THE DAGGER OF DEATH IS A SPECIAL KIND, WHEN USED ON THE MINOTAUR IT WEAKENS HIS MIND") | differs | he starts at `$959B`, a few cells from the amulet. His defence, 133, is beyond every roll; with the Dagger of Death `$2B93` sets the roll to his defence, a certain hit, and `$2B26` makes the damage 30 to his body, not his mind. Spells always miss him (`$3AC7`; live) |
| **Vampires need the wooden dagger** (Addict, Crash; a scroll: "AS SURELY AS THE EAST WIND BLOWS, THE DAGGER OF WOOD IS THE VAMPIRES FOE"); one of two vampires carries the Dagger of Death | traced | the dagger of wood does 30 to either vampire (`$2B2B`-`$2B3F`); its roll bonus (`$2B7F`) can never apply, so the first vampire (defence 60) can be hit only with the Ring of Dexterity; the second's defence reads as 25 from an overlapping table and it is always hit. The second vampire (`$3E`) starts holding the Dagger of Death |
| **Controls** (inlay, screen): joystick in port 2, or keys H up, B down, Commodore key left, SHIFT right, SPACE fire | confirmed | `$0CC6` reads `$DC00` (port 2) into `$0387`/`$0388`/`$0389`, then SHIFT and Commodore from `$028D` and H and B from `$C5`; port 2 movement and B live |
| **Demonstration mode** (inlay, Crash): runs on its own after the title scroller; fire or SPACE leaves it | live | it is recorded input, replayed with a saved random seed (`$1888`, `$A540`-`$A7FF`; facts.md); `reference/demo-orc-attack.png`; SPACE left it |
| **Controls screen and five instruction pages** (screen): "FIRE TO START OR B FOR INSTRUCTIONS"; the pages are HOW TO CONTROL THE GAME, THE DISPLAY, TO PLAY THE GAME, USING MAGIC, MAGICAL OR PHYSICAL COMBAT | live | B and stick down both open them (`reference/controls-screen.png`, `reference/instructions-page1.png`); text at `$838E`-`$8F99`, printed by `$5C92` |
| **Menu across the middle** (inlay, screen): chosen with the stick and fire; the cursor starts on RUN; some options open submenus | live | the chooser `$1320`; eighteen verbs dispatched through `$4C03` (facts.md) |
| **The menu offers only what applies** (inlay: "other options will appear"; Crash, Your Sinclair: PICK UP, OPEN, CLOSE, ATTACK appear when relevant, so ATTACK's position drifts) | live | `$11A2` adds each option on a count from `$128F` (facts.md); holding the amulet the menu read RUN, PUT DOWN, SWAP, INVENTORY, EXAMINE, CAST (`reference/play-menu-holding.png`), and holding a potion it offered DRINK |
| **RUN** (inlay): move about; fire returns to the menu | live | `$08B9`; one pixel a world pass, about 1.2 cells a second; fire is refused while the player's dot touches a wall (`$091C`) |
| **Doors** (inlay, Crash): OPEN in front of one, CLOSE once through; many monsters open and close doors too | traced | a door is two cells either side of the wall line; OPEN and CLOSE act on the cell the player stands on (`$1BBF`, `$1C85`), which the menu tests at the view's centre `$04CD`; orcs, the wizard, skeletons, vampires and the minotaur open a shut door they pass and close it behind them (`$2566`, `$2600`, `$25F4`); the demonstration opens one (`$97FC`/`$987C` differ in demo.vsf) |
| **Doorways need exact alignment** (Zzap: you can get stuck in a doorway unless exactly lined up with the passage) | traced | walls stop the player's 4 × 4 dot by the video chip's sprite-to-background collision (`$038D`, `$0F95`), so the dot has to fit the gap in the door's glyph; CLOSE puts the player back in the middle of his cell (`$1C50`). Not measured |
| **Picking up and putting down** (inlay): stand on top of an object | live | PICK UP `$195C` lists the objects on the player's cell; PUT DOWN `$1AED` drops on it; a mace and a potion picked up live |
| **Two hands, worn items and a backpack** (inlay, Crash, Addict): the right hand's weapon is the one you fight with; the left holds a shield; WEAR/TAKE OFF; the backpack carries more; "YOU CANNOT CARRY THAT MUCH WEIGHT." | live | hands `$4C01`/`$4C02`, the right filled first; ATTACK uses the right hand (`$2A73`); the backpack is the only container; the limit is a total below 70 (`$1A03`): wearing 60, a 10 was refused and 8 then 1 taken, live. The shield in the left hand protects nothing (see Armour) |
| **INVENTORY** (inlay, screen) | live | "YOU ARE CARRYING -NOTHING- IN YOUR RIGHT HAND, -NOTHING- IN YOUR LEFT HAND, AND YOU ARE WEARING NOTHING BUT YOUR CLOTHES." (`reference/play-inventory.png`), from `$1A30` |
| **EXAMINE** (screen, Addict): a submenu of what is near; each object and creature has a description | live (empty) | "-NOTHING-" at the start (`reference/play-examine-nothing.png`); `$2CD4` lists what the player holds and everything on his cell; 28 descriptions, two of which no object uses (facts.md) |
| **Weapons** (Addict, Crash): fists, dagger, mace, axe, sword, wooden dagger, Dagger of Death | traced | damage (random AND mask) + 2: fist 2-3, daggers 2-5, sword, axe and mace 2-9 (`$4E45`, `$2AFF`); the specials above |
| **Armour** (Addict, Crash): helmet, shield, a suit of armour; they lower the enemy's chance to hit and the damage | differs | `$24F1` lowers the creature's roll: armour 5, helmet 2; nothing lowers the damage. Both count whenever the player holds them, worn or in a hand, because the test reads the "can be worn" flag; the shield tests can never pass, so a shield does nothing |
| **Potions** (inlay, Addict, Crash, Lemon64): two of healing; one that restores mind, its label written backwards ("ALUMROF ECNEGILLETNI ARTXE", Extra Intelligence Formula); a trap, "POTION OF ORCANIAN INTELLECT", that lowers mind | traced | DRINK `$2D5E`: `$0B` and `$0F` body + 8-15; `$0C` mind + 8-15; `$0E` mind halved; and `$0D`, "IT SMELLS PUNGENT, THERE IS NO LABEL", body halved |
| **Rings** (inlay, Addict): Ring of Dexterity, Ring of Protection from Evil, others of unknown effect; a scroll says "THE SAPPHIRE IS CURSED, IT BRINGS BAD LUCK" | traced | Dexterity (`$12`) adds 8 to the player's roll while worn (`$2AD5`); Protection from Evil (`$11`) takes 4 off a creature's roll and the blue-stone ring (`$10`) adds 8 to it, whenever held (`$24F1`); `$13` and `$14` do nothing. The sapphire warning is text 3, which no object shows |
| **Scrolls with hints, some misleading** (inlay: "some of the messages might be misleading"; Addict: the scroll about a healing wizard, Leggoless, lies) | traced | six scrolls, read with EXAMINE (`$571E`); the wizard's scroll is false (nothing but two potions raises body strength, and the wizard hits hardest); "WEAKENS HIS MIND" is false too (facts.md, Text) |
| **CAST**, four spells known from the start (inlay, screen) | live | the submenu lists MAGIC MISSILE, FIREBALL, MAGICAL SHIELD, ENERGY DRAIN, -NOTHING- (`reference/play-cast-menu.png`); `$2E23` |
| **Magic Missile** (inlay): a fiery arrow at any live target in sight; heavy damage, high chance of missing | differs | 15 damage, and no chance at all: `$3AD6` overwrites the random number, so it always hits every creature but the first vampire and the minotaur, which it always misses (live, from six random states) |
| **Fireball** (inlay): a 15-foot radius round you, burns everyone else in it | traced | 15 to every creature in sight on the player's cell, the eight around it or two cells away straight (`$2EF4`-`$2F1E`, the distance grid `$5081`); misses only the minotaur |
| **Energy Drain** (inlay): at any creature in sight, an instant loss of some body strength; an Addict commenter says it also restores yours | differs | 7 off the target's body (`$57D5`, `$3AC7`); nothing gives any to the player: every write to his body strength is a hit, a potion or the new game |
| **Magical Shield** (inlay): protects you until uncast (UNCAST), draining mind power all the while | traced | 8 off every creature's roll (`$57D3`, `$2491`); 1 mind to cast, then 1 every 100 world passes (`$3A40`); while it is up the menu offers UNCAST instead of CAST, so no other spell can be cast |
| **Spells cost mind power**; "THE SPELL DID NOT WORK PROPERLY BECAUSE YOU DID NOT HAVE ENOUGH MIND POWER" (inlay, screen text); enough for about two spells at the start (Crash); mind and body never regenerate (Addict) | live | costs 6, 10, 1, 5 (`$57D5`), paid before the target is chosen; with too little, mind goes to 0 (`$2E85`). Mind starts at 30, enough for five missiles or three fireballs. Nothing regenerates: only potions raise body or mind. The M bar fell by a missile's cost live |
| **Mind and body strength shown at the top** (inlay, screen) | live | the M and B bars (`$2BDE`, `reference/play-first-menu.png`) |
| **Body strength and hits**: every creature has one; a hit takes off an amount set by the weapon and the attacker's strength; hit or miss is partly luck, and depends on protection, skill and magic (inlay) | live | to hit: random 0-31 + skill against defence; damage: random AND weapon mask + strength / 8 (`$2ACC`, `$2484`, facts.md); the minotaur's killing blow live (`reference/death.png`) |
| **A dead monster's possessions can be picked up and used** (inlay, Zzap) | live | `$3B63` drops everything a dying creature held on its cell; a skeleton killed live left its dagger in the strip (`reference/dead-skeleton.png`) |
| **DEAD stamped on a killed creature's picture, in red** (Zzap, Crash) | live | a band-2 sprite spelling DEAD, light red and doubled (`$156C`, `$A500`); `reference/dead-skeleton.png` |
| **Game clock** (inlay, screen): top right; stops while you choose from the menu, and (Crash) the monsters with it | live | the clock counts world passes, one second per 8 (`$2C50`), and passes run only after a choice, so clock and monsters both stop in the menu; about 1.2 game seconds a real second while running (21 in 17.6 s) |
| **The view window**: only what is in your line of sight (inlay, Zzap, Sinclair User) | live | 28 rays cast pixel by pixel through the map's glyphs (`$0B25`); the window matched the map cell for cell in play-run (`reference/play-corridor.png`) |
| **Several levels, with stairs and doors; items always in the same places** (Your Sinclair, Addict, Crash) | traced | four 32 × 32 levels side by side in one 128 × 32 map (`$9000`); staircases move you 32 columns (`$20CC`); every start place is fixed (`$3EF0`/`$3F30`, copied at each new game) |
| **The picture strip**: pictures of every creature and object near you (inlay) | live | everything in sight, plus one picture per door and staircase in the view window (`$1695`, `$16DA`), twelve slots |
| **The message window**: says what is happening (inlay) | live | `$2941`; attack messages in the demonstration and live |
| **Monster habits** (inlay, Crash, Addict): varying intelligence; most hostile; want your meat and your possessions; guard treasure; some easily scared; a chaser that loses sight of you may give up and go home, go to where it last saw you and search there, or hunt you for a long time; always moving even unseen; most patrol round their lair, some wander; snakes ignore you unless you are on top of them | differs | always moving: yes (`$2205`). One creature is scared: snake `$3B` flees and never attacks. A chaser goes to where it last saw you and carries on, for 0 (bats) to 60 (wizard, minotaur) decisions (`$4D49`). Going home is broken: the new game zeroes the homes (`$0965`), so idle creatures head north; live, 17 of 24 were north of their start after 53 s. Seven wander at random. Nothing about meat, possessions or guarding, though the minotaur's start is a few cells from the amulet and he stayed there through the demonstration; a creature attacks only when it stands on the player's cell |
| **Thelric's warning** (inlay): "a sharpened blade may not be best!" | traced | the maces are "GOOD FOR CRUSHING BONES" and were meant to add 8 against skeletons and hellhounds, but that test can never pass (`$2B63`) |
| **Title screen** (screen): the logo over a cave picture, the story on a scroller | live | a multicolour bitmap in the RAM under the KERNAL (`$E000`), rebuilt exactly from memory; the story from `$8009` (`reference/title.png`) |
| **Music by Rob Hubbard**, three tunes (HVSC: "Main Theme", "Game Over (You're dead)", "Game beaten"); the main theme is an arrangement of Synergy's "Shibolet" (HVSC, Wikipedia) | live | tune 0 on the title and in play (`$03D1`), tune 1 at the death live, tune 2 at the win (`$0861`); driver `$C000` |
| **No sound effects, only music** (Addict) | differs | with the music off (M), footsteps sound: every third step of the player sets `$03CF` (`$0D51`-`$0D5D`), and creatures' steps set it too (`$2242`-`$2254`); the play interrupt's band 1 then plays a noise burst on voice 1 (`$2782`). Live: ten bursts in 2.5 s of walking, none standing still. With the music on, band 1 plays the music instead and the steps are silent |
| **Credits** (inlay): programmed by Richard Darling, graphics by James Wilson, music by Rob Hubbard | confirmed | the title scroller ends with "PROGRAMMED BY RICHARD DARLING, ART BY JAMES WILSON, MUSIC BY ROB HUBBARD." (`$831D`) |

## Beyond the documentation

Found in the code, not in the manual.

- **M switches the music off and on** in the menu (live): `$0C94` toggles
  `$03D1`; with it clear the play interrupt stops calling `$1949` and the
  voices fall silent; a second M starts them again. The scroller mentions
  it; the inlay does not.
- **RESTORE restarts the game** (live): `CBM80` at `$8004` makes the
  KERNAL's NMI handler jump through `$8002` to `$0818`, the restart. A reset
  goes the same way through `$8000` (live), but leaves the 6510's data
  direction register at 0, so BASIC stays switched in over the game's
  tables at `$A000`: the title's colours come out scrambled and the view
  window stays empty (`reference/reset-title.png`, `reference/reset-play.png`).
- **A demonstration recorder** (live, up to the replay): CTRL+R on the title
  starts a game whose input is written over the demonstration, F ends it,
  and by the code the next demonstration replays it.
- **WALK is never offered** (traced): the verb and its handler are there,
  but the menu builder never adds it.
- **A timed action cannot be cut short** (live): every verb costs a fixed
  number of world passes, INVENTORY 12, CAST 20; the fire test after them
  never sees fire, because nothing polls the controls during them.
- **Carried, not worn** (traced): armour, helmet and the two active rings
  count whenever they are in a hand; shields never count.
- **Spells never miss by chance** (live): see Magic Missile.
- **The cursed sapphire's warning is never shown** (traced): EXAMINE text
  3, like text 5 ("IT HAS A SHARP EDGE AND A LONG BLADE"), belongs to no
  object.
- **Overlapping tables** (traced): the two vampires share a noun and a
  picture but not a defence: the second's is read from the player's
  to-hit, 25, where the first has 60.

## Open questions

- Is the loading picture the tape's own loading screen, or the crackers'?
