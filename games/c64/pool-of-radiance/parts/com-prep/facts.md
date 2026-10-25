# Setting up a battle — verified technical facts

COM.PREP, module 4: it builds the battlefield, places both sides and
hands over to COMBAT. Every address here is the com-prep part's. Unless
marked *live*, a fact comes from the code in `entry.vsf`, the stop at the
linker's call into this module. Live tests are listed in the game's own
`facts.md`.

- `comprep_main` (`$0803`) loads the combat graphics, reads the walls
  round the party while the area's map is still in memory, then loads
  GDRIVE00, SQRPACI01, the secret set, the battle script ECL64 and the
  spell files over them, and makes COMBAT the next module.
- **In a town or dungeon** the battlefield is the 25 squares round the
  party, each a block of the combat map. For each side of each square
  `read_walls_around` (`$0ADB`) notes 0 for none, 1 for a door that
  opens on both sides, 2 for any other wall, a locked door among them.
  `draw_walls` (`$0BE2`) draws them on, a door as the wall's two ends only
  (`type1_tiles`, `$0CF7`), anything else as a whole wall (`type2_tiles`,
  `$0D1F`).
- **Outdoors** the battlefield is scattered at random (`random_terrain`,
  `$169C`): 133 tries at a random square, and on an empty one a draw below
  50 of 256 puts a two-square piece, anything else one of 17 single tiles.
- `start_squares_outdoors` (`$1589`) faces the party a random way
  (`$49C2`) and takes both sides' start squares by it. Three facings in
  four write the monsters' squares to the wrong place (`$15C2`), and all
  the monsters then start in the same corner block.
- `find_start_squares` (`$0DDF`) starts the party on its own square, then
  the squares to its left, right and behind; the monsters on theirs.
- `place_party` (`$0E78`) and `place_monsters` (`$0F54`) put each
  combatant in the first free place (`try_place`, `$0EB2`; `fit_combatant`,
  `$0FBD`, which needs every square a big monster covers). A combatant that
  finds no room, and every later one of its side, is out of the battle
  before it starts (`no_room`, `$0F0B`).
- `ready_combatants` (`$15ED`) counts each combatant's memorised spells by
  level, works out its combat figures with its dexterity's to-hit bonus
  for missile weapons (`dex_hit_bonus`, `$1682`), and clears COMBAT's
  tables.
- `assign_icon_codes` (`$0942`) gives every slot's two poses, and their
  mirror images, their own character codes in the battle's character set.
- Sprite 7 is the combat cursor, a hollow box 24 pixels wide and 12 high
  doubled in height (`set_sprites`, `$147D`).
