# The ending: verified technical facts

The file `cf`, `$5A00`-`$B0FF`, loaded as level index 5 and entered by
the loader's `JMP $5A00`. Unless marked *live*, a fact comes from the
code.

## How it runs

- `$5A00` jumps to the set-up at `$5A52`; `$5B31` is the main loop. Its
  own raster dispatcher (`$5CD4`, installed by `$5C75` with `$01` = `$36`)
  runs the credit animation (`$5B78`), the top strip's scroll, fades,
  page timer and music (`$5B96`) and the bottom strip (`$5BF2`-`$5C4A`).
- It calls the engine only for music: `$080C` at `$5B19` (its own tune at
  `$6CEE`) and `$087B` each frame from `$5A03`.
- Two strips scroll the lands' scenery, the top one left (`$604A`), the
  bottom one right (`$617D`), from one map of six rows by 256 at `$9250`,
  coloured per character from `$6A22`, characters at `$7000`. Each time
  the top strip finishes its map, `$5FA0` copies in the next of five
  strip sets. Which land each set shows is not established.
- Between the strips, two black shutter sprites open and close over a
  portrait (sprite 2) in a character frame for each credit page.

## The end

When the fifth strip set has scrolled through, `$5B55` sets `$5A17`; "the
end" appears (`$6474`), two sprites blink (`$6439`), sprites 6 and 7
move apart and cycle colours. Fire then goes `$5B72` → `$5A07` → the
engine's `JMP $C019` → `$CE66`, which swaps `$7800`-`$7FFF` with
`$D800`-`$DFFF` and starts a new game at the first land (`$CBA5`). There
is no score screen and no return to the intro.

## Text

Screen codes (1-26 a-z, `$20` space, `$21` "!") in 73 fragments ending
in `$FF` at `$65D0`-`$6782`, printed a fragment a frame in a 2×2 font
(glyph table `$B050`, printer `$635F`); leading spaces centre each line.

| Page | Line 1 | Line 2 |
|---|---|---|
| 0 | programming by | john rowlands |
| 1 | grafix and sound by | steve rowlands |
| 2 | additional bytes by | andy roberts |
| 3 | clever arty bits by | ollie alderton |
| 4 | moral support | andy smith |
| 5 | immoral support | tracy matheussen |
| 6 | many thanks to | the cf crew |
| 7 | congratulations!! | game complete |

Then "the end" (`$677A`).

## Oddities

- `$5A73` is `AND $E0` (zero page) where `AND #$E0` was presumably meant;
  `$E0` is 0, so `$D018` gets 0 until the handlers set it each frame.
- `$5F6B` clears `$68B4`-`$6953`, one byte past the table `$68B3`-`$6952`.
