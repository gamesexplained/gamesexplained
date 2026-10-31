# The battle — verified technical facts

File BS (tape 2 side 1), `$3000`-`$CFFE`, entered at `$8000` from the
map's `$0CAB`. Every address here is this part's; the resident's are named
as such. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$8000`.

## The field

- `field_unpack` (`$90A5`) picks one of three fields with a random number:
  below `$55` the canyon with a wooden bridge (1), below `$AA` the river with
  a stone bridge (2), otherwise the open field (0): 85, 85 and 86 chances
  in 256. Each is packed (`unpack`, `$8E1E`: a control byte's eight flags,
  1 a literal byte, 0 a count of repeats of the last literal) and unpacks to
  the bitmap at `$4000` and the screen at `$6000`; the open field has no
  colour stream and gets colour RAM all green.
- `field_scenery` (`$913F`) puts up to eight pictures at the field's edges
  on the open field and the river: each place with a random number below
  `$7F` gets the house (picture 0) or one of two trees (3, 4) or nothing. The
  canyon gets none, though its two brown trees (pictures 1, 2) are in the
  file.
- The hazards (`hazards`, `$A113`): on the canyon and the river, any of the
  20 objects whose top's cell row has a hazard column within four columns
  of it falls in (`$8752` the river's columns by row, `$876C` the canyon's;
  `$FF` where the bridge is). Three cannonballs on a bridge row between
  columns 16 and 22 break the bridge (`ball_crater`, `$A6A5`; `bridge_break`,
  `$A794`), and its rows become hazard too.

## The units

- 40 object slots, 20 used: 0-5 the Union's soldiers, 6-11 the
  Confederacy's, 12-14 and 15-17 the riders, 18 and 19 the cannons
  (`obj_picture`, `$8333`; x `$835B` in pixel pairs, y `$8383`).
- A side brings on up to six soldiers, three riders and its first cannon at
  the start (`$8000`), each unit in a lane picked at random (`pick_lane`,
  `$9400`), from out of sight past its own edge, and new ones when a unit is
  gone while the side has more (`bring_reserves`, `$A7F6`): the battle goes
  on in waves until the counts in resident `$038A`-`$038F` run out.
- Objects are drawn into the bitmap, not as sprites: a mask of the picture
  (`build_mask`, `$9341`) shifted to the pixel pair, the background under it
  kept in a store under the I/O chip (`save_under`, `$9247`, `$D000` + 84 ×
  slot) and put back before the next draw (`restore_under`, `$92BF`). Every
  figure is black, the background colour. While a slot is redrawn, hardware
  sprite 0 shows its picture in black over it (`cover_sprite`, `$A317`).
- The shots (eight: three bullets a side, a ball a side) are sprites through
  a 32-slot multiplexer (`battle_irq`, `$89D5`; `bmux_first`, `$8A2B`;
  `bmux_next`, `$8A9A`).

## Infantry

- Formation 0 is three rows of two, formation 1 two rows of three
  (`infantry_reform`, `$9F69`, six steps by the offsets at `$86BC`-`$86E0`).
  A person's line takes formation 1 before it marches away from the enemy
  and formation 0 before it fires (`battle_orders`, `$9805`).
- Firing (`infantry_fire`, `$A384`): of each pair of soldiers the first
  standing one fires a bullet, so a full line fires three; a bullet flies 3
  pixel pairs a frame for 15 frames (`bullet_start`, `$A3CB`) and hits an
  enemy object within 8 pixel pairs across and 4 lines up or down
  (`bullet_hits`, `$A18F`).

## Cavalry

- Fire charges (`cavalry_charge`, `$A43E`); a rider charging hits enemy
  objects within 4 pixel pairs and 4 lines (`charge_hits`, `$A655`). A
  charge that rides off the far edge comes back in from its own side
  (`cavalry_left_edge`, `$A462`; `cavalry_right_edge`, `$A495`).
- Pulling back turns the riders from line (one above another, 16 lines
  apart) into file (in a row, 8 pixel pairs apart) over eight steps
  (`cavalry_turn`, `$A0AA`); in file, or alone, the horses rear instead.
  Falling back, the riders are drawn with the other side's pictures, which
  face the other way (`cavalry_pictures`, `$95A0`).
- A rider shot falls and his horse runs on toward the enemy's edge; it is
  counted lost when it leaves the field (`horse_gone`, `$A4CC`) or falls
  into the canyon or the river.

## Cannon

- Up and down only (`cannon_orders`, `$9978`). Holding fire raises the range
  ($8260) by one every four frames up to 31, on a gauge drawn over the top
  row (`gauge_draw`, `$8EFE`); the ball flies (range + 2) × 2 frames, 2
  pixel pairs a frame (`cannon_fire`, `$A567`), and where it lands it fells
  every standing object within 9 pixel pairs and 8 lines, of either side
  (`balls_land`, `$A5D3`). Nine shots, then the cannon leaves the field and
  the next comes on.

## The computer

- Its chance to act by its level (`level_chance`, `$9D14`, resident
  `$0380`): level 0 goes on with 12 in 256, level 1 with 25 in 256, level 2
  always.
- Infantry: stands while its bullets fly, marches level with the nearest
  enemy across and fires within 30 pixel pairs (`computer_infantry`,
  `$9A78`). Cavalry: on a bridged field it forms file, rides to the
  bridge's height ($879A) and charges across, then forms line, finds the
  nearest enemy's height and charges (`computer_cavalry`, `$9B40`). Cannon:
  moves level with the nearest enemy and, with a random number below `$14`,
  fires at the distance across (`computer_cannon`, `$9C72`).
- It falls back with about one chance in 500 a pass when it is down to
  three soldiers and riders or fewer and the enemy has at least as many
  (`computer_fallback`, `$9A34`).

## The end

- A side is out when it has no infantry or cavalry and no cannon to fight
  (`wiped_out`, `$A8B5`), or when it fell back and its units have left
  (`fallback_done`, `$A891`, which also loses its cannons); about four
  seconds later the battle returns to the map (`battle_end`, `$A869`).

## Corner cases

- `unit_skip` (`$9748`) reads the cannon reserve as `$8610` for both sides,
  the Union's: the Confederacy's choice stays on a cannon it no longer has
  while the Union has one in reserve; its orders then do nothing.
- On the canyon field the hazard table's rows 20 to 24 hold `$FF`, as the
  bridge rows do: nothing falls into the canyon that low, and a ball landing
  there between columns 16 and 22 counts as a hit on the bridge
  (`ball_crater`, `$A6D0`).
- `devlink_check` (`$8110`) and `devlink` (`$CE00`), a monitor that talks
  over the user port, are in the file and nothing calls them.
