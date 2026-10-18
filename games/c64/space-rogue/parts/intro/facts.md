# The intro: facts

`INTRO` at `$6800` and what it loads: `FONT` at `$F200`, `SPACE` at
`$B700`, and for a new game `I1.PAC` at `$8400`, `I2.PAC` at `$9200` and
`I3.PAC` at `$A100`. Every address is in this part's listing, built from
`work/story.vsf` (the first story page). Every fact names the routine or
table it comes from.

## Memory

| Range | What |
|---|---|
| `$6800`-`$7432` | `intro_start`, the loader and the library: printing, the interrupt and keyboard, the wipes and scrolls, the picture copiers, the dissolves, the unpacker, the effect player, the Morse |
| `$7433`-`$78D8` | the name, the manual question, `print_inline`, `random` |
| `$78D9`-`$826D` | "Old or New Game?", the story pages and their texts, `run_sr` |
| `$8400`-`$AF3A` | `I1.PAC`, `I2.PAC`, `I3.PAC`, packed |
| `$B700`-`$BF53` | `SPACE`, the star field, packed |
| `$BF00`-`$BF10` | `line_buffer`, the typed line |
| `$EB00`-`$ECC7` | the pixel-line table |
| `$F200`-`$F5FF` | `FONT` |

## Old or new

- `old_or_new` (`$78D9`) prints "Old or New Game?" and waits for N or O,
  in either case.
- A new game (`new_game`, `$796B`) asks "What is your name?" and reads
  up to 11 characters (`ask_name`, `$7433`), then plays the story.
- An old game asks the manual question (`password_check`, `$74D2`). A
  right answer loads `SR` with A = 'O'; a wrong one prints "Starship
  Jolly Roger" and "ACCESS DENIED" and, after a key, loads `TITLE` again
  (`access_denied`, `$7927`).

## The manual question

- `password_check` (`$74D2`) picks one of 32 questions by the frame
  counter, (`$3D` AND 31) + 1, and prints it: "Look at the second
  paragraph on page 1... What is the third word in the first
  sentence?" (`ask_question`, `$75C9`).
- `manual_questions` (`$76C8`): each record is the page, the paragraph,
  the sentence and the word in the Sunracer Owner's Guide, then the word
  in capitals and a zero. The pages run from 1 to 46; the first record,
  page 1, paragraph 2, sentence 1, word 3, is SCOUT.
- Only the first four letters of the answer are compared, folded to
  capitals; the rest is not read.

## The story

- Three pictures, each shown full screen with the text in a window over
  part of it: `I1` (the beacon and the orders), `I2` (the derelict and
  the airlock), `I3` (the alert, then the Manchi leaving). `story_beacon`
  (`$7992`) to `story_end` (`$8241`) draw a page into one buffer and show
  it with its colours, waiting a pause or a key between lines.
- `distress_call` (`$7359`) plays the beacon in Morse on the first page:
  SOS SOS PLAY ULTIMA SOS SOS (`morse_text`, `$7397`): a dot is a
  2-frame tone, a dash 6 frames, each followed by 2 frames of silence.
- The effects (`$72F6`-`$7323`): 0 falling noise, 1 three rising tones
  (the alert), 2 noise falling for 128 frames (the rumble), 3 rising
  noise (the airlock), 4 the Morse tone.
- `story_end` loads `SR` to `$0400` and jumps there with A = 'N'
  (`run_sr`, `$8251`).

## The library

- `print_char` (`$68F2`) draws a font character into the drawing buffer;
  RETURN starts a new line, `$08` and `$7F` rub out, and a character past
  the window's right edge starts a new line. `new_line` (`$6991`)
  scrolls rows 1-24 up past row 24 and clears only 8 of the bottom row's
  40 cells (`$69E5` loads Y = 1 where the row needs 2).
- `unpack_picture` (`$712D`): a byte below `$80` is a count and the next
  byte is repeated; `$80` plus a count is followed by that many bytes to
  copy; a zero is followed by the border colour and ends the picture,
  which is a bitmap, its screen matrix at +`$2000` and its colours at
  +`$2400`.
- `dissolve_out` (`$70E9`) and `dissolve_in` (`$7082`) work a pixel pair
  at a time in the order of a 15-bit shift register (`$1D`) that visits
  every pair of the 8 KB bitmap once.
- `show_c000` (`$7012`) and `clear_drawing` (`$7065`) hide further
  entries in the operands of BIT instructions.

## Line buffer and star field

`line_buffer` (`$BF00`) is also the last page of `SPACE`, whose packed
stream runs on to `$BF53`. An answer typed to the manual question
replaces part of the star field's packed data, so the star field
`access_denied` unpacks after a wrong answer is not the one shown before
it (`read_line`, `$7488`; `unpack_picture` from `$B700`).

## The raster hang

`bitmap_mode` (`$6FD7`) turns the bitmap on with `LDA $D011 / ORA #$20 /
STA $D011`. Bit 7 of `$D011` reads as bit 8 of the beam's line and
writes bit 8 of the raster compare: run while the beam is on line 256 or
later, it moves the interrupt from line `$50` to `$150`, which no PAL
frame reaches, and the interrupt stops for good.
