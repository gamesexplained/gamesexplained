# The strategic map — verified technical facts

Files M2, M1 and M3 (tape 1 side 2), `$0C00`-`$C4FF` and `$E000`-`$FFF9`,
entered at `$0C00` by the resident's script. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$0C00`.

## The war

- 26 territories (`territory_owner`, `$0DAB`: 0 the Union, 1 the
  Confederacy, `$FF` nobody) with armies (`army_side`, `$0DE0`; infantry
  `$0E2E`, cavalry `$0E14`, cannon `$0E48`), and a 27th point, the month
  band, which a person clicks to end the turn (`player_move`, `$2B26`).
- Each start year has its own owners and armies (`year_setup`, `$28D3`:
  `$28EC` 1861, `$293F` 1862, `$29C0` 1863, `$2A54` 1864).
- A turn: the side's armies that may move (all but the one under the storm
  cloud, `list_armies`, `$2E20`) each move one territory or stay. Into an
  empty territory, own or enemy, it is taken; into an enemy town, the fort
  (`take_town`, `$2C75`; `fort_attack`, `$2DBB`); onto an enemy army, the
  battle (`battle_move`, `$2DA6`); onto an own army, the two join while
  each total stays within 18 infantry, 9 cavalry and 3 cannon
  (`join_armies`, `$2CCF`).
- After the moves: surrounded enemy territories with no army and no town
  change sides (`surround`, `$32CF`); the supply train runs on a railway
  between two of the side's towns through its own territories
  (`supply`, `$35C3`), and can be intercepted in an enemy territory on its
  way (`intercept_check`, `$36D7`: the train sequence); one bag of gold for
  every five territories owned or occupied, and one more (`count_gold`,
  `$3896`); five bags buy a new army of 6 infantry, 3 cavalry and a cannon on
  the side's railway (`new_army`, `$38D5`).
- The war ends when a side has no army left (`check_win`, `$0F51`); the
  winner goes in resident `$0398` and the ending loads (`game_won`, `$0CCF`).
  The months it took are counted in resident `$0399`/`$039A` (`$0C75`).

## Chance in the strategic game

- With the arcade off, a fort or an interception is won with a random
  number from `$7F` up against a defender of level 0, from `$55` against
  level 1, from `$3F` against level 2 (`fort_attack`, `$2DBB`).
- A strategic battle is fought in rounds (`auto_battle`, `$321C`): in each,
  each of a side's three kinds of unit loses one with a random number from
  `$3F` up when the other side is level 0, from `$55` at level 1, from `$7F`
  at level 2 (`hit_chance`, `$32B0`); a side down to fewer than three units
  falls back with a random number from `$C8` up (`battle_round`, `$3251`).

## The disasters

- The Indians (`indians`, `$2678`): an army that stays two passes in
  territory 3 or 8 is attacked after ten smoke signals and loses 6 infantry,
  3 cavalry and a cannon (`army_hit`, `$349B`). The Mexican bombs an army
  that stays in territory 19 (`mexican`, `$178B`).
- The storm cloud sits on a random territory of the first 25; the army
  under it cannot move (`storm_start`, `$1547`; `list_armies`, `$2E20`).
- The European reinforcements: every fourth pass of the main loop a ship
  sails in, and territory 18 (South Virginia), when it has an army or an
  owner, gets 6 infantry, 3 cavalry and a cannon (`reinforcements`,
  `$227A`; `reinforce`, `$3413`).

## The computer

- A plan for each turn (`ai_plan`, `$3C98`): 0 with no railway; 1 when the
  enemy's train ran last time; 2 with the reinforcements on and South
  Virginia not its own; 3 when it has at least as many armies as the enemy,
  else 4. Each army scores every territory (`ai_base`, `$3CF2`; the plan's
  changes, `ai_plan_scores`, `$3D09`; armies and distance, `$3DE4`,
  `$3E33`), with noise below level 2 (`ai_noise`, `$3ECA`), and steps
  toward the best (`ai_step`, `$3F34`).
- In plan 3 each enemy army's territory scores 4, 3 or 2 times its score,
  the weaker the army the more (`ai_plan_scores`, `$3D09`, by `army_steps`,
  `$3D9B`): the computer goes for the armies it can wipe out. An army
  bigger than 18, 9 and 3 would start the count at 0, and the loop would
  leave its score as it was (257 times the score, in one byte); joining
  armies never makes one that big (`join_armies`, `$2CCF`).
