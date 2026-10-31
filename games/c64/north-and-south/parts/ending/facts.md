# The ending — verified technical facts

File CS, `$2800`-`$AF3F`, entered at `$8000` by the resident's script when
the map returns with resident `$039B` at 0. Every address here is this
part's. Unless marked *live*, a fact comes from the code in
`work/entry.vsf`, stopped on `$8000`.

- Two screens (`ending_main`, `$8000`): the victory (`victory_screen`,
  `$8050`, the picture in place in the file, tune 0) and the defeat
  (`defeat_screen`, `$80BF`, its picture copied from `$9000`, `$2800` and
  `$2C00`, tune 1). With one person against the computer only the person's
  screen shows: the victory when the person won (resident `$0382` equal to
  the winner `$0398`), the defeat otherwise. With two people, or the
  computer on both sides, the victory and then the defeat.
- Each screen has a text row above the picture (`ending_irq_text`, `$8380`:
  text mode with the font at `$7800` down to line `$50`, then the bitmap,
  `ending_irq_picture`, `$83CF`) along which a message scrolls two pixels a
  frame (`message_scroll`, `$8420`). Four messages, one for each winner and
  screen (`$847B`-`$86BF`), with the rank of the player's level written in
  (`rank_words`, `$86C0`: CORPORAL, SERGEANT, CAPTAIN; the winner's on the
  victory, the loser's on the defeat) and the war's months (resident
  `$0399`, `$039A`) over their XX.
- Space or fire ends a screen: the tune fades and after three steps of 100
  frames the screen goes (`ending_wait`, `$815D`); when the message has
  scrolled out it ends by itself the same way (`message_next`, `$8448`).
- The tunes are played by a later build of the title's driver (`$3000`
  start, `$3003` play): the same layout of variables with one more byte
  (`end_music_new_tick`, `$3016`), a glide (pattern byte `$FD`,
  `$303E`-`$3047`), an arpeggio base from the order list's bytes `$50`-`$5F`
  (`$3090`), and the instrument's detune added to each frequency
  (`end_voice_detune`, `$300D`, read at `$3107`). Tune 0 and tune 1 share 22
  patterns (`end_pattern_lo`, `$382B`); tune 1's transpose is 1.
