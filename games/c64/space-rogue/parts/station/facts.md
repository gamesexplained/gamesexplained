# The bases: facts

What docking loads: `SEG1` at `$A500`, `SEG1A` at `$E400`, the base's
map at `$5100`, `TALK` at `$5700` and `LAND.TIL` at `$4000`. Every
address is in this part's listing, built from `work/walk.vsf` (the
hangar at Hiathra Starbase). Every fact names the routine or table it
comes from.

## Memory

| Range | What |
|---|---|
| `$4000`-`$50FF` | `LAND.TIL`: 128 tiles, their kinds (`tile_kinds`, `$5000`) and colours (`$5080`) |
| `$5100`-`$56FF` | the base map: a 32 × 32 floor plan, 32 entries, the base's kind, a visitor's square, the entries' actions, the cargo prices and availability |
| `$5700`-`$61FF` | `TALK`: 32 conversation scripts (`talk_offsets`, `$5700`) |
| `$A500`-`$BCFF` | `SEG1`: the base's loop, people's moves, doors, actions, the status pages, the shops, locks, guards, the line of sight, the bar |
| `$E400`-`$E8FF` | `SEG1A`: the alarm, the arrival set-up, the talk interpreter, typing a line |

## Arriving

- `arrival_message` (`$A584`): base `L51` plays only the evacuation
  recording. Elsewhere a player who shot this base (`$0783` = 1) or was
  thrown out of one (`$0783` = 2) is refused docking and never enters.
- An outpost (`$5610` = `$12`) or a mining station (`$10`) lets the
  player in with no bounty or cargo check (`$A5CA`). Any other base
  asks a player with a bounty to pay it off, and sends them away if they
  refuse or cannot (`$A5EE`).
- `$A62E`: a cargo check happens one time in two, one in eight with the
  forged cargo papers (`$074E`), and empties every hold slot of kinds
  0-3, the contraband (X-rated holos, explosives, forged CRs,
  anagathics).
- `base_setup` (`$E46C`) lets rumours out by the plot flags, puts a
  random visitor on the map's visitor square, and takes off items
  already taken and people who have left.

## Walking

- `base_step` (`$A674`): each pass every entry with a motion kind moves
  (`npc_moves`, `$A808`: 1 wanderer, 2 a wanderer that keeps out of
  doorways, 3 a chaser, 4 a watcher), then the player steps; a blocked
  diagonal slides along the wall (`slide_step`, `$A701`). A drunk player
  (`$083A`) staggers one step in ten with "hic!".
- `try_step` (`$A815`): a solid entry or a tile with kind bit 7 blocks
  the way; stepping onto a door tile (kind bit 6) opens it in three
  frames with sound 13 (`open_door`, `$A87F`), stepping off closes it.
- `sight` (`$BAEE`): the room the player stands in is flood-filled from
  the player's cell (`flood_fill`, `$BB0B`) and every cell it does not
  reach is blacked out; walls seen from behind get an edge tile
  (`wall_edges`, `$BA0D`).

## Acting

- `player_act` (`$A930`): fire (or space, 0, Return) with no direction
  opens the base menu, TALK, INSPECT, STATUS and DONE (`base_menu`,
  `$AA0C`); with a direction it acts on the entry there, or across a
  counter.
- Each entry's action byte (`map_actions`, `$5618`) picks one of
  `action_routines` (`$AB2E`): 1 a notice, 2 the ship (embark), 3 the
  HIVE! cabinet, 4 an alarm plate, 5 a person, 6 a locked door or safe,
  7 an item, 8 a sign. Bit 7 set: it happens when the player acts toward
  the entry; clear, when they step on it. Bit 6: once only.
- `talk_to` (`$AB58`): the entry's type says who: `$20` the cargo
  merchant, `$21` a guard, `$22` the outfitter, `$23` the repair shop,
  `$24` the bartender, below `$20` a person's talk script.

## Talking

- `talk_script` (`$E569`): script n is at `$5740` plus the word at
  `$5700` + 2n; its texts are the 64 disk texts from `$C000` + 64n.
  Node after node, a text, an action and an answer lead to the next.
- `talk_answer` (`$E63F`): an answer is a menu, a random choice, or a
  test of a variable. A menu's last item can be OTHER..., which takes a
  typed line (`type_line`, `$E8A2`) and searches it for each keyword
  text in turn (`talk_menu`, `$E699`).
- `talk_var` (`$E801`): a variable is a class and an index: the talk's
  own four flags, the items owned (`$073D`), the 32 plot flags (`$078E`),
  the day's lists, or one of the standings, the rank and the bounty.
- `talk_ops` (`$E7B1`): set to 1, set to 0, add 1, take 1, give
  credits, take credits, raise the alarm, and set `$0835`, which kills
  the player when the talk ends if negative.
- `talk_end` (`$E7C7`): with plot flag 8 set the player is put in
  system 9, the Manchi system, at sector 0, 0.

## Shops

- `cargo_buy` (`$AE8C`): four to six of the 20 cargo kinds, each kept
  when the base's availability for its class (`$563D`) plus a random
  0-99 reaches 100; the generator restarts from the day's seed, so the
  list and prices hold all day. `cargo_price` (`$B027`): the class's
  base price (`$5638`) plus a random part up to an eighth of it, times 2
  to 5 by the kind's place in its class; spoiled cargo (kind 20) is 1
  credit. The merchant buys at the same prices.
- `outfitter` (`$B0E2`): WEAPONS, SHIELDS and ECM UNITS need the Star
  Pilot's License (`$074D`). Prices (`laser_prices`, `$B3C9`;
  `shield_prices`, `$B3D1`; `ecm_prices`, `$B3D7`): garnet 225, beryl
  550, sapphire 1400, particle beam 3650; shields I-III 375, 950, 2500,
  fore or aft; ECM 25 %, 50 %, 75 % for 500, 1500, 4500. Only upgrades
  are sold.
- `buy_special` (`$B2A4`): a cargo pod (150, up to 8 slots), an armour
  plate (325, 50 more armour up to 500), the turbo thruster (1500, once,
  doubling the thrust).
- `repair_shop` (`$B3E0`): ordnance by the pack (`$B650`-`$B662`; the
  missile bay has 20 units of room, an SM-1 or Nova taking 2 and a
  torpedo 1),
  systems by `system_repair_prices` (`$B668`), and armour at a quarter
  of the damage plus one, at most 99, with cheaper half and quarter
  repairs.
- `bartender` (`$BBE9`): GREEN HEAD, BLUB LIGHT and RIGELIAN for 1, 2
  and 3 credits; one drink in ten makes the player drunk; the dearer the
  drink, the likelier a rumour (`pick_rumour`, `$BCB8`).

## Locks, guards and the alarm

- `act_lock` (`$B736`): USE CARD opens a door with the key card
  (`$0742`) when its extra byte is 0 (`use_card`, `$B777`). PICK LOCK
  (`pick_lock`, `$B79E`): one time in three the lock opens, one in three
  the alarm goes, else it stays shut; when anyone who can walk is in
  sight, the player is always spotted.
- `safe_loot` (`$B811`): a picked safe gives 1 to 100 credits.
- `raise_alarm` (`$E400`): every guard (type `$21`) chases the player,
  or wanders at alarm 3; the siren sounds unless the alarm is 1.
- `guards_check` (`$B863`): a chaser within one square catches the
  player. Alarms 1 and 2 kill; otherwise the visit ends, the base bars
  the player for the day, and they are fined 100 credits for a safe or
  25 for a secured area (a shortfall going on the bounty), or only moved
  along at alarm 4.

## Data

- `tile_kinds` (`$5000`): bit 7 blocks, bit 6 a door, bits 4-5 a wall
  facing down or right, bit 3 hides map entries, bits 0-1 frames of
  animation; with bit 2 set a person's picture, which animates as they
  walk.
- `map_type` (`$5590`): below `$20` a person's script, `$20`-`$24` the
  merchants, guards and barman, `$80` + n item n, `$A0` a locked door,
  `$A1` a safe.
- `talk_00` (`$5740`) to `talk_31` (`$61BC`): the 32 people, from
  Duchess Avenstar to the young Imperial Guard trooper.
