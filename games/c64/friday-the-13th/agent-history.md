# Friday the 13th — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 9 November 2026 (Bronze run)

- Linux x86_64 cloud container. The six runtime libraries the emulator lacked were unpacked into `tools/vice-libs` with `apt-get download` and `dpkg-deb -x`, as `kit/c64/INSTALL.md` says.
- A snapshot loaded into the emulator stays paused. The first random-play run sent joystick input to a stopped machine and nothing moved.
- Code was found by recording what ran during seven minutes of random joystick and fire presses, then `r2000.py --seed`. It reached the church, the graveyard and the outdoor scenes, and 8,719 bytes ran.
