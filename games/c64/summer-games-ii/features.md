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
| Title screen: the EPYX logo, SUMMER GAMES II and the six programmers' names, © EPYX INC. 1985 | live | part `title` |
| "Bummer Games II" title: F3, DEL and cursor down pressed before the title appears | open | part `title` |
| Opening ceremony: the torch bearer runs up the steps and lights the flame, white doves fly up and out (Zzap!64: "to the sound of the Olympic theme") | live | part `opening` |
| Menu of nine options: compete in all, some or one event, practise one, number of joysticks, Summer Games 1 events (yes/no), world records, opening and closing ceremonies | live | part `menu` |
| Up to eight players, each typing a name and choosing one of 18 countries by its flag (one is Epyx's own), each with its anthem | live | part `menu` (the flags scroll a page at a time) |
| "IS THIS CORRECT?" after the names, A) YES B) NO | live | part `menu` |
| Two joysticks: whichever player presses fire on a stick uses it (Zzap!64, as in Pitstop II) | open | |
| World records saved to the disk; practice scores are never saved | open | |
| Awards after each event: names, countries and scores in order; gold 5 points, silver 3, bronze 1; the gold medallist's anthem | open | |
| Champion ceremony after all the events: the runners-up first, then the champion and their anthem | open | |
| Closing ceremony: a jet-pack man flies in as the sky darkens to *Ride of the Valkyries*, the floodlights come on, the flame dies, the Epyx blimp passes, fireworks to the *1812 Overture* | open | part `closing` |
| Summer Games 1 events: with the first game's disk, its eight events join these for sixteen | open | the module table lists six modules on a third disk |
| **Triple Jump**: fire starts the run; right for the hop and the step, left for the jump, up in the air for lift; a fault for overstepping or a late move; three jumps in competition; an instant replay on a monitor | open | part `triple-jump` |
| **Rowing**: fire starts; left lifts the oars, right pulls them through; 250 metres; split screen, against a computer pacer or a second player | open | part `rowing` |
| **Javelin**: fire starts the run and pressing it again speeds the runner; hold left to set the angle, centre throws; a fault for crossing the line | open | part `javelin` |
| **Equestrian**: fire starts; up faster, down slower, fire a medium jump, right a long jump, left to land; refusal 20 penalties, a fall 6, a second over 50 seconds 1; out over 100 seconds or 99 penalties | open | part `equestrian` |
| **High Jump**: choose the bar (1.50 m up to 2.50 m); right starts and speeds the run, up and down move the run-up line; fire jumps, up clears the bar; three tries a height | open | part `high-jump` |
| **Fencing**: stick alone defends, with fire moves or attacks; green light a hit for the player, red for the opponent, both at once counts for neither; five hits or the most after three minutes; a computer fencer at four skill levels or random | open | part `fencing` (the skill menu is live) |
| **Cycling**: rotate the stick clockwise with the arrow that shows the pedals; 200 metres; split screen; *Flight of the Bumble-Bee* | open | part `cycling` |
| **Kayaking**: left and right steer, up paddles forward, down backward; 15 gates, two of them taken backward; a missed gate adds time | open | part `kayaking` |
| Practice: unlimited tries, no records kept | open | |
| "INSERT SUMMER GAMES II SIDE 2 THEN PRESS JOYSTICK BUTTON" before a side-2 event | live | part `resident` |

## Beyond the documentation

Found in the code, not in the manual.

- The loader keeps a table of 20 modules at `$0C47`, twelve bytes each:
  the disk side, where the packed file lands, where it unpacks to and
  where it ends, its entry address and its one-letter name. Six of them
  are on a third disk (side mask 4), the Summer Games modules.

## Open questions

- Which module is the awards ceremony, and which the champion ceremony:
  the `Z` file has two entries, `$17D0` and `$17D3`.
- Does this release save the world records? The 2-disk US Gold copy is
  repacked; C64-Wiki says the original saves every record at once.
