# Pool of Radiance — TODO

## For Gold

- A human's pass over every section of the pages (`copy` is `agent-draft`).

## For Platinum

- A Play tab: the whole game ported to JavaScript and held to the
  game's code in lockstep (`kit/skills/core/70-minisite/play.md`).

## The listing

- An audit of every comment, then a second sample with a new seed. The
  first sample (seed 20261025) found 3 of 80 wrong, over the mark, all
  in a detail and all corrected with the 15 comments that shared their
  belief; at that rate a few hundred of the 4,157 comments are still
  wrong somewhere (`facts.md`, "The listing's error rate").

## Discoveries still to try live

Each is traced in the code; what a player sees is not settled yet.

- The long-shot penalty (combat-set `range_penalty`, `$695D`) is added
  to the target's armour figure, which makes a long shot easier to hit.
  `missile_leg` (`$6652`) sets the range it reads, `$0364`, to 128
  before the flight is drawn: find whether any shot reaches the penalty.
- The monsters' start squares (com-prep `$15C2`) are stored by X, so for
  three of the four facings they keep square 0. Watch where monsters
  start in a fight begun facing north.
- POOL (post-com `$1AB7`) adds a carry from a coin kind that reaches
  65,535 to the next kind.
- SHARE (post-com `$21CD`) loses the coin it has just taken when nobody
  has room for it.
- The camp's spell list heads level 4 "7TH LEVEL" (camp `$2AC1`).
- 16 of the 29 maps have walls on one side only, which the step check
  (dungeon `$10EC`) lets the party through from the other side. Find one
  in a place a party can reach and walk it.

## The Bestiary

- A monster record's ten kind bytes (`$6BAD`-`$6BB6`, the list
  `has_item_type` reads and the spell files add to) are not decoded, so
  the Bestiary names none of a monster's special abilities. Find what
  each kind number means in the spell files (`combat-set`) and show it.
- Portraits: the NPCs that join the party (SWORDSMAN, HERO, CURATE and
  others) name a head and a body (`$6BFE`, `$6BFF`) drawn from the HEAD
  and BODY files by ANIMATE00's portrait entry (`$8409`); the Bestiary
  draws none of them.
- The 3D-view sprites are placed by the page's port of
  `draw_monster_sprites` (`$28FA`); `test_bestiary.js` holds the battle
  numbers and the close-ups to the game, not the sprites' places.
- A close-up or sprite set goes with a monster only when a script that
  loads it shows one with a number of its own; leaders (KOBOLD LEADER,
  ORC LEADER and the like) are met in front of their band's picture and
  get none. Watch an encounter with a leader to confirm.
- One HILL GIANT file (side 5) has dexterity 0 and a readied BOULDER:
  com-prep gives it THAC0 18 against its record's 12, the dexterity
  penalty applying once a weapon is readied. The side-2 file, with its
  boulders not readied, keeps 12 but moves 3. Fight both live.
- OGRE LEADER (side 1, MON09) has THAC0 3 in its record, far better
  than an ogre's 15, and no script the generator follows loads it:
  find whether anything does.

## Open questions

- The third page of a map file holds a byte for each square, which the
  3D view reads (view `$C3D2`); what the values mean is not worked out.
