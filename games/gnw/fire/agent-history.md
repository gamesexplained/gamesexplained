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
