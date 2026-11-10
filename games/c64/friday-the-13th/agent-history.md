# Friday the 13th — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 November 2026 (Bronze run)

- Linux x86_64 cloud container. The six runtime libraries the emulator lacked were unpacked into `tools/vice-libs` with `apt-get download` and `dpkg-deb -x`, as `kit/c64/INSTALL.md` says.
- A snapshot loaded into the emulator stays paused. The first random-play run sent joystick input to a stopped machine and nothing moved.
- Code was found by recording what ran during seven minutes of random joystick and fire presses, then `r2000.py --seed`. It reached the church, the graveyard and the outdoor scenes, and 8,719 bytes ran.

## 9 to 10 November 2026 (Silver run)

- The thread switched to a proven model for coverage, verify and the pages; the 40-sweep stays recorded on the first model.
- The intro and the game were split into two parts. The disassembler traced the jumps to `$EA31` and to `$0900` into data; both ranges were retyped or excluded.
- Data spans were cut short at the disassembler's boundaries until labels were added every 1 KB.
- The 60-comment sample (seed 1310) found 14 wrong in a detail; all were fixed. While building the pages, the run found and fixed more: the danger clock and the counters beside it are counted on every other pass; the "outdoor fence" routines cover doorways on a building's outer edge; `$08BC` is sprite priority; the score is stored least significant first.
- The reference screenshot `play-church.png` shows room 39; the round starts in room 38.
- Running `round_won` on the kit's processor found the 2,560-point bonus for a round with no survivors. Reading `draw_fear_head` found the calm head at fear 80. A live test showed Jason choosing a dead friend.
- A text dump of the disassembly (`work/code.txt`) taken early went stale as blocks were retyped; read `listing.json` instead.
- Euan supplied a cartridge conversion (.crt, Magic Desk, "STATMAT 2025"). `kit/c64/crt.py` read it; banks 0-7 are the game's 64 KB at their own addresses, so a straight byte compare against the game part's listing settled that the game code matches. Kept in `work/crt/`, gitignored.
