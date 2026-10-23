# Shadowfire — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 22-23 October 2026, one run to Silver

One agent on claude-opus-5-5[1m] did every step, in a Linux cloud
container, starting on 22 October 2026 at 21:30 UTC. The only other
agent was the checker for the `60-verify` sample.

### The image

The contributor asked for the game from archive.org. Two images were
found: the Ultimate Tape Archive's `uta_Shadowfire_1985_Beyond_2440`, a
raw recording of the Beyond cassette with scans of its inlay and
instructions, and a D64 whose disk name and second program (`SHADOWFIRE
TUNER`, 113 blocks) mark it as a crack. The tape was used; the D64 was
never run. One of the archive's screenshots of the item was an HTTP 500
page and was deleted; a fetched page carried an instruction to the agent
in its text, which was ignored.

### Orient

The tape takes about 240 seconds to load with warp on. Its turbo blocks
are not the ROM loader's, and the first decoder written in `work/` took
the ROM loader's own blocks for turbo blocks and read each block's end
address as inclusive. Requiring a 16-byte pilot of `$E3` and reading the
end as exclusive fixed both, and the ten blocks then mapped exactly onto
the hand-over's memory (`orientation.md`).

The search for the hand-over stopped twice in the KERNAL's RESTOR, which
writes the same vectors; stops with the PC at `$E000` or above and the
KERNAL banked in were skipped after that. The last block is a 19-byte
stub that jumps to `$4000`, and a stopping checkpoint there gave
`work/entry.vsf`. Because the start-up copies `$CA00`-`$CFFF` under the
I/O chips and blanks the text screen, the listing is built from the
hand-over rather than from play.

Two things in the emulator cost time. `codemap.py zap` refused while the
stopping checkpoint on `$4000` was still armed (`clear_checkpoints`
fixed it), and left the machine stopped afterwards, so the next joystick
script moved nothing until `vice_execution_run`. The joystick that moves
the cursor is in control port 1; port 2 does nothing. RUN/STOP has no key
name in `vice.py`'s table and is sent as the matrix pair (7, 7).

### Features, text and sweep

`features.md` came from the manual's text at the archive, Wikipedia and
the archive's screenshots. The game's alphabet is its own (digits, then
A-Z, a space at `$24`, `$38` to end a string), with codes from `$80` up
standing for words through a pointer table. A first dump of every word
recursed exponentially through words made of words and hung; limiting
the depth fixed it.

### Annotation

The code is about 14 KB, annotated by hand in files under `work/ann/`
applied with `r2000.py --apply`. Several claims were wrong in the first
drafts and were caught by reading the code again before applying: the
NMI's return address, the F-key scan, the music dispatch's numbering
(tune 0 is the `RTS` at `$1767`), whether moving characters fight, and
"Old game" against "New game" (`$7526` and `$758E`). The data went from 94 % to 100 % through generators in
`work/gen/` that write one comment per record from its own bytes: the
164 locations, the 30 patrol scripts, the 83 pictures, the texts and the
screens. The parts of the bitmap and colour matrix the game draws into
were excluded one window at a time, and the rest of the command panel,
loaded from tape, was included as authored data.

### Verify

Seven things were tested live: the clock passing 00:00 and counting up
with Kryxix executed, the clock's wrap at 99:59, horned guard `$27`
standing still while every other patrol moved, the demonstration ending
by choosing Quit twice (seen four times), the self-destruct running out
after 256 seconds, the mission summary's texts, and the music's arrows
(a third of a second on the up arrow took the pulse width from 0 to
`$11`).

The checker's sample of 80 comments found 14 wrong (`facts.md`, "The
listing's error rate"). Three of its findings became the best
discoveries: the combat routine fills an eight-entry damage table and
reads only entry 0, so every weapon hits the next location as hard as
its own; the search for enemies runs eight records past the end of the
people; and the portrait roll never copies line 0 of each cell. The
annotation had described all three as working, from the code that
writes each table. All fourteen were corrected, with fifteen more that
said the same things.

### Minisite

The pages are built from sources in `work/page/` by
`work/page/build.py`, which inlines the shared blocks from `blocks.js`
into all three. Three ports are held against the game's own code on the
kit's 6502: `test_pictures.js` (83 pictures), `test_music.js` (twelve
buttons, 72,000 frames) and `test_map.js` (all 164 view windows and the
whole map). The music driver gates each note with an `INC` of the SID
control register, and the first probe, which answered SID reads with 0,
played every note silent; the page and the test use the data bus model
in `site/lib/sid.js`. `test_map.js` failed at first because the map
block uses names another block defines: running `sf-data` and
`sf-picture` first and putting what they give on `globalThis` fixed it.

A `vice_snapshot_save` given a `path` wrote nothing: the call takes a
`name` and writes under `tools/vice-home/` (`tool-vice-mcp`, step 4). The
snapshot it was for was not needed.
