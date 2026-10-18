# Bank 3 — verified technical facts

Bank 3 paged in at `$C000`: most of the game's logic, called from the main
loop in `main`. Every address here is bank 3's; one below `$C000` is
`main`'s, and one in another bank names it. Unless marked *live*, a fact
comes from the code in `work/entry.sna` with bank 3 paged in.

## Shots

- A shot is a line with two ends, 24 bytes for each of the eight actors
  (`$C100`). Once a pass each flying shot moves on (`$C21B`): what lies in
  its path is found (`$C638`: the nearest actor along the line, then the
  area's boxes, then sixteen cells of ground) and its end put there or 128
  units ahead (`$C282`).
- The isometric projection (`$C362`): the screen across is twice (down −
  across + 512), the screen down `$607` − across − down − height.
- Fire spends two units of ammunition from one of the party (`$C75A`,
  `$C735`); an enemy's shot is a line 12 units long that drops to the
  ground once it hits (`$C58A`).
- A hit costs one of the party 12 strength, never below 1, and one left
  at 1 is killed (`$C7B6`). Types `$18` to `$27` take 4 or 2 hits
  (`$C208`); types `$10` to `$17` and `$28` on cannot be harmed. A kill adds
  0.15% to the score, and 0.25% or 0.10% more for the bigger creatures.

## Menus

- Menu 1 (`$D088`): the four portraits, quit, pause, sound effects or
  music, new game. Menu 2 (`$D0B0`): one character's portrait, quit, USE
  ITEM, four objects carried and three on the ground. Each icon has a mask
  that decides when the pointer may pick it (`$C890`).
- A portrait is lit while its character is within hailing distance, which
  is `$FB7C`: in play as an actor and in a state of 7 or less (`$C913`).
- Fire on an object's icon makes it the pointer (`$CE13`); let go in the
  bottom half of menu 2 it is dropped, in the top half taken (`$CCD0`);
  dropped on the bag's icon it goes into the bag (`$CC78`).
- New game asks yes or no first (`$CD4B`); the sound icon swaps tune 14
  and tune 4 (`$CD77`); pause waits for any input with the border magenta
  (`$CDEE`).

## The party's needs and the messages

- Each character has eight need bytes (`$D5C3`) and limits (`$D5E3`):
  Jarret's `$60`, Gloria's `$80`, Dirk's `$70`, Clive's `$A0`. Every 32
  passes energy rises while standing, twice as fast while resting, and
  falls while moving; water and food fall; patience falls while the leader
  rests (`$D603`). A need passing 32 and 16 above its limit queues a
  complaint (`$D69A`).
- Below a limit by more than 32 a character sits down to rest; no strength
  is death; no water or food costs strength; patience more than two below
  its limit and he or she leaves the party (`$D70A`, `$D795`).
- Messages are shown one at a time from the queue at `$8D26` (`$D7B9`),
  in a window at four times the speaker's number of columns across
  (`$D7EC`). A speaker who is not one of the party has each letter swapped
  for its mirror in the alphabet (`$D84C`); Dirk, when within hailing
  distance, then says it again beginning HE SAID (`$FD95`).

## Areas, records and actors

- 46 records of eight bytes are the plateau's people and creatures
  (`$EB05`), the record's number being its type; records 0 to 3 are the
  four characters. One near the view becomes an actor in one of the eight
  slots (`$DC0B`, `$DD1C`), with its graphics from its class (`$EAC8`);
  one out of the area or far from the view goes back to its record
  (`$DCB9`, `$DE58`).
- Once a pass one record not in play walks its route, a step at a time,
  from area to area (`$E187`). A route is a list of points (`$ED68`,
  `$EDB0`); a record in state 1 left behind finds its way to the route
  nearest the leader (`$E24E`).
- Ten states (`$DF46`): walk a route, follow the leader, gather round him,
  fetch an object, pull, haul up and throw the rope, keep an action, die,
  stand.
- The view running off an edge of the area loads the next area of the
  four by four plateau, carrying the actors on that side across (`$DB0B`).
- The random numbers are bank 3's own bytes, read in turn by a pointer
  that runs through `$C000`-`$FFFF` (`$E481`).

## Behaviour

- A hostility byte for each four types (`$EFED`) says who takes whom for a
  target: the party, the tribe (types 4 to 7) or the rest. The party
  takes the tribe for a target only once it has turned hostile (`$FD8F`,
  `$C804`); the leader fires where the player points him.
- An actor of a type whose byte has bit 1 raises the alarm (`$F02C`);
  actors of types 0 to `$0F` and `$18` to `$1B` then gather round the
  leader (state 2, `$F0D3`) and the party's others fire at what they see
  (`$F116`).
- Types `$18` to `$27` look round, seize a victim within 3 units and count
  down to its death (`$F14A`, `$F232`); some fly off with it and drop it
  (`$F26E`, `$F2A8`). Types `$10` to `$13` pull a victim under the ground
  (`$F1D6`, `$F2F5`); `$14` to `$17` chase, looking ahead only (`$F202`).
- Types `$28` to `$2C` walk their routes running, with a sound every
  fourth pass (`$D6BA`), and go back to a place of their own at the end
  (`$F0A3`, `$ECC9`).

## Objects

- Seventeen objects of seven bytes (`$ECD8`), each in an area, carried by a
  character, in the bag, or held by type 7; three more records in the same
  form follow (`$ED4F`). Objects lying near enough to the area's edge are
  moved into the area entered (`$F72A`).
- Using an object runs its handler (`$F866`): the tins, the bottle, the
  ham, the first aid kit and the ammunition fill the party's needs from
  their stores (`$F910`); the knife opens tins half full, the can opener
  full (`$F8AB`); the watch says the hour (`$FA73`); the rope starts the
  rescue (`$FAA1`); the dynamite is lit (`$F888`). The jewel, the compact
  and object 15 do nothing when used.
- The bottle is filled by walking into ground `$7D` beside water
  (`$F98D`, `$FA02`).
- The dynamite's fuse counts down from `$7F` (`$FBED`); at `$0F` it
  explodes, killing its carrier or every actor within 9 units of where it
  lies, but types `$10` to `$17` and `$28` on.

## Zones and the story's events

- Nine zones (`$FB1E`) run a routine while the leader stands in them
  (`$FB9B`): the tribe's welcome (area 5), two around actor `$2D` (area
  5), the capture (area 6), the altar (area 2), the dynamite's place (area
  7) and three rivers (areas 5, 6 and 10).
- The welcome (`$FCF0`): the tribe greets the party, gives a tin and asks
  for something in return; an object dropped earns 10%, and the compact
  5% more and the ham; with nothing given the tribe turns hostile.
- Actor `$2D` holds the leader (`$FE17`) until fed the ham, 10% (`$FDA5`,
  `$FE01`).
- The capture (`$FE5B`) takes the first of the other characters who is
  away from the area to the altar in area 2, with the tribe, and starts
  the ceremony's count (`$8D15` = 0). At the altar (`$FEC8`) the count
  runs; the tribe speaks at `$40`, `$80` and `$C0` and the sacrifice comes
  at `$E8` (`$FF50`); the jewel dropped there saves the captive, 10%.
  `$8D15` is also the calendar's month (main `$F465`).
- Clive falls through ground `$74` (`$E609`) and is hauled up by the rope,
  10% (`$E4C2`, `$E535`, `$E576`).
- The dynamite placed in zone 5 sends records `$2B` and `$2C` off along
  route `$17`, 10% (`$FBED`, `$FF96`).
- A river's current stops the leader walking one way across it
  (`$FCBD`).

## The end and the score

- The score is five decimal digits from `$8D04`, the percentage of the
  game done (`$E4A0`).
- Ground `$72` ends the game (`$E910`): the whole percent is raised to 60
  if it is below, and each character within hailing distance adds a
  quarter of what is left to 100. The end screen (`$E975`) gives the
  days, the percentage, and PITY ABOUT each one left behind (`$EA0B`).
