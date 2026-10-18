# Part 2 — verified technical facts

The file `PART 2`, loaded over $2F00-$95FF when Part 1 ends: the ruins
of Spook City, its well, dungeon and torture chamber, and the hill where
Falkor and Auryn wait. Every address here is this part's, in its
`listing.json`; routines named with an address are the engine's
(`parts/engine`). Part 2's rooms are $29-$4C and the engine puts Atreyu
in room $34 when the part loads ($0427). Unless marked *live*, a fact
comes from the bytes of `work/part2-command.vsf`, stopped at the part's
first command prompt.

## The part's tables

- $2F00 points at the room texts' pointers ($3482), $2F02 at the
  events' ($3016) and $2F04 at the room scripts' ($2F38); $2F06 is the
  part's turn script.
- 36 rooms, $29-$4C, whose pointers name 18 scripts; 19 rooms share the
  empty script at $2F80.
- 20 events ($3016).
- Pictures 21-36, $4300-$7A8B (engine `ROOM_GRAPHIC_TABLE`).
- $40AA-$42E1 and $7A8C-$95FF hold, byte for byte, what Part 1 holds at
  the same addresses: the end of Part 1's room texts, and the last 240
  of the 900 bytes of Part 1's picture 15 with pictures 16-20 and the
  filler after them. Nothing in Part 2 reads either: the engine's records
  for pictures 15-20 and Part 3's 51-56 reach into the second, but no
  Part 2 room or script shows those pictures.

## The turn script ($2F06)

- On the first turn it sets flags 2, 9 and 7, drops Auryn silently,
  clears flag 1 and the scripts' icon, and takes Falkor and Auryn out of
  play: the start script has just told how Atreyu fell and lost them
  (events 0-2, pictures 22-24). Gmork goes to room $4C.
- With the golden key carried in the treasure room, $48, it puts Falkor
  and Auryn on the hill, room $36.
- It shows picture 29 while the golden key lies in the room and picture
  27 while the fog is there.

## Room scripts

- Room $29 is the Nothing: its text says Atreyu has been consumed, and
  its script waits for Space ("Paused - hit space to continue!") and
  restarts the game. 29 exits lead into
  it, from rooms $2E, $2F, $31 and $33-$36, all of which warn "The pull of
  the Nothing is very strong here" (event 9).
- The graveyard, room $2D: an unseen force pushes Atreyu into an open
  grave (event 3, picture 31) and he lands in room $44; light there
  comes only from the glowglobe.
- Room $2F: a wind blows Atreyu off his feet once (event 10, flag 15).
- The fog in room $33 takes one from strength each turn (event 14).
- The rats in room $39 chase Atreyu out to room $3E (event 15) until
  they are gone. In room $3E the tin's white powder kills them (event
  16) when flags 10 and 9 are set.
- The torture chamber, room $49: dropping the coin there opens an
  entrance in the west wall (event 17, flag 16). Counter 7, set to 4 in
  rooms $48 and $4A, counts down each turn in room $49 after the wraith
  torturer has spotted Atreyu (event 18); at 0 he kills him (event 13).
  The black velvet cape, carried, stops the count.
- The hill, room $36 ($2FBB): with the golden key and Auryn carried
  and Falkor with Atreyu (flag 1), Fantasia explodes (picture 28, event
  11) and the part ends with action $1F (engine `ACTION_NEXT_PART`).

## Route

*Live*, from the part's first prompt: DROP HORN, DROP STONE, E, N, E,
GET GLOWGLOBE, W, W, N, GET ROPE, NE, REMOVE PLANKS, D, SE, S, GET
KNIFE, N, W, TIE ROPE, D, D, GET POUCH, GET COIN, D, U, E, E, E, SE,
SW, D, CUT WEB, W, SW, W, DROP COIN, W, GET KEY, E, E, NE, E, U, NE,
NW, W, W, NW, U, S, S, S, E, GET AURYN, GET FALKOR. Part 3 loads from
room $36.
