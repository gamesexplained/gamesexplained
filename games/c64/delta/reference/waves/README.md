# Delta's attack waves, recorded

One file per stage, `stage-NN.json`, made by running Delta's own code in the
kit's C64 machine (`kit/c64/machine.js`) with nobody at the controls and
writing down every enemy slot once a frame. The attack waves tab plays them
back; anything else may read them too.

How they were made, and the two stand-ins for a player, is in the caption of
the player on `waves.html`. Each stage published here was compared with the
same stage played in VICE, enemy by enemy and frame by frame from the start of
each group.

## Coordinates

- Positions are the game's sprite coordinates, the values it writes to the
  video chip: X at `$38` + slot with its high bit from `$28` + slot, Y at
  `$40` + slot. A sprite at X 24, Y 50 has its top left corner at the top left
  of the screen; a sprite is 24 x 21 pixels.
- X is nine bits on the machine. Values from 448 up are given as negative
  numbers (511 is -1), so an enemy that leaves on the left keeps moving
  smoothly instead of jumping to the right edge.
- One sample per frame (PAL, 50.12 frames a second), taken each time the main
  loop reaches `$17D0`.

## The file

```
{
  "stage": 1,                  // 1-32
  "frames": 2808,              // frames recorded in this stage
  "mc": [1, 11],               // the enemy sprites' two multicolours ($1082, $1083)
  "groups": [[start, frames, list, record, shop, shot], ...],
  "enemies": [[start, frames, slot, group, x0, y0, deltas, events], ...],
  "shapes": { "id": "base64 of 63 bytes", ... }
}
```

- **groups**: `start` and `frames` in frames from the start of the stage;
  `list` the position in the stage's wave list (`$129A`); `record` the wave
  record (`$12DC`, `$FF` between groups); `shop` 1 when the group is the shop;
  `shot` the frame the stand-in shots began, or -1.
- **enemies**: one entry each time a slot (1-7) comes alive. `group` indexes
  `groups`. The position at frame `start` is `x0, y0`; `deltas` holds one pair
  of characters per later frame, each the change in X then Y plus 48 as a
  character code.
- **events**: the enemy's state, written whenever it changes, as
  `[offset, hp, colour, exploding, final, form, points, fire, shape]`:
  `offset` in frames from the enemy's start; `hp` its hit points (`$1240` +
  slot, 255 indestructible); `colour` 0-15 (`$90` + slot); `exploding`
  (`$12A8` + slot), `final` (`$1208` + slot) and `form` (changes form when
  killed, `$1218` + slot) as 0 or 1; `points` the value the game adds, shown
  ten times larger on the panel (`$1280` + slot); `fire` 1 when it may fire
  (bit 6 of `$12E8` + slot); `shape` a key of `shapes`.
- **shapes**: the 63 bytes of each sprite shape the enemies show, a
  multicolour sprite (`01` the first multicolour, `10` the enemy's colour,
  `11` the second). An all-zero shape is the empty sprite `$9B`: the enemy is
  there but invisible.

Decoding the path of one enemy:

```js
function path([start, frames, slot, group, x0, y0, d]) {
  const xs = [x0], ys = [y0];
  for (let k = 1; k < frames; k++) {
    xs.push(xs[k - 1] + d.charCodeAt(2 * k - 2) - 48);
    ys.push(ys[k - 1] + d.charCodeAt(2 * k - 1) - 48);
  }
  return { xs, ys };            // frame start + k is at (xs[k], ys[k])
}
```
