# The battle's files — verified technical facts

The files COM.PREP loads for a battle, which stay in memory while COMBAT
runs: GDRIVE00 (the battlefield's driver, `$C000`), SQRPACI01 (its figure
tables, `$0400`), SECSET64 (`$6500`), the battle script ECL64 (`$9900`),
SPELLE65 (`$A700`) and SPELLN00 (`$AF00`). Every address here is the
combat-set part's. Unless marked *live*, a fact comes from the code in
`entry.vsf`, the stop at the linker's call into COMBAT. Live tests are
listed in the game's own `facts.md`.

## The battlefield

- `draw_squares` (`$C069`) draws the map as tiles of 3 by 3 characters,
  a combatant's pose on a square someone stands on.
- `sight` (`$C696`) decides whether one square can see another: a line
  traced between them, each figure on it blocking by its height and
  opacity (`figure_height`, `$0400`; `figure_opacity`, `$0500`).
- `arc_masks` (`$C969`) rules out lines by direction for spells cast in
  an arc.

## Missiles

- `fly_missile` (`$657B`) flies sprite 6 from the shooter to the target a
  leg at a time, the view following; its picture comes from the item
  type and the direction (`missile_picture`, `$6500`).
- `range_penalty` (`$695D`) gives -2 for a missile beyond (range - 1) / 3
  squares and -5 beyond twice that, and `attack_routine` (combat `$119E`)
  adds it to the armour figure the attack must reach, which makes a long
  shot easier to land. A player's AIM sets the range (`$0364`)
  to 128 to list its targets (combat `aim`, `$0F36`); whether anything
  sets it back to the weapon's range before the shot was not checked, and
  if nothing does, the party's penalty starts only at 42 squares.

## The computer's turn

- `ai_turn` (`$6774`) plays a monster, an NPC or a QUICK member; a key
  or the joystick takes the party back from QUICK first.
- `ai_target` (`$670A`) finds a target within its range; seeing none, it
  searches again with the sight allowance at its most.

## Backstabs

- `can_backstab` (`$06A8`): a thief level, a multiplier of 2 at levels 1
  to 4 and 3 at 5 to 8, and no armour but leather (item type 50).
- `backstab_check` (`$0680`) gives the multiplier only from behind: the
  attack must come from opposite the direction the target was first
  attacked from this turn.

## Spells

- `cast_spell` (`$9916`) casts with the caster's level; a spell's nine
  bytes are its record (`load_spell_record`), and its routine comes from
  a spell file loaded into slot 7 (`load_spell_file`, `$9B2A`).
- `save_roll` (`$9974`): the target's saving throw of the spell's kind on
  a d20, a 20 always saving. `spell_damage` (`$9A5F`) halves the damage on
  a save, or takes it all for some spells; `spell_effect` (`$99D1`) puts
  a timed effect on the target when the save failed.
