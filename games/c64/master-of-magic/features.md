# Master of Magic — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- The tape inlay's instructions, as typed into the crack's own document
  reader ("These docs adapted from the tape cover by HOK of REMEMBER in
  1997"), read from the contributor's image on 2026-09-24. The nearest
  thing to the manual this run has; quoted below as **inlay**.
- The game's own screens: the title scroller, the controls screen, the
  menus and messages, seen in the emulator on 2026-09-24 (**screen**).
- The High Voltage SID Collection's STIL entry for
  `/MUSICIANS/H/Hubbard_Rob/Master_of_Magic.sid`, read 2026-09-24
  (**HVSC**).

## Features

| Feature | Status | Where |
|---|---|---|
| **Goal** (inlay, screen): find the lost Amulet of Immortality and put it on the pedestal by the pool you arrived through; Thelric's parting message says so at the start of every game | open | the parting message is live (`reference/play-first-menu.png`); the win test is not found yet |
| **Controls** (inlay, screen): joystick in port 2, or keys H up, B down, Commodore key left, SHIFT right, SPACE fire | confirmed | `$0CC6` reads `$DC00` (port 2) into `$0387`/`$0388`/`$0389`, then SHIFT and Commodore from `$028D` and H and B from `$C5`; port 2 movement live |
| **Demonstration mode** (inlay): runs on its own after the title scroller; fire or SPACE leaves it | live | `reference/demo-orc-attack.png`; SPACE left it |
| **Controls screen** (screen): shown after the demonstration; "FIRE TO START OR B FOR INSTRUCTIONS" | live | `reference/controls-screen.png`; fire started the game; B held for 0.3 s showed nothing, open |
| **Menu across the middle** (inlay, screen): options chosen with the stick and fire; the cursor starts on RUN; some options open submenus and return to the main menu | live | RUN INVENTORY EXAMINE CAST at the start |
| **More options appear as the game goes on** (inlay) | open | |
| **RUN** (inlay): move about; fire or SPACE returns to the menu | live (moving) | the view scrolls as you move; fire back to the menu not yet seen |
| **Doors** (inlay): open one by standing directly in front of it; many monsters open and close doors too | open | |
| **Picking up** (inlay): stand on top of an object | open | |
| **INVENTORY** (inlay, screen): what is in each hand and what you are wearing ("a backpack") | live | "YOU ARE CARRYING -NOTHING- IN YOUR RIGHT HAND, -NOTHING- IN YOUR LEFT HAND, AND YOU ARE WEARING NOTHING BUT YOUR CLOTHES." (`reference/play-inventory.png`) |
| **EXAMINE** (screen): a submenu of what is near | live (empty) | "-NOTHING-" at the start (`reference/play-examine-nothing.png`) |
| **You attack with the weapon in your right hand** (inlay) | open | |
| **CAST**, four spells (inlay, screen): MAGIC MISSILE, FIREBALL, MAGICAL SHIELD, ENERGY DRAIN | live (menu) | the submenu lists all four and -NOTHING- (`reference/play-cast-menu.png`) |
| **Magic Missile** (inlay): a fiery arrow at any live target in sight; heavy damage, high chance of missing | open | |
| **Fireball** (inlay): a 15-foot radius round you, burns everyone else in it | open | |
| **Energy Drain** (inlay): at any creature in sight, an instant loss of some body strength | open | the demonstration casts it ("CAST ENERGY DRAIN AT") |
| **Magical Shield** (inlay): protects your skin until uncast, and drains mind power all the while | open | |
| **Spells cost mind power** (inlay) | open | |
| **Potions to drink and rings to wear**, effects to be found out (inlay) | open | |
| **Mind and body strength shown at the top** (inlay, screen) | live | the M and B bars (`reference/play-first-menu.png`) |
| **Body strength**: every creature has one; a hit reduces it by an amount set by the weapon and the attacker's strength (inlay) | open | the trainer's body option patches `SBC $038A` at `$24D0` out of the update of `$4EC5` (orientation.md) |
| **Hit or miss**: partly luck, and affected by the defender's protection, the attacker's skill and magic (inlay) | open | |
| **A dead monster's possessions can be picked up and used** (inlay) | open | |
| **Game clock** (inlay, screen): top right; stops while you choose from the menu | live | 00:00:00 in the first menu, running during RUN |
| **The view window** (inlay): shows exactly what is in your line of sight | live | corridors appear as they come into view (`reference/play-corridor.png`) |
| **The picture strip** (inlay): pictures of every creature and object near you | live | the orc in the demonstration |
| **The message window** (inlay): says what is happening; "some of the messages might be misleading" | live (messages) | attack messages in the demonstration; misleading messages open |
| **Monster habits** (inlay): of varying intelligence; most hostile; want your meat and your possessions; guard treasure; some easily scared; a chaser that loses sight of you may give up and go home, go to where it last saw you and search there, or hunt you for a long time; always moving even unseen; most patrol round their lair, some wander the caves and corridors | open | |
| **Thelric's warning** (inlay): "a sharpened blade may not be best!" | open | |
| **Title screen** (screen): the logo over a cave picture, the story on a scroller | live | `reference/title.png` |
| **Music by Rob Hubbard** (inlay; HVSC: three tunes, "Main Theme", "Game Over (You're dead)", "Game beaten") | live (title tune) | the SID plays on the title; the other two open |
| **Credits** (inlay): programmed by Richard Darling, graphics by James Wilson, music by Rob Hubbard | open | the game's own text not searched yet |

## Beyond the documentation

Found in the code, not in the manual.

- The M key toggles `$03D1`, which switches the play-screen interrupt's
  call to `$1949` on and off (`$0C94`), and calls `$C000` or `$C003` and
  `$C006` as it does. What it switches is not established yet; by where
  `$1949` is called from, the music.

## Open questions

- Is the loading picture the tape's own loading screen, or the crackers'?
- What B on the controls screen shows ("B FOR INSTRUCTIONS"): a 0.3 s
  press through the keyboard matrix did nothing visible.
