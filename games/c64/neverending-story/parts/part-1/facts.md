# Part 1 — verified technical facts

The file `PART 1`, loaded over $2F00-$95FF when a new game starts: the
Great Forest, the plains, the Swamps of Sadness, Morla, Engywook and the
southern oracle. Every address here is this part's, in its
`listing.json`; routines named with an address are the engine's
(`parts/engine`). Rooms are numbered across the game, and Part 1's are
$00-$28. Unless marked *live*, a fact comes from the bytes of
`work/part1-command.vsf`, stopped at the first command prompt.

## The part's tables

- $2F00 points at the room texts' pointers ($373A), $2F02 at the
  events' ($30A4) and $2F04 at the room scripts' ($2F4B); $2F06 is the
  part's turn script. The engine reads them at $0B7F, $09F4 and $14BB
  ($0B58, $09D7, $147D).
- 41 rooms, $00-$28, whose 41 script pointers name 25 scripts; 17 rooms
  share the empty script at $2F9D.
- 28 events ($30A4), every one printed by some script.
- Pictures 1-20, $4300-$93E5, one after another (engine
  `ROOM_GRAPHIC_TABLE`). Picture 0, the open book shared by every room
  without a picture of its own, is the engine's.
- $42E2-$42FF and $93E6-$95FF are filler that no pointer reaches.

## The turn script ($2F06)

- On the first turn it sets flag 2, brings Gmork into play in no room
  ($FB; he starts gone, $FD) and sets counter 3 to 30.
- Gmork's chase: while Gmork is in play, each turn a test that passes
  on 102 of the frame's 312 raster lines (operand 50; the game's `facts.md`,
  "Mechanics", Chance) takes one from counter 3, and each direction command adds one to it,
  even one the map refuses (the engine's direction actions, $2A13 and
  $2A26 among them, run MOVE and then the increment), except SOUTH, whose
  action ($2A51) has none; so he closes in only on turns without a
  direction command and on steps south; at 10 Gmork "is gaining on you" (event 3), at
  1 "almost on top of you" (event 4), at 0 he catches Atreyu (event 5)
  and the game restarts. Picture 10 goes with each.
- The burning branch counts down counter 4 each turn and burns away at
  0 (event 22).

## Room scripts

- Rooms $01-$03: the opening scene. Rockbiter, then Teenyweeny, then
  Nighthob pass by on their way to the Ivory Tower; at room $03 they go
  into the tower and "Something shiny falls to the floor !" (event 6):
  Auryn is placed in room $03 ($2FB6).
- The Swamps of Sadness: each turn in rooms $0D-$14 and $16 takes one
  from Atreyu's strength (event 9); Morla's room, $15, does not. In rooms $0E and $0F Artax, if riding
  with Atreyu (flag 0), sinks (event 7, picture 8) and is gone.
- Quicksand, room $0D: counter 2 counts the turns there and the third
  is fatal (event 12); room $12 sets it back to 0.
- Morla, room $15: Atreyu is thrown off into room $16 on 182 of the 312
  lines (operand 125), otherwise into room $14 (event 8).
- Engywook, rooms $24 and $25: each room's script moves him to it, so
  he is wherever Atreyu is of the two. In room $25 he takes
  the crystal out of play and explains the oracle (event 14), refuses
  the crystal still in its box (event 16), and grabs back his telescope
  if Atreyu carries it, at a cost of one strength (event 18).
- The sphinxes, room $27 ($3082): each turn prints "I hope you know
  what you're doing!" (event 17), clears flag 5 and, on 52 of the 312
  lines (operand 25), sets it: "The sphinxes' eyes blink!" (event 26).
- The great mirror, room $28 ($3090): if Falkor is not with Atreyu
  (flag 1 clear), puts Falkor in the room and tries to take him, which
  fails with "You can't do that." because no noun resolves to Falkor
  (`RESOLVE_NOUN`, $15E3); then prints the oracle's message (event 25) with
  picture 17, and ends the part with action $1F (engine
  `ACTION_NEXT_PART`).

## Passing the sphinxes

The engine's action for SOUTH (engine $2A51) decides it. In room $27:
with flag 5 clear, a test that passes on 257 of
the 312 lines (operand 200) kills Atreyu (event 19). If he
survives that, or flag 5 is set, Auryn carried takes him south ("You
just made it !", event 20, picture 12); without Auryn he dies. So with
Auryn, going south when the eyes have just blinked always passes, and
going at any other time passes only on the 55 lines whose low byte
is 201-255, about one try in six.

## Route

*Live*, from the first prompt: NE, E, GET AURYN, SW, GET STONE, S, GET
HORN, W, N, GET BRANCH, S, E, N, NE, W, SW, LIGHT BRANCH, NE, E, E, E,
E, E, E, LIGHT BUSHES, D, HIT BOX, GET CRYSTAL, U, W, W, W, W, W, SW, S,
W, SE, BLOW HORN, GET FALKOR, FLY SOUTH, E, S, E, DROP CRYSTAL, S, S;
then WAIT until the eyes blink and S. Part 2 loads from room $28.
