# The menu — verified technical facts

The code sheet, the title and the access codes (files CA, CB, CC), loaded
over the play engine's memory. Every address here is this part's. Unless
marked *live*, a fact comes from the code in `work/entry.vsf`, stopped on
`$9150`.

- `menu_entry` (`$9150`): the title's interrupt, the code sheet the first
  time only (`$A0D8`), then the title (`$9195`), whose keys are read with
  GETIN.
- The code sheet: `choose_question` (`$9EF6`) mixes the raster line over
  256 reads into a page (AND 15) and a line (mod 20) and works out the
  answer: `page_first_lo`/`hi` (`$A070`/`$A080`) plus 23,171 a line, less
  56,831 when the sum reaches it, into `$A092`. `code_to_number` (`$A0A0`)
  turns the five typed digits into a number; `$A1AC` compares. The picture
  is four hires sprites from `$A400` + page × 256 (`show_page_picture`,
  `$A1CF`). *Live*: all 320 by `test_code_sheet.js`.
- The access codes: `access_codes` (`$9701`), 100 × 10 letters, each EOR
  the one before; `find_access_code` (`$9BC4`) looks a typed code up; level
  1's, WANNABFREE, sets resident `$CB61` bit 7 and prints "Cheatmode
  Activated" (*live*).
- `toggle_music` (`$93A3`) flips resident `$CB47` bit 7, music or effects.
- The title picture is a multicolour bitmap at `$4000` with its colours at
  `$6000`; the scroller is a character band at the bottom (`irq_scroller`,
  `$92CC`).
- "HACKING AT THE END OF THE LEMNIVERSE" at `$A184`; no instruction reads
  it.
