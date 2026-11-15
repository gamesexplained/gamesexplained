# Level 1-1 — technical facts

Unless marked live, these facts are source traces from `work/entry.vsf`,
the stop at `$551B` after file `11` loads and before level initialization.
The listing's independently sampled error rate is recorded for the whole
contribution in `game.json` when verification is complete.

## Layout and formats

File `11` unpacks to `$6C00-$C7FF`. Its 23552 bytes match the live loaded
image exactly when the original decruncher is supplied the disk bytes.
The auxiliary `SA` buffer supplies sprite RAM and the callbacks at
`$FD00-$FF7F` through the engine's copy beneath I/O.

The map is 163 by 50 stored blocks at `$9000-$AFD5`. Each block draws
four by four characters. `$2AFF` takes the stored byte's high nibble as
the low address's upper nibble, and its low nibble as the definition page:
the resulting index exchanges the byte's nibbles. All 8150 map cells
resolve within the 188 definitions at `$B000-$BBBF`. Colours and terrain
properties are the two 256-entry tables at `$BD91` and `$BE91`.

The actor directory describes twenty-one by six cells. `$8E64` supplies
row offsets; `$8E89/$8F11` contain the split pointer bytes. The 126 active
entries reach 111 distinct `$FF`-terminated streams. Records are four
bytes: type/subtype nibbles, high X/Y nibbles, X low, Y low. Type zero
skips a record. `$558C` clears the type nibble when allocating its actor,
so a consumed source record persists without spawning again. Positions
use character columns and rows, converted to screen half-pixel X and
pixel Y by the spawn routine.

`$BBC0-$BD90` is cleared actor/boss workspace. `$C800/$CC00` are generated
terrain screens and also hold generated code and transient arrays.
The row and column colour buffers at `$BFC3-$BFFF` are generated.

The playfield has 256 eight-byte glyph slots at `$C000-$C7FF`. Sprite
slots `$40-$F3` occupy `$D000-$FCFF`; the final three pages contain the
level callbacks rather than additional sprite art. The VIC reads RAM
under I/O, while CPU accesses to the same addresses with I/O visible
reach registers or colour RAM. The listing's RAM sprite labels describe
that distinct view explicitly.

## Actors and local effects

The thirteen level hooks at `$8F99-$8FBF` select actor types three through
fifteen. They include a ground walker, a segmented creature, flying and
stationary spawners, a wandering flyer, wind particles, a reward platform,
two player-attached splash effects, a shootable bonus and the giant boss.
The resident engine supplies the orb, collectible, explosion and
projectile handlers.

The ground walker at `$6C00` uses facing-dependent four-frame animation,
terrain turns and falling tables. Its descending-player contact branch
has a coordinate comparison against player X at `$6C7F`; whether that
comparison was intended remains open.

The segmented creature at `$6E9C` allocates six body slots behind one
head. Its body positions use six phase-shifted vertical and horizontal
streams. Head destruction sets staggered body explosion delays and
awards 750 points.

The reward platform at `$79E4` supports the player and responds to an
underside bump. Qualified hits count down its reward state and launch
collectibles, which follow a trajectory before becoming ordinary pickup
actors. Its terminal award is 5000 points.

The callback at `$FD03` animates glyph `$A4` from three bitmap frames,
selects background and player colours by terrain/map region, and controls
the splash effects. `$7C7E` rotates character bytes in `$C61D-$C63F` and
constructs the six noise rows of glyph `$18` through the masks at `$AFF3`.
One region changes source actor byte `$8A59` to type thirteen and removes
the hidden wind controller. The top-right exit requires a grounded player
at X at least `$80` before installing the walking handler `$095B`.

## Giant boss

`$7D45` waits for centred horizontal scrolling and a grounded player,
clears other actors and installs its special camera/display hooks. Three
hardware sprites form columns reused across five vertical bands. Two
further sprites carry projectiles. The live colour, shape and bitmap
address matrices reuse the first fifteen cells of each of map rows
46 through 49 after the boss takes control.

The action directory at `$859B/$85A0` selects descent, jump/turn, a timed
pose, three hops or waiting. An eighteen-action sequence repeats after its
initial entry. The silhouette scan at `$8156` examines thirteen character
rows and consumes hit characters with `$FF`. Rows two through four on the
selected side subtract the shared character damage from health `$019B`.
Other silhouette contacts consume the shot without reducing that health.
Underflow starts the death sequence, restores ordinary hooks, creates
eleven explosions and awards 10000 points.

The sprite-band code at `$8456` can exchange nine bitmap bytes between
adjacent bands and restore them afterward. `$84EF/$8559` perform the
exchange/restore; their operands are patched from the live bitmap matrix.

## Open details

The retained header tail at `$8FF2-$8FFF` and seven bytes after the ripple
masks at `$AFF9-$AFFF` have no assigned consumer. Their values are retained
in the listing; no additional feature is inferred from them.
