# Part 3 — verified technical facts

The file `PART 3`, loaded over $2F00-$95FF when Part 2 ends: the
asteroids left of Fantasia, the Ivory Tower, its three mazes of wood,
stone and glass, and the Childlike Empress. Every address here is this
part's, in its `listing.json`; routines named with an address are the
engine's (`parts/engine`). Part 3's rooms are $4D-$7C and the engine
puts Atreyu in room $4D when the part loads ($041F). Unless marked
*live*, a fact comes from the bytes of `work/part3-command.vsf`, stopped
at the part's first command prompt.

## The part's tables

- $2F00 points at the room texts' pointers ($318D), $2F02 at the
  events' ($2F94) and $2F04 at the room scripts' ($2F0D); $2F06 is the
  part's turn script, which only sets flag 2 on the first turn.
- 48 rooms, $4D-$7C, whose pointers name 5 scripts; 13 rooms share the
  empty script at $2F6D.
- 9 events ($2F94).
- Pictures 37-56, $4300-$8DCD (engine `ROOM_GRAPHIC_TABLE`). Picture
  49, Atreyu buried to the waist in rubble ($71FE-$7581), is shown by no
  room and no script.
- $3842-$42FF and $8DCE-$95FF are filler that nothing in Part 3 reads:
  room texts of an earlier build of Part 2 and of Part 1, then the bytes
  Parts 1 and 2 hold at the same addresses. The engine's records for
  pictures 19 and 20 reach into the second (picture 20's, $0C71, points
  at $8EA0), but no Part 3 room or script shows either.

## The mazes

- Rooms $56-$61 are the wood-panelled maze, $62-$6D the stone one and
  $6E-$79 the glass one. Three rooms stand out: Rockbiter's old guest
  room ($63, picture 50, his rock cycle), the stone corridor ending at a
  chest ($6B, picture 48), where the casket, the sapphire, the diamond
  and the ruby start, and the viewing room ($78). The rest share their
  maze's text, as $6B does too, and nine pictures (40-45, 53-55) serve them: a plain
  corridor, one with stairs up and one with stairs down, in each
  material.
- LOOK GLASS FRAGMENT sets flag 18 (engine action $2ED7). On the next
  turn the maze room's script clears it and says what the room holds:
  "You can see nothing unusual about this corridor !", "The stairs here
  lead up !" or "The stairs here lead down !" (events 1-3, scripts
  $2F6F, $2F76, $2F7D).

## Doors

All three are tests in the engine's action for EAST ($2A26).

- The tower's great door, room $51: EAST is refused until UNLOCK DOOR
  with the golden key carried sets flag 20 ($2EDA).
- The small ornate door, room $7A: EAST prints "The door will only open
  for people it likes. People who are polite!" (event 7) until SAY
  PLEASE sets flag 19 ($2EBD).
- The same EAST action refuses the dungeon cell in Part 2's room $4A
  until flag 11 is set.

## The end

The Empress's quarters, room $7C ($2F84): with Auryn carried, the
Empress congratulates Atreyu (event 4), then "Bastian , Atreyu and Falkor
set off to begin rebuilding Fantasia !" (event 6) with picture 47, and
the game restarts (engine `RESTART_GAME`). Without Auryn she is "very
disappointed" (event 5).

## Route

*Live*, from the part's first prompt: E, N, UNLOCK DOOR, E, E, U, NW,
U, E, SE, U, E, E, E, U, SAY PLEASE, E, E. The last E enters room $7C and
shows the ending.
