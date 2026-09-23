# Little Computer People — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## Session 1 (2026-09-22, claude-opus-5-5)

**Which emulator.** The contributor asked first which VICE the run would
use. The machine had three candidates:

- the vice-mcp v3.11.0 release, kept in another clone of this repository;
- the contributor's own build, `~/dev/vice-mcp-fixed/install`;
- a newer, uninstalled binary in that tree's `build-gui/`.

The own build is branch `fixed` at `8a07b08d5c`: the release, plus every
open fix pull request on barryw/vice-mcp (#6, #7, #11 and #14 to #24).
The installed binary is dated 09:35, and the last four fixes were
committed at 09:38. A log string that only `e2f384ab34` adds is in the
installed binary and not in the release, so the edits were built before
they were committed. The reflog shows `build-gui/` was rebuilt while
branches were being switched, so that binary was left alone. Upstream's
latest release is still v3.11.0, so there was nothing to download.
`check-emulator` on the own build: 56 of 56.

The contributor's other clone had an emulator running on port 6510 at the
time. `tools.py vice` would have reported it "already answering" and this
run would have driven the other run's machine, snapshots and all. The
contributor closed it before anything was sent.

`tools.py use-vice` crashed on this fresh clone, because it symlinks into
`tools/` without creating it. A contributor with their own build never
downloads the release, so for them `tools/` does not exist yet. The fix is
one `makedirs` in the launcher (see `kit-feedback.md`).

**Boot.** The image is a crack: a single crunched file, then Mr Z's crack
screen, then the game. The crack screen hands over by itself after a few
seconds. It copies 192 bytes to `$0340` and jumps there, and `$0340` turns
out to be the game's own jump table and variables. The first prompt, the
time of day, ignored `vice_keyboard_type`: the characters sat in the
KERNAL buffer with the count at 8 and were never taken. The game scans the
matrix itself, and `vice_keyboard_matrix` worked first time. The tool has
no name for `:`; row 5 column 5 produced it on screen.

The first steady-state snapshot caught the person off screen. The sprite
registers, sampled once a second, showed the person as a four-sprite
figure moving between samples, so a second snapshot was taken with the
person in view.
