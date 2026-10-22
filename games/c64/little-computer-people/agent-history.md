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

**Text, sweep and the shape of the code.** The text turned out to be
plain ASCII drawn with one font, so `30-text` was mostly the parser's two
word lists and its rule table, which read cleanly once the record format
was flipped: five flag bytes come before each word, not after it.

The register census showed traced code at `$D000`: the game runs code and
keeps tables in the RAM under the I/O area, dropping `$01` to `$34` around
each use. The platform's standard coverage rule excludes all of
`$D000`–`$DFFF` as I/O, so the kit gained `coverage.include` to give that
RAM back.

Flow tracing stalled at about 9 KB. The reason was the switch at `$3F0C`,
`$3F11` and `$3F13`: an "on n go to" with an inline table of handler
addresses minus one after every call, and no return. The disassembler had
walked straight into several tables as if the `JSR` returned. A first
parse stopped every table at the first entry whose handler did not decode
cleanly for three instructions. That was too strict, because a handler
can itself open with a switch call and then a table. Accepting a switch
call as a valid ending let nearly every table run to its `$8F0E` entry.
Typing the 103 tables as words and disassembling every handler took
traced code from 9.5 KB to 22 KB.

The activity switch at `$8DC6` was parsed as 32 entries because entry 32
points at `$52D8`, which the parse treated as font. The emulator then
showed activities 40, 79 and 121 running. The table has 128 entries, and
the font is 91 glyphs, not 96: its last five "glyphs" are code, which
the first rendering showed as noise at the end of the table.

**Coverage, in parallel.** With the switch mapped, the image was split
into nine disjoint ranges for nine Opus-class agents, each with its own
annotation log, briefed from `work/BRIEF.md`. They were barred from the
emulator, so the lead used it meanwhile. With every run starting from the
same snapshot, the game repeats itself exactly, so an input's effect is
the difference from a run without it. Live runs showed that the parser's
action codes are activity numbers (letter, fire, greeting and dance),
that "please light a fire" really builds one, and what each CTRL key
starts.

## Session 2 (2026-09-29, claude-opus-5-5): the piano and the talking through the SID model

**A port of the effects driver.** The piano and effects driver was ported
to JavaScript for the site's SID player and run side by side with the
game's own code in the kit's 6502 simulator, on the image rebuilt from
`listing.json`. Three things only showed up in the comparison. The tick's
first instructions (`$B4FB`) touch the SID, not the RAM they were meant
for, so every frame writes voice 3's frequency and pulse low bytes; the
one value read there, from a write-only register, had to be given the same
stand-in on both sides. When the rare path skips a command (`$B371`), the
tick can end with the I/O area switched out, and the harness had to set
`$01` before each tick as the interrupt handler does (`$0725`), or the
next frame's writes vanished into RAM. And a skipped command can send a
stream into zero page, where `$00` and `$01` read as the processor's port.

**The `$FF00` claim was wrong.** Session 1 wrote that entries 96–99 of
channel 1's phrase table (`$B7FE`) hold `$FF00`, `$FF40`, `$FF08`, `$FF00`
and send a quarter of the talking's phrases into uninitialised memory.
The table's bytes say otherwise: those four words sit at `$B8B6`–`$B8BD`,
entries 92–95, and entries 96–111 (`$B8BE`–`$B8DD`) are all phrase
addresses. The comments at `$B7FE`, `$B8C6`, `$B8DE` and
`$B8E6` were eight bytes out, the facts and a card on the page had copied
them, and the simulator confirmed that no call reads `$FF00`–`$FF4F`. All
of them were corrected.


## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data that no label reaches, and the
listing then left out 1,636 bytes (#461), 598 of them undescribed. The
contributor's play snapshots were not to hand, so the route in
`orientation.md` was run again from the same image: `entry.vsf` at the
hand-over `$0340`, and `play-03.vsf` 75 seconds after `RETURN`, with the
person once more in the attic chair. Against the old listing 852 bytes
differ, all of them run-time state: variables, the sound driver's
work areas, the sprite buffers, the frequency table music_start builds,
and operands the code rewrites. The comments that gave a value from
play-02 for one of those bytes now give play-03's too.

Most of the 598 were 19 switch tables. Each activity or sub-machine is
a `JSR $3F0C` or `JSR $3F11` followed by a table of handler addresses
less one; the label sat on the `JSR`, in a code block, so its span
stopped there and the table after it had none. Each table now has a
label and a comment that points back at the machine, whose comment
already listed the handlers. The other 100 were the open white closet
door's frame past `$A000`, where the memory map's edge stops a span.

With the hand-over snapshot, `listing.py` also found the house
picture's colour matrix at `$5C00`-`$5FF7`, loaded with the program
and outside the count as screen RAM. It is now included, with a label
and comments on the cells the code rewrites (the text band, objects,
the stove and the lamp). Four smaller stretches the listing left out
got a type and a comment: `$0E`-`$0F`, the four bytes after
`sprite_bit`, and two unreachable `RTS` bytes at `$20C1` and `$248C`.
