# Fire — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

- 25 November 2026, orientation. The ROM matches MAME 0.289's checksum;
  the SVG is an older revision, as Parachute's was. check-emulator 9 of
  9. Parachute's work tools were copied into `work/tools` and renamed.
  Only pages $09, $11 and $12 are largely shared with Parachute, so the
  listing was read from scratch, though the main loop has Parachute's
  shape and its notes guided the reading.
- The first coverage run, with random presses, ran 1,511 instructions
  and scored little, so the score's carries and the bonus looked
  unreachable. A look-ahead player (each step it tries no press, left,
  right and two of either on copies of the machine) lost at 75 points:
  at 210 s every one-press plan lost someone within its horizon, and it
  moved the wrong way. Searching two steps deep it reached 999 in Game
  A. Game B still ends near 90.
- A wrong turn: the reading view showed $0CB as never run because the
  view had been built from an older coverage file; rebuilt, it ran.
- The skip helpers were first read backwards (TM skips when the bit is
  set, so `TM n; RTNS; RTN` returns with a skip when the bit is clear);
  caught before any note used them.
- The R2 pad was first expected to work at power on, as Parachute's R3
  does; the coverage phase that held it then started no game. The code
  reads it only when a miss is counted (count_miss $0199), and holding
  it there keeps the angel away. The R3 test keys turned out to move
  the points from the nets to the ambulance, two each.
- Phases for the bonus (score set to 199 and 499 with an angel shown),
  the alarm's setting, the ringing alarm and the test keys were added
  to the coverage run, which then ran 1,605 instructions; the notes that
  said "never ran" were checked against it.
- 25 November 2026, the sample (seed 20261126, claude-fable-5-2): 9 of
  60 wrong, all held. Two of them, c_not_game_b's sense and the swapped
  best scores, had already turned up while the port was being written,
  and were left alone until the verdicts were in. Correcting the read_pad
  finding showed a wider mistake: the divider's bits 11-14 step sixteen
  times a second, not eight, so tone_beep's length was wrong too.
- 25 November 2026, the port. Written routine by routine on Parachute's
  frame, it passed power on and 20 s of the clock at its first lockstep
  run, and four minutes each of Game A and Game B with random presses.
  The first played run parted at $00D3: the port called skip_if_clear2
  where the program calls skip_if_clear3, so jumps stop while the
  seconds end in 8 or 9, not 4 to 7; the comment and the notes had the
  same misreading. The second parting was read_pad's held repeat in the
  alarm's setting, the same fact the sample's checker had found. The
  page's player is a look-ahead on copies of the port. The play test
  first missed 999: two angels were showing when the top speed was set,
  and the third ended the game; the test now clears the angels when it
  sets the score. Both buttons at once in a game ($02F3) cannot be
  reached in a lockstep, as in Parachute.
- 25 November 2026, the reader review (claude-fable-5-2,
  work/reports/reader-review.md). It found the demo's firemen described
  too loosely, the speed's "each new hundred starts faster" false at 100
  and 200, test results on the pages, the keys' silence during a game
  unstated, the miss's sound unclear and the bonus's tone without a
  button, and dates a day ahead. Fixed. Its leads list also pointed at
  miss_start clearing every due flag, now a discovery: a second person
  uncaught at that moment is let off one net (checked on the model; he
  was missed at his next net instead). Declined: pictures on Discoveries (it
  links to How it works), test-pad buttons on Play (the pads are not on
  the case), and marking the chosen row on Graphics.
