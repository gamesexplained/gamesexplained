# The ending: facts

`WON` at `$6800`, which the engine loads over `MAIN` when the ship docks
in the Manchi system, and what it loads: `FONT` at `$F200`, `F1.PAC` at
`$8400`, `F2.PAC` at `$9200` and `F3.PAC` at `$A100`. Every address is in
this part's listing, built from `work/play.vsf` (the second page). Every
fact names the routine or table it comes from.

## Memory

| Range | What |
|---|---|
| `$6800`-`$743D` | `ending_start`, the loader and the library, the same as the intro's at other addresses |
| `$743E`-`$7461` | `print_inline` |
| `$7462`-`$7DA2` | the story pages and their texts, and the return to the title |
| `$8400`-`$913B` | `F1.PAC`, the landing among the Manchi warriors |
| `$9200`-`$A03A` | `F2.PAC`, the Manchi raising the egg |
| `$A100`-`$ACD3` | `F3.PAC`, Emperor Hiathra holding up the Golden Sunburst |

Memory from `$0400` to `$3FFF` still holds `SR`, which the ending never
returns to.

## How it is reached

- `dock` (engine `$7094`) jumps to `load_won` (engine `$1532`) when the
  current system (`$071D`) is 9, whatever base is docked at; `load_won`
  asks for side 1, loads `WON` and jumps to `$6800`.
- `talk_end` (station `$E7C7`) is the way there in play: with plot flag
  8 set, a conversation puts the player in system 9 at sector 0, 0.

## The pages

| Routine | Picture | Text |
|---|---|---|
| `story_landing` `$7462` | F1, full screen | the landing, rows 16-22 |
| `story_patrol` `$7577` | F1 | the warrior-caste patrol, after a wipe to the right |
| `story_egg` `$7665` | F2, top left | "...Until you bring forth the egg", a window of columns 24-38 |
| `story_where` `$7702` | F2, dissolved in | "Where did you get THAT?" |
| `story_interpreter` `$7749` | F2 | the Baakili trader |
| `story_plot` `$77F2` | F2 | Koth's plot exposed, after a scroll down |
| `story_truce` `$78F7` | F2 | the truce: "Peace is at hand." |
| `story_journey` `$7983` | F3, bottom 18 rows | the journey to the Imperial homeworld |
| `story_honored` `$7A53` | F3 | the Emperor's speech, after a scroll up |
| `story_sunburst` `$7B57` | F3 | the Golden Sunburst, after a wipe to the left |
| `story_amulet` `$7C0F` | F3 | the amulet, after a wipe to the right |
| `story_cheers` `$7CFF` | F3 | "VICTORY IS YOURS!", after a scroll down |

- `story_end` (`$7D8F`) waits for a key and loads `TITLE`: the game goes
  back to its title, with no score or save.
- `story_truce` sets only the cursor's row: `text_plot`'s six full lines
  left the column past the window's edge, so the truce's first character
  starts a new line and the page begins a row lower than the others.
- `story_landing` sets the cursor twice; the first setting, row 3, is
  never used (`$7467`).

## Sound

The ending plays nothing: its copy of the library's effect calls is
never called, and the second sound stays masked off.
