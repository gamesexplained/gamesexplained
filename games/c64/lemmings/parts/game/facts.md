# The game — verified technical facts

The play engine (file PA, `$0801`-`$3651`), the briefing and end screens
(`$5000`-`$64AF`, from the resident's stash) and level 1 of Fun as its
files load it (FA to `$E000`, SA to `$3652`). Every address here is this
part's; the resident's are named as such. Unless marked *live*, a fact
comes from the code in `work/entry.vsf`, level 1's briefing on screen.

## The play interrupt

- `irq_play` (`$09C7`) jumps to the handler of the current band; `next_band`
  (`$0999`) sets the next line from `band_lines` (`$09F3`: 251, 60, 71, 79,
  ... 197, 205, 217) and the handler from `$09D1`/`$09E2`.
- Band 0 (`irq_band`, `$08EA`, line 251): the screen swap (when the main
  loop has drawn one and 5 frames have passed), the music (`$3006` while
  `music_on`, `$2E51`), the cursor, the keyboard, the video set-up
  (`set_play_video`, `$0F42`) and the terrain sprites' first row
  (`place_terrain_sprites`, `$0B73`).
- Bands 1-15 (`$0935`, `$093B`, `$0956`, `$0971`): one half of the sprites
  moved down 21 lines, the other half's pointers advanced; band 16
  (`band_panel`, `$0989`, line 217): `$D018` for the panel and its sprites.

## The level header at `$E000`

| Where | What |
|---|---|
| `$E000`, `$E002` | the level's number and the next level's, as text |
| `$E004` | the rating, 0-3 |
| `$E005`, `$E00F` | this level's access code and the next level's, ten letters each, A = 1 |
| `$E019` | the name, 30 screen codes |
| `$E037`, `$E039` | the lemmings, as text and as a number |
| `$E03A`, `$E03C` | the release rate, as text and as a step 0-23 |
| `$E03D`, `$E040` | the percentage to save, as text, and the number to save |
| `$E041` | the minutes |
| `$E044`, `$E04C` | the eight skills' counts, tens and units |
| `$E054`, `$E055` | whether each new lemming turns the other way, and the first direction |
| `$E056`-`$E059` | the percentage one lemming is worth |
| `$E05C`-`$E06B` | background, multicolour 0, sprite colour, multicolour 1: four fade steps each, full colour first |
| `$E06C`-`$E074` | up to three entrances: column high, column low, row; `$FF` ends |
| `$E075`-`$E07A` | up to two exits, the same layout |
| `$E07B` | the number of animated objects |
| `$E07C`-`$E07F` | deadly ground, water and its kind, a slow clock |
| `$E080`-`$E093` | pointers into the file's own data: objects, their graphics, the cell map |
| `$E094` | the level's own terrain unpacker |

## Lemmings

- 21 actions, handlers at `$1E6A`/`$1E7F` by the low five bits of resident
  `$0424`; the skill routines at `$15BA`/`$15C2`.
- `release_lemmings` (`$1DD9`) lets the next one out by a timer driven by
  the release rate (`$4FE8`), at the next entrance in turn.
- `terrain_at` (`$28E8`) addresses the sprite shapes through
  `$4A00`/`$4C00`/`$4E00` by X and `$4800`/`$4900` by Y; `terrain_write`
  (`$2930`) changes a pixel in the level's copy and in the shown one.
- `draw_lemming` (`$1AA2`) ORs a frame into fresh characters; up to three
  rows of two cells.

## The briefing

`show_briefing` (`$526E`) loads the level's files (`load_level`, `$5BAF`),
unpacks the terrain (`$500C`), compares the header's code with resident
`$CB49` and stops at `$5286` with a red border when they differ (*live*),
then draws the preview and the texts.
