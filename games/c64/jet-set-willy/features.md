# Jet Set Willy — features

What the game is documented to do, with its status against the BCS
release's code. Statuses: **open** (documented, not found yet),
**traced** (in the code, not exercised), **confirmed** (in the code,
consistent with the emulator), **live** (observed directly), **differs**
(the code does something else).

Sources:

- C64-Wiki, "Jet Set Willy", https://www.c64-wiki.com/wiki/Jet_Set_Willy, read 16 October 2026
- Wikipedia, "Jet Set Willy", https://en.wikipedia.org/wiki/Jet_Set_Willy, read 16 October 2026
- The game's own title message (the instructions at $A680) and, for the
  credits, the title message of another crack of the same game

## Features

| Feature | Status | Where |
|---|---|---|
| Explore the house: the wiki says "over 60 screens" | confirmed: exactly 60 rooms | room records $B000 and $E000; exits at offsets $DC-$DF; room entry $2DC6 |
| Collect the items scattered around the house | confirmed | 80 item records at $22C3; pick-up at $15FB; the count, in decimal, at $0401 and on the status line |
| Maria bars the bed until the items are collected | differs | Maria leaves after 50 items, not all of them: $164A sets $0400 at $50, and $3284 stops drawing her |
| Reach the bed to finish the game | differs, live | nothing in the code reacts to the bed: $0400, the only flag the items set, is read at $3284 alone; with it set, Willy stood on the bed and nothing happened |
| The clock: time runs out | confirmed | the clock starts at 07:00:00 ($2DB1) and the game ends when the hours read 12 ($33BB) |
| Nine lives, and no extra lives | confirmed | eight spare lives at $2CFF; $3977 ends the game when a ninth death takes the count below zero |
| Left and right on alternate keys of the top two rows | confirmed | left Q E T U O @ 1 3 5 7 9, right W R Y I P * 2 4 6 8 0 ($2C2B, $2C36); the wiki gives five pairs, the code has eleven |
| Jump on the bottom row | confirmed | Z X C V B N M , . / and Space ($2C41) |
| Pause on the middle row, A to L | confirmed | A S D F G H J K L : ; ($2C4C), checked by the main loop at $30FF |
| Return starts the game and turns the music on and off | confirmed | title loop $A7D3; music toggle $39F1 |
| Joystick | confirmed | port 2: left, right and fire at $3791 |
| Title tune, a version of the Moonlight Sonata | traced | three voices from $6C00, player $A139 |
| In-game tune, Bach's Invention No. 1 | traced | two voices from $9C00, player $2066; in this release its first voice is nearly silent (see `facts.md`, "Sound") |
| Graphics "almost 100% the same as the Spectrum original" | traced | the 60 rooms keep the Spectrum's room names; sprites at $4000 |
| A death can put Willy back in the same deadly place | live | the checkpoint saved on entering a room ($2E7C) keeps the fall counter, which a fall through a room's bottom does not clear ($2DC6), so a deadly fall that crosses into a room restarts every life in the same fall ($11FB, $38EF); a jump off the Watch Tower's roof into We Must Perform a Quirkafleeg took all nine lives |
| Ropes that misbehave in On the Roof and We Must Perform a Quirkafleeg | traced, not reproduced | on a rope, $1B96 compares raw screen codes with tile kinds, so any contact with a cell's pixels makes Willy let go, and a hazard never kills him there |
| Copy protection | live, run by hand | the colour code card at $3A02, which the BCS start-up never calls; sent there in VICE, it asked for a cell and accepted the four colours computed from the game's own code |

## Beyond the documentation

- **A room-select cheat, switched off with one byte** at $1BBC: ↑, then
  F A C E S, then two digits. *Live* with the byte restored.
- **The code card's answers are the game's own code**: the four colours
  for each of its 360 cells are the low two bits of four bytes of the
  initialiser at $2C57-$31F6 ($3B20).
- **The in-game tune's first voice is filtered nearly to silence** in
  this release ($2005).
- **Volume keys**: + and − raise and lower the volume while the music is
  on ($34EC). The title's instructions do not mention them.
- **Both tunes are tuned for an American machine**: the note tables
  ($20EC, $A207) fit the NTSC clock, so on a PAL machine every note plays
  65 cents lower than it was tuned.
- **The spare lives stop walking when the music is off** ($34E8).
- **Five conveyors never move on screen** but still carry Willy; West of
  Kitchen's turns the wrong way ($2271, $2297).
- **RUN/STOP ends the game** ($3132).
- **Four of the 16 arrows never fire**: $314D processes 15 of the 16
  arrow records, so the last, in The Beach, never flies, and three name
  room 99, which does not exist ($241F, $242F, $2433).
- **The turn-round on the spot never happens**: the test at $382C needs
  $60, which nothing sets.
- **Unused sprites**: the toilet has four frames, $0E-$11, and the game
  shows only two.
- **Leftovers saved with the game**: scraps of the assembly source at
  $6BC0, $768E, $80CF, $9A80 and $9FAA; an earlier copy of rooms 25 and
  26 at $751A; a text editor at $0B41; an earlier build's vectors at
  $FFF0.
- **Room 6, Entrance to Hades, leads only to itself**: all four exits
  are 6, and a fall into it from the Security Guard's floor costs every
  life (*live*).

## Open questions

- Whether the original release's loader ran the code card, and whether
  its card shows the colours the code computes.
- Which crack changed the byte at $2020 that mutes the in-game tune's
  first voice.
- Whether the rope fault traced above happens in play where the
  documentation says.
