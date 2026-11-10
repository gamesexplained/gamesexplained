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
- An audit of the four spell parts (spells, effects, effects-2,
  camp-spells) in particular: their own sample (seed 20261108) found 8 of
  60 wrong, over the mark, all in a detail and all corrected with the
  three that shared their belief.
- The corrections after both samples were made in `symbols.json` by hand
  (parts combat, camp, dungeon, spells, camp-spells, effects, combat-set,
  resident and gen), not in the disassembler projects in `work/`: a
  fresh export from those would undo them.
- The labels `has_item_type` (resident `$4027`) and `race_items` (gen
  `$13DD`) name items, where the list they read is effect kinds: rename
  them, with every part that uses them.

## Discoveries still to try live

Each is traced in the code; what a player sees is not settled yet.

- POOL (post-com `$1AB7`) adds a carry from a coin kind that reaches
  65,535 to the next kind.
- SHARE (post-com `$21CD`) loses the coin it has just taken when nobody
  has room for it.
- 16 of the 29 maps have walls on one side only, which the step check
  (dungeon `$10EC`) lets the party through from the other side. Find one
  in a place a party can reach and walk it.

## The Bestiary

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

## Spell findings to try live

- Raise a level-1 fighter that a wight has drained (magic-user level
  255, DEAD) at a temple, and see what it can cast and how it fights.
- PRAYER in a real fight: the party's rolls one worse, the monsters' one
  better (effects `kind_prayer`, `$A9B9`).
- A SILVER MIRROR readied against the vampire (effects-2
  `vampire_wards`, `$AABC`): it should be attacked as usual.
- The mummy's fear on a dwarf, which should get no save (effects-2
  `$A75E`), and mummy rot over ten days of rest, which should heal a
  hit point (camp-spells `$AD97`).
- A POTION OF GIANT STRENGTH drunk in combat by a character of strength
  18/50, which should change nothing (spells `set_strength`, `$A95E`).

## Item findings to try live

- Ready the trolls' RING OF PROTECTION +2 from the hedge maze and watch
  the armour class stay as it was (resident `armour_bonus`, `$37E3`).
- Pick up the 26 HUGE TAPESTRIES in Kovel Mansion and look at the
  character's weight (resident `add_item_weight`, `$4093`).
- Ready the FINE COMPOSITE LONG BOW with quarrels, then with arrows, in a
  fight (combat `can_strike`, `$1648`).
- Cast one RESTORATION from the graveyard's CLERICAL SCROLL OF
  RESTORATION in camp, and look for the scroll (camp `$1ED9`).
- Ready one of the bailey's LONG SWORD +3 on a character who is not
  lawful evil (effects `$AE94`).

## Rules findings to try live

- Train a 1st level fighter who has 100,000 experience and look at what
  is left (gen `cap_experience`, `$23D4`).
- Train a halfling fighter of strength 17 to 5th level and try 6th, then
  try again under ENLARGE or STRENGTH, which raise the strength the limit
  reads (gen `race_level_limit`, `$24A0`; camp-spells `enlarge_camp`).
- Train with 1,234 gold and count the platinum (gen `pay_training`).
- Cast HASTE in camp twice on one member and read the age.
- Watch a party of a thief and a fighter fail the move silently part of a
  PARTY SURPRISE (dungeon `$1D43`).

## Combat findings to try live

- Raise a dead party member with ANIMATE DEAD and watch the zombie run
  at its first turn (spells `$AB76`).
- Hire the training hall's WARRIOR and watch him run once his hit points
  are at or below 46 % (combat `hurt_check`, `$211C`).
- Break a side of kobolds slower than the party and see SURRENDERS, then
  the experience it gives (combat `$210E`, post-com `$0990`).
- Turn skeletons with a 6th level cleric and read IS CURSED (combat
  `$24E2`).
- Be surprised with a character of dexterity 18 and see it act in the
  surprise round (combat `surprise_round`, `$15D9`).

## Script findings to watch live

The Maps, Solution and Discoveries tabs read these from the area
scripts (`facts.md`, Mechanics); none has been played through in the
emulator.

- The council's special meeting never offered after Yarash dies first
  (ECL1A `$AF2B`, ECL08 `$AE97`).
- Restal's reseal paying 200 platinum again on a second visit (ECL02
  `$AE5B`).
- The murdered fortune teller at her table on the next visit, and the
  slums' patrols back (ECL14 `$A63A`, `$9B32`).
- The crypt's vampire with 15 hit points and no wolves after a sanctify
  (ECL0A `$B12C`).
- The runes as the game draws them, against the Discoveries widget.
- The shortest way: a party that walks from New Phlan to the audience
  hall with no commission done.

## Open questions

- The third page of a map file holds a byte for each square, which the
  3D view reads (view `$C3D2`); what the values mean is not worked out.
