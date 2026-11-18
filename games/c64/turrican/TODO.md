# Turrican — TODO

The game is at Silver. What is missing for the next tiers, and the leads
that stay off the pages.

## For Gold

- A human pass over every section of the four pages (`AGENTS.md`,
  "Definition of done"); `copy` records what it changed.

## For Platinum

- A Play tab: the engine, a level and its objects ported to JavaScript
  and run in lockstep with the game's own code
  (`kit/skills/core/70-minisite/play.md`).

## The listing

- An audit (`kit/CHECKING.md`). The sample found 8 of 80 comments wrong
  (10 %, `facts.md`), over the mark; the beliefs behind them were
  corrected in every part, and building the Graphics tab corrected nine
  more outside the sample. A full audit has not been made.

## Leads that stay off the pages

Each is in the listing's comments; none has been shown in normal play.
The reader review (`agent-history.md`) added those it found in the notes.

- The whip after the fish in 2-1: a whip shorter than 22 comes back as
  whatever `$BE9E` held (shown only with the length poked; what the
  byte holds in normal play is open).
- The prize-block burst in 2-1 and 3-2 turns every enemy on the screen
  into prizes.
- In 1-1, a drone removed on its first frame, a drone that never sets
  its vertical timer (`$BD69`), and a flier that jumps to the left edge.
- In 2-1, the splash's loop, the fish entering from the left, and the
  start closing the pool's floor with a block (`$8350`).
- The 3-1 boss's debris leaping 67 lines, and 3-2 putting back two
  characters it left rolled (`$84F5`).
- Squares whose list address is `$0000` in 3-1 and 3-3.
- The 4-3 boss in a low object slot pays 20,000 points a frame (needs a
  forced slot).
- 5-1's giant at X 166 or more never spits (`$7D8E`); 5-2's boss goes
  left half as long as it goes right (`$8229`).
- The spiked balls of 3-2 and 5-1 roll their frames backwards.
- The bomb pod's hit box uses one width for all three of its parts.
- The hall of fame compares 8 bytes where an entry has 7 (needs a tie).
- Extra lives in 1-1: the Levels tab marks the four 1UPs in a row near
  the top of the map; whether they are C64-Wiki's trick is open.
- Bosses built from five columns of sprites repeated down the screen by
  each level's own raster interrupts: not traced to their addresses.
- The rows after the maps of 2-2 and other levels: only 2-1's is drawn.
- Figures of small light tiles in the maps of 4-1 and 4-2: not
  identified.
- Hidden prize blocks: one rule, handled level by level.
- The grenade's flash fades its third colour with the second colour's
  table, so the fade at `$301F` is never used.
- 3-1's tune: the third voice's order list is never read (`$7401`,
  `$746A`). The module player's entry the game never calls, and four
  header addresses past its end.
- The title draws a 14th row whose last byte lands on sprite 7's Y
  (`$7B53`).
- Each level's header names the next level's file, with names such as
  PO, <> and )(.
- The box's 13 levels, 1,000 screens and 50 aliens, and the Italian
  text's 12 levels, counted against the game.

## The pages

- Graphics: each level's sprite sheet is drawn one way, chosen with its
  controls. Grouping the shapes by the object that uses them, each in
  its own colour, mode and animation, and assembling a boss from its
  rows and columns, would show what the enemies look like.
- How it works: screenshots from the middle of levels, with an enemy, the
  whip and a boss.
- Discoveries: the speech's words and where in the sample the disk
  command falls; the title's and the ending's credits side by side.
