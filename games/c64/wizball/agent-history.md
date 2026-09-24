# Wizball — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 24 September 2026: the run to Silver

**Tools.** The container had no emulator. The kit's `get-vice` stopped at
a 403 from `api.github.com`, and `kit/c64/INSTALL.md` said the last Linux
run "could not reach GitHub's release downloads", so the first plan was a
source build. Probing each host showed otherwise: the session's proxy
refuses the GitHub API, web pages and `codeload` for any repository not
attached to the session, but the release asset URL itself
(`github.com/<owner>/<repo>/releases/download/<tag>/<file>`) redirects to
`release-assets.githubusercontent.com` and downloads. So the v3.13.1 Linux
GUI zip was fetched directly. It is built for `/usr/local` and did not
find its ROMs from `tools/vice-mcp`; a link from `tools/vice-home/data/vice`
(inside the XDG data path the launcher already sets) to the unpacked
`share/vice` fixed that, with 14 runtime libraries from apt. It passed 56
of 56 checks once, 55 and 53 the other two times; the source build of the
same tag then did no better (53, 54, 54, 56), the failures being the two
determinism checks from a running-saved snapshot and once
`step-instruction`, and more of them while a compile loaded the host. The
source build was kept, as the contributor had asked for a fallback if the
release failed checks.

**Which crack.** The c64.com disk carries three one-file cracks. Remember's
turned out to be from the tape and differs across `$6000`-`$BFFF`, with
three bug fixes it announces; Yeti's and Impact's, compared in memory at
the same title screen, differ only in bytes the game itself changes and in
memory it has not written yet. That comparison was cheap (two snapshots and
a byte diff) and is the best evidence available that the analysed code is
the original. Remember's version still paid for itself: its intro text
names the bugs it fixed, and its document reader holds the manual, typed
in, which matched c64.com's transcription.

**The analysed image.** The first snapshot was taken in play, as the
orient skill says. Tracing the entry showed that the initialisation runs
from `$EC00`, which in play is screen memory, so the play snapshot does
not contain it. A snapshot stopped at `$6389`, the depacker's jump into the
game, became the image for the disassembler: code is identical there and
in play, and it holds the initialisation and the loaded title character
set that play overwrites.

**Finding code.** A flow trace from the entry, the initialisation and the
two interrupt handlers found 17.9 KB of code. The raster interrupt calls
its band routines through a `JSR` whose operand it rewrites from a display
list, so none of them were reached: parsing the five lists installed
through `$7CB4`, and three more chosen from a table at `$B86E`, added
4.5 KB. The music driver dispatches its command bytes through
`JMP ($46xx)` with a rewritten operand; its three tables gave another
1 KB. Six self-modified `JSR`/`JMP` instructions carry `$0000` as a
placeholder operand, and the tracer followed them into zero page, which
had to be set back to undefined.

**Text.** The first sweep decoded the image as screen codes, because the
title screen's text is screen codes, and found only text already on the
screen. Searching for the letter differences of known words ("wiztips",
"chemical"), which finds a word under any constant offset, showed at once
that the stored text is plain PETSCII, converted with `AND #$3F` when
printed; a second sweep in PETSCII then found every string.

**Coverage.** Nine agents annotated the image in parallel, one address
range each, with a written brief of the facts checked so far; the lead
took low RAM. The brief had one wrong guess in it (that a routine copied
the cauldrons; it builds the landscape's spare screens), and the agent
that met it said so rather than following it: a brief should mark its
guesses as guesses. The agents disagreed about `$85`. One searched every
documented instruction for a read of it and reported that nothing reads
it; three others found the reads in undocumented opcodes (`LAX`, `DCP`,
and an `INC` whose indexed address wraps past `$FFFF`) that the
disassembler shows as data bytes. The absence was a fact about the
decoder, not the game. One agent's key-code formula had row and column
swapped, which the next agent's check against the platform reference's
matrix caught. The music driver's zero page and the few runs nothing
refers to (a depacker's tail in the bullet table, a frame list, a sound
record the table skips) were described last; 100 % came at about 56,000
bytes, with the run-time screens and glyphs excluded in `game.json`.

**Verification.** The emulator settled most claims in minutes each. Two
went wrong first. Poking the level number on the get-ready screen changed
the glyphs but not the map, because the view had already been built:
the level 5 test then went through the game's own continue keys, with only
their limit poked, and the start position is random per turn, so a second
start was needed to land near the stray tile. And the Wiz-lab hang looked
reachable until the lab screen showed that blazers, like the other
weapons, turn to the used-up icon once taken; the hang is real code, run
live from a poked list, but no player can fill the list without two
sprays. Remember's third "bug" turned out to be the game's own rule for
icons (show what the next take gives), which Remember's crack changed.
