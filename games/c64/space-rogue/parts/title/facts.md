# The title: facts

`TITLE` at `$2000` and what it loads: `SPACE` at `$B700`, `ROGUE` at
`$AC00`, `SHIP` at `$6800` and `CREDITS` at `$3000`. Every address is in
this part's listing, built from `work/prompt.vsf` (the ship climbing
over the logo). Every fact names the routine or table it comes from.

## Memory

| Range | What |
|---|---|
| `$2000`-`$2A1C` | `title_start`, the loader, the library shared with the intro and the ending (`$2042`-`$2A1C`) |
| `$2A1D`-`$2B6D` | `draw_shape` |
| `$2B6E`-`$2F73` | the animation: `title_loop`, its stages and frames, `title_exit` |
| `$3000`-`$3F75` | `CREDITS`, the credits page, packed |
| `$4000`-`$67FF`, `$C000`-`$E7FF` | the two display buffers |
| `$6800`-`$A8A2` | `SHIP`: the animation's shapes |
| `$AC00`-`$B631` | `ROGUE`, the logo, packed |
| `$B700`-`$BF53` | `SPACE`, the star field, packed |
| `$EB00`-`$ECC7` | the pixel-line table (`build_line_table`, `$2752`) |

The title runs with `$01` = `$34` and banks the I/O and the KERNAL in
(`io_in`, `$2042`) for the chips, the loads and the interrupt. Its
raster interrupt is at line `$50` (`setup_irq`, `$2209`); RESTORE does
nothing.

## The animation

- `title_showing` (`$2B71`) puts every shape back at its start, draws
  the first frame and dissolves it in, then runs the stages, each
  followed by a check for a key:
  - `stage_engine` (`$2BEC`): six frames of the Sunracer standing on
    the plain; the engine starts and twelve frames of dust blow out.
  - `stage_rise` (`$2C17`): 24 frames, the ship and its legs a line up
    a frame.
  - `stage_legs` (`$2C4E`): 12 frames, the ship two lines a frame and
    the legs four, folding into it.
  - `stage_climb` (`$2C87`): drawn over `ROGUE`, the logo, without the
    legs: 12 frames with the ship up 2 and the scenery down 1, 12 with
    the scenery down 2, then 48 with the ship up 2 and the scenery down
    3, until both are off the screen.
  - `show_credits` (`$2D84`): `CREDITS` dissolved in and left up for
    24 pauses, about 21 seconds, faded out, and 6 more pauses.
- The frames are drawn into one buffer while the other is shown, and
  then flipped (`frame_still`, `frame_dust`, `frame_logo`).
- `pause` (`$20E0`) always runs its 26-cycle loop 32,640 times, about
  0.86 seconds: `clear_key` leaves A at `$FF` before the loop, so the
  0 the title passes makes no difference.
- `title_exit` (`$2F5A`): a key puts up `CREDITS` at once, loads `INTRO`
  over `SHIP` and jumps to it (`to_intro`, `$2F71`).

## Shapes

- `draw_shape` (`$2A1D`): a shape is one byte per cell across and one
  line per pixel line, drawn at a column and a 16-bit pixel line, so it
  can start above the screen. Bit 7 of `shape_mode` (`$4E`) draws it
  through its mask, keeping the screen's pixels where the mask is clear;
  bit 6 stamps its colours into the screen matrix (`put_matrix_block`,
  `$270A`).
- `SHIP`'s shapes:

| Shape | At | Size (cells × lines) | Mask, colours |
|---|---|---|---|
| mountains | `$6800` | 40 × 48 | mask `$7070`, colours `$6F80` |
| plain | `$77F0` | 40 × 80 | none, colours `$8470` |
| small dust, three frames | `$8600`, `$8740`, `$8880` | 10 × 32 | itself |
| large dust, three frames | `$89C0`, `$8CE0`, `$9000` | 25 × 32 | itself |
| the Sunracer | `$9320` | 37 × 56 | mask `$9C3B`, colours `$9B38` |
| the landing legs | `$A453` | 23 × 24 | mask `$A67B` |

- The dust cycles through its three frames in the order 0, 1, 2, 0,
  2, 1, 0, 2 (`dust_order_small`, `$2ECD`).
- `white_colours` (`$26A4`) runs once at the start, and `CREDITS`,
  `ROGUE` and `SPACE` carry no colours, so every picture's third colour
  is white. The title's dissolves enter at `dissolve_in_matrix`
  (`$28D1`), three bytes in, which keeps it so.

## Sound

- The effect player (`sound_frame`, `$2429`) has a second sound below
  the effects: its frequency (`$74`/`$75`) slides up 2 a frame toward a
  target (`$72`/`$73`), at a level in `$76`. The title turns it on as
  the engine starts (`drone_mask`, `$71`, at `$2BFE`), raises the
  target at each step of the lift-off, lowers the level by 2 each step,
  and turns it off for the credits. It is the Sunracer's engine.
- The title never plays an effect: `start_effect` (`$23EA`) is called
  only from `play_effect`, and nothing calls that.

## Unused code

- The title carries the whole library its siblings use: `print_char`
  (`$20FC`) with no font loaded, the Morse distress call
  (`distress_call`, `$2549`, SOS SOS PLAY ULTIMA SOS SOS at `$2587`), the
  intro's effect calls, and the picture copiers. None of it runs.
