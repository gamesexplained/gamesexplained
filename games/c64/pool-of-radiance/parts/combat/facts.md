# Combat — verified technical facts

COMBAT, module 2: the rounds, the menus and the attacks. It works with
the battle's files in the combat-set part, which it calls by address.
Every address here is the combat part's. Unless marked *live*, a fact
comes from the code in `entry.vsf`, the stop at the linker's call into
this module. Live tests are listed in the game's own `facts.md`.

## Rounds and turns

- `battle_round` (`$0852`) counts each side's able combatants, then
  gives every able one its attacks for the round: half its attacks in two
  rounds (`attacks_per_2`, `$1324`), an odd count rounded up and down in
  turn, and an initiative.
- `pick_next` (`$08BE`) gives the next turn to the highest initiative,
  a tie going to a fresh random draw.
- `surprise_round` (`$15D9`): in the first round only, the surprised side
  loses 6 from each combatant's initiative.
- `end_of_round` (`$0C20`) ages the timed effects, raises every dying
  combatant's count (dead at 10), and ends the battle when no party member
  is able, or when no monster is and the player answers NO to CONTINUE
  BATTLE.
- The combat menu is MOVE VIEW AIM USE CAST TURN QUICK DONE
  (`combat_menu`, `$09CF`). On a player's turn Q puts the whole party on
  QUICK, the space bar takes it back, and M switches the computer's
  spellcasting for QUICK members (`player_turn`, `$0A31`).

## Attacks

- `hit_roll` (`$1272`): a d20, a 1 always missing and a 20 always
  hitting; otherwise it hits when the roll plus the to-hit figure (60 less
  THAC0) and the side's bonus reaches 60 less the target's armour class.
- `target_ac` (`$12B1`) takes the target's rear armour class for a
  backstab, for a swing at one moving away, and once the target has been
  attacked twice since its turn from directions at least five apart, by
  an attack from where it does not face.
- A combatant that cannot act is hit at once and left dying with its
  count at 5 (`attack_routine`, `$119E`).
- `roll_damage` (`$0CAD`) rolls the routine's dice; the backstab
  multiplier applies only to a bonus of 0 or more.
- `apply_damage` (`$0CFE`): exactly 0 hit points left is unconscious,
  below 0 dying with the points below 0 as its count, and 10 or more below
  is dead.
- `free_swings` (`$1491`): every enemy within 2 squares that a combatant
  moves away from swings at it once from behind.
- `sweep_check` (`$1550`): a fighter facing enemies under one hit die
  attacks each of them in turn, up to its number of sweeps.

## Leaving the fight

- `flee` (`$16FA`): with no enemy that can see it, a combatant gets away;
  otherwise it must be faster than the fastest enemy, and a tie is a coin
  toss.
- `morale` (`$20C1`): a monster or NPC hurt enough (`hurt_check`,
  `$211C`) flees, an NPC at once, a monster only when its side's losses
  pass the monsters' morale; a monster slower than the party's fastest
  surrenders instead if its intelligence is 5 or more.

## Turning undead

- `turn_undead` (`$24AA`): one d20 for the whole turning, then up to a
  d12 of undead, nearest first, until one is not beaten (`turn_roll`,
  `$252B`, with COMBAT3's tables in the tables part). A destroyed undead
  shows message `$12` of SPELLN00, which reads IS CURSED.

## Other commands

- AIM (`aim`, `$0F36`) lists the targets in sight; NEXT and PREV step
  through them, MANUAL moves a free cursor (`manual_aim`, `$1D51`), TARGET
  attacks.
- DONE (`done_menu`, `$13EE`): GUARD DELAY QUIT BANDAGE SPEED EXIT.
  BANDAGE binds every dying party member, who becomes unconscious
  (`find_dying`, `$214A`).
- QUICK (`quick`, `$1437`) hands the combatant to the computer, which
  casts spells for it only with MAGIC on (`ai_cast`, `$230F`).
