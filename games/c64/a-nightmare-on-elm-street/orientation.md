# A Nightmare on Elm Street — orientation

How to get from the contributor's own copy to the analysed state.

## The image

Five G64 disk images: side 1, side 2, and three more copies of side 2
("alt1" to "alt3"). The alternative sides differ from side 2 only in the
saved-game files a player wrote: `SAVE.DAT` and the level files `Dn.CUR`
(alt1 has no `SAVE.DAT`; alt2 has `D1.CUR` to `D4.CUR`). Side 2's own
`SAVE.DAT` is a level 2 save as Nancy. The credits picture reads "MONARCH
SOFTWARE AND Westwood ASSOCIATES", and says the program was adapted,
published and distributed by Monarch Software, a division of Sharedata Inc.,
copyright 1989 Sharedata, Inc.
Nothing on either side looks like a crack: no intro, no trainer, and the
original fast loader (`WWDOS.O`) is in place. `media.json` lists every file.

## From power-on to play

1. Attach side 1 to drive 8 and `LOAD "*",8,1`. The first file, `FREDDY`,
   loads over BASIC's vectors and starts by itself; it loads `MAIN.OBJ`,
   which loads the rest of the resident code and `INIT`, the street part.
2. The title sequence: the credits, the title, and Freddy's picture, with the
   title tune. Any key skips it. The menu offers "BEGIN A NEW GAME", "LOAD
   THE SAVED GAME" and the sound switch.
3. A new game goes to the character select. Fire chooses; the street loads
   and "ENTERING SPRINGWOOD, USA!" waits for a key.
4. Snapshot `parts/street/work/play-street.vsf`: walking on the street.

## The parts

1. **resident** (`parts/resident`): `FREDDY` at $02C5, the sound effects
   `SOUND` at $0400, the loader `DOS` at $0C50, the fast loader `WWDOS.O` at
   $7BA8, the panel's character set `ALTCH.CHA` at $A000, and the sprite
   shapes `MON` at $E800. Loaded on side 1 and kept through the game. Its
   listing is built from the house's snapshot.
2. **street** (`parts/street`): `INIT` at $1390, side 1. The title, the
   menu, the character select, and Springwood. Snapshot as above.
3. **house** (`parts/house`): `MAIN` at $1390, side 2's levels. Reached by
   finding Freddy's house on the street, or faster: at the first menu choose
   "LOAD THE SAVED GAME", swap in side 2 when asked, then side 1 when the
   loader asks for it, then side 2 again. Side 2's save puts the player on
   level 2. Snapshot `parts/house/work/play-house-ladder.vsf`, taken on
   level 2 beside a ladder.

## Steady state

The interrupt is the Kernal's, with each part's handler in front of it to
step the sound player (house $669A). The processor port is $36 (BASIC out);
the game switches to $35 or $34 for a moment to reach the RAM under the
chips. The video chip uses the bank at $C000: the screen at $CC00 and the
play area's character set in the RAM under the I/O at $D000. Each level
loads its map (`Dn`) to $B000, its objects and scripts (`SCn.DAT`) to $8000,
and its art (`ARTn.ICN`) to $A000.

## The loader, in a paragraph

`DOS` at $0C50 loads a file by its number in the calling part's own table at
$13B3 (name, load address, disk side), through the fast loader at $7BA8,
which sends 672 bytes of code into the 1541 and receives each file two bits
at a time. A failed load asks for the other side ("INSERT SIDE n AND PRESS
A KEY...") and tries again. Saves go through the Kernal's own SAVE after a
scratch command.
