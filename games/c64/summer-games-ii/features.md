# Summer Games II — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- C64-Wiki, "Summer Games II", https://www.c64-wiki.com/wiki/Summer_Games_II,
  read 17 November 2026 (credits, controls per event, the scoring, the
  "Bummer Games II" easter egg, the versions)
- Wikipedia, "Summer Games II", https://en.wikipedia.org/wiki/Summer_Games_II,
  read 17 November 2026 (credits, release, ports, reception)
- *Zzap!64* issue 5, September 1985, pages 16 to 18, the review (97 %,
  Gold Medal), from the OCR text of archive.org's scan,
  https://archive.org/stream/zzapp_64_issue_005_600dpi/Zzap640005Hi_djvu.txt,
  read 17 November 2026 (each event's controls and screens, the awards and
  champion ceremonies, the music of the closing ceremony and of Cycling)
- The game's own screens, from this run's emulator sessions

## Features

| Feature | Status | Where |
|---|---|---|
| Title screen: the EPYX logo, SUMMER GAMES II and the six programmers' names, © EPYX INC. 1985 | live | part `title`: a multicolour bitmap shown for 1280 frames, about 25 seconds, or until a joystick moves or fires |
| "Bummer Games II" title: F3, DEL and cursor down pressed before the title appears | traced | part `title`: the entry reads the keyboard's first column, and with exactly those three keys held copies a second picture over the first; the two bitmaps differ only in 71 bytes, the first letter of SUMMER |
| Opening ceremony: the torch bearer runs up the steps and lights the flame, white doves fly up and out (Zzap!64: "to the sound of the Olympic theme") | traced | part `opening`: the bearer runs left across the stadium and up the steps, five lighting poses at the cauldron, then eight doves climb and drift away; a raster split at line $6E gives the doves the upper screen's sprites and the bearer the lower's; a three-voice tune of its own; a joystick press ends it, but only after a release |
| Menu of nine options: compete in all, some or one event, practise one, number of joysticks, Summer Games 1 events (yes/no), world records, opening and closing ceremonies | live | part `menu` |
| Up to eight players, each typing a name and choosing one of 18 countries by its flag (one is Epyx's own), each with its anthem | live | part `menu` (the flags scroll a page at a time) |
| "IS THIS CORRECT?" after the names, A) YES B) NO | live | part `menu` |
| Two joysticks: whichever player presses fire on a stick uses it (Zzap!64, as in Pitstop II) | confirmed | Triple Jump `$B182`, Rowing `at_start` `$A304` (the bottom lane's player presses first) |
| World records saved to the disk; practice scores are never saved | traced | menu `check_record` `$1886` saves through the loader for events 0 to 7 when the winner's score is at least the record; practice never reaches the results |
| Awards after each event: names, countries and scores in order; gold 5 points, silver 3, bronze 1; the gold medallist's anthem | traced | menu `show_results` `$176C`: sorts, FAULT for a zero score, ties share a place, points from `$14AD`, the winner's flag waves |
| Champion ceremony after all the events: the runners-up first, then the champion and their anthem | traced | menu `$1101`: lines from last place up, then the winner's flag and anthem |
| Closing ceremony: a jet-pack man flies in as the sky darkens to *Ride of the Valkyries*, the floodlights come on, the flame dies, the Epyx blimp passes, fireworks to the *1812 Overture* | open | part `closing` |
| Summer Games 1 events: with the first game's disk, its eight events join these for sixteen | open | the module table lists six modules on a third disk |
| **Triple Jump**: fire starts the run; right for the hop and the step, left for the jump, up in the air for lift; a fault for overstepping or a late move; three jumps in competition; an instant replay on a monitor | traced | part `triple-jump`: a FAULT for overstepping, a late hop or step, or passing the line; three rounds, best kept; in practice ANOTHER JUMP? with Y and N; the monitor plays its animation and the crowd cheers for 15 m or more |
| **Rowing**: fire starts; left lifts the oars, right pulls them through; 250 metres; split screen, against a computer pacer or a second player | traced | part `rowing`: each lane follows its own boat; the stick, read every fourth frame, steps a 16-phase stroke and only phases with the oars in the water add speed; the pacer's skill rises while it trails; 3 minutes is a FAULT. The 250 metres is not in the code's units |
| **Javelin**: fire starts the run and pressing it again speeds the runner; hold left to set the angle, centre throws; a fault for crossing the line | traced | part `javelin`: each new press of fire adds speed, to 31; left starts the throw, and while left is held the angle rises in steps of 9 degrees to 90 (right lowers it); the javelin is let go at a fixed frame of the throw; the line is 16.50 m into the run; the crowd cheers from 48 m |
| **Equestrian**: fire starts; up faster, down slower, fire a medium jump, right a long jump, left to land; refusal 20 penalties, a fall 6, a second over 50 seconds 1; out over 100 seconds or 99 penalties | traced | part `equestrian`: fire then a count from FIVE to GO, up starts and quickens the pace (0 to 4), down slows it; at a fence the course's code and the stick pushed right decide the jump, and left at the landing avoids a fall; refusal 20 faults, fall 6, a fault a second over 50; disqualified at 99 on the clock or 100 faults; after a refusal pulling down backs the horse away |
| **High Jump**: choose the bar (1.50 m up to 2.50 m); right starts and speeds the run, up and down move the run-up line; fire jumps, up clears the bar; three tries a height | traced | part `high-jump`: each tap right adds a quarter pixel a frame to the run, left halves it; fire in a 36-pixel take-off zone jumps, and the clearance is the place in the zone (best at its middle) plus a bonus for speed; up held in the first five steps of the flight, or let go in steps 8 to 10, knocks the bar; a fault for running past the zone; in competition the bar goes 1.50, 1.75, 1.90, 2.00 m and then up 5 cm at a time, left passes a height, and three failures in a row eliminate; in practice the bar is set from 1.20 to 2.50 m and PRACTICE AGAIN? follows |
| **Fencing**: stick alone defends, with fire moves or attacks; green light a hit for the player, red for the opponent, both at once counts for neither; five hits or the most after three minutes; a computer fencer at four skill levels or random | traced | part `fencing`: without fire the stick picks one of nine guards; with fire it steps, thrusts or lunges; a lunge or thrust hits when the bodies are close enough, unless the other's guard is in the same line, which parries it; both hits at once: HITS NULLIFY EACH OTHER; five hits or the clock's 3:00 end a bout; a step past the end of the piste after the warning gives the other fencer a hit; every player fences every other once, or each fences the droid at skill 3 with one joystick |
| **Cycling**: rotate the stick clockwise with the arrow that shows the pedals; 200 metres; split screen; *Flight of the Bumble-Bee* | traced | part `cycling`: every second frame the stick's direction is read as a quarter of the crank's turn (right, down, left, up), and each read in the quarter the crank is in adds 1 to the speed, to 16; the speed falls by 1 on a countdown that is shorter the faster the rider goes; each rider has a half of the screen, the other rider drawn in red at the gap between them; the pacer's skill rises while it trails; the first button pressed at the start decides which joystick steers which rider; the tune plays while the riders wait to press |
| **Kayaking**: left and right steer, up paddles forward, down backward; 15 gates, two of them taken backward; a missed gate adds time | traced | part `kayaking`: up strokes forward and down backward, each stroke on the other side; left and right sweep the paddle to turn through 16 headings; the hull's four sprites touching the bank or a rock stop the kayak; a gate is judged as the kayak leaves it (SUCCESSFUL, CROSSED MORE THAN ONCE, MISSED GATE, FACED WRONG DIRECTION, ENTERED FROM WRONG SIDE) and each fault adds 20 seconds; the time is the CIA's time-of-day clock, and the run ends past the finish or at 9:59 |
| Practice: unlimited tries, no records kept | traced | Triple Jump asks ANOTHER JUMP?; Rowing races once against the pacer and returns to the menu |
| "INSERT SUMMER GAMES II SIDE 2 THEN PRESS JOYSTICK BUTTON" before a side-2 event | live | part `resident` |

## Beyond the documentation

Found in the code, not in the manual.

- The loader keeps a table of 20 modules at `$0C47`, twelve bytes each:
  the disk side, where the packed file lands, where it unpacks to and
  where it ends, its entry address and its one-letter name. Six of them
  are on a third disk (side mask 4), the Summer Games modules.
- The `Z` file on side 2, entries `$17D0` and `$17D3`, is Summer Games 1's
  Freestyle Relay and 100m Freestyle: the swimming events, stored on
  Summer Games II's own disk (part `swimming`).
- The awards and the champion ceremony are in the menu, not in modules of
  their own.
- Rowing's F5 and F3 keys set and clear a flag that nothing reads.
- Javelin's players throw from the last to the first in each round.
- Equestrian's clock adds 3 hundredths a frame, so its 50 seconds take 33 frames each, about two thirds of a real second on a PAL machine.
- The gallop's tune takes its note length from the pace, so the hoofbeats quicken as the horse speeds up.
- Rowing's race clock counts a tenth every 5 frames: real time on a PAL
  machine.
- High Jump's players also jump from the last to the first, attempt by attempt.
- A High Jump fault, a run past the take-off zone, sends the jumper back to the start of the same attempt: it does not count as a failure.
- From 2.45 m on High Jump stops offering a pass: the stick goes straight to the run.
- A High Jump failure is carried over a passed height, so a jumper who failed once and passed starts the next height on their second attempt.
- High Jump's crowd roars louder the higher the bar: the cheer's volume is half the bar's height above 1.00 m in 5 cm steps.
- A Fencing bout level on hits when time runs out goes to sudden death: both set one hit short of the win and a minute on the clock; if that runs out too, BOTH FENCERS ASSESSED A LOSS.
- In Fencing practice the droid's skill is drawn again at random after every hit, whatever level was chosen.
- Fencing holds an unused name, IDIOT (YOU), beside HUMAN (ANY) and DROID (EPX).
- Cycling's race clock counts a tenth every 6 frames, the rate for a 60-frame American machine, so on a PAL machine its times run a sixth short of real time, unlike Rowing's.
- A Cycling player who has been riding for five seconds never comes to a stop before the finish line: however little they pedal, the speed is held between 1 and 2 of the 16, a slow creep forward.
- Cycling still holds an older pedalling rule that nothing reaches: speed only for a stick moved to a new quarter.
- Cycling carries a scrolling ticker for the top row that never runs, and an empty text for it.
- Kayaking times the run with the CIA's time-of-day clock set for 60 Hz mains. A European machine feeds it 50 Hz, so on a PAL machine the clock counts a second for every 1.2 real seconds: in the emulator it moved 16.9 seconds in 989 frames.
- Kayaking's code expects three gates, 6, 10 and 13, to be passed facing back down the course.
- Kayaking would push the kayak with the water's flow, read every third frame from a map at $E000; this release leaves that map empty, so the river has no current, and a kayak left alone in the water stops.
- Kayaking keeps two debugging aids nothing calls: one draws the kayak's position into the clock, the other colours the quarters of the hull that touch the bank.
- The opening ceremony is Summer Games 1's: its code still holds SUMMER GAMES and COPYRIGHT (C) 1983 EPYX, text that nothing shows.

## Open questions

- Does this release save the world records to the disk as it plays? The
  code calls the loader's save; the save was not run in the emulator.
