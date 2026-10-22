# Lemmings — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 19 October 2026, Bronze run (claude-opus-5-5)

The contributor first gave the cassette release, `lemmings.tap`. It booted
with warp on through a loading picture to a code sheet ("Please enter the
6th number on the page featuring the lemming"). The code sheet's routine
compares the typed number with the word at `$A092`, so the run typed that
value and reached the title menu. Pressing 1 asked for "tape 2 side A".

The rest of that file gave FILE ERROR. The contributor then pointed at five
more TAP files, `lemmings0.tap` to `lemmings4.tap`. The game counts sides
in order (tape 1 A, 1 B, 2 A, ...; `$5298` turns the number into the
prompt's digit and letter), which suggests 0 is tape 1 side B and 1 to 4
are tapes 2 and 3. Attached at the prompt, each gave FILE ERROR after
reading a fixed stretch: `lemmings1.tap` stopped at tape offset 42,649
whether it started at 0 or at 112,060, and the other four near 100,570.
A fresh boot from power-on, with the tape swapped at the prompt, did the
same, so the snapshot was not the cause. The tape loader (`$CC00`-`$CFFF`,
KERNAL LOAD through the `$0330` vector) skips a header whose name does not
match and reports FILE ERROR only on a failed read, so the stops were read
errors. Why was not found. The run was about to log every header the
loader compared when the contributor pointed at the disk release instead.

Two things worth knowing for a tape game with several sides: VICE's text
monitor, reached through `codemap.monitor()` in `kit/c64/codemap.py`,
changes tapes (`attach "<file>" 1`), presses PLAY (`tapectrl 1`) and sets
the position (`tapeoffs`), and it reads every number as hexadecimal: an
offset typed as 441050 was set to 4,460,624. A snapshot load does not
move the tape.

The disk set booted to the same code sheet in 40 seconds. Its first stop
after pressing 1 at the title, an execute checkpoint on `$3600`-`$8FFF`,
was `$5006`, the loader's failed-load call. Comparing that state with play
showed only `$5000`-`$5FFF` of the game's load in place, so the hand-over
became the level briefing, saved on screen after all the loading.

The string sweep, a copy of Rick Dangerous's `work/strings.py`, reported
each string one byte late: the game's text is in mixed-case screen codes,
and a capital (`$41`-`$5A`) ends a run of the sweep's letters. The
addresses in `features.md` and `facts.md` were corrected by searching for
each whole string with its capital (`work/mixed.py`).

## 20 October 2026, Silver run (claude-opus-5-5)

The contributor asked for Silver from the disk release only, with the
manual, a table of the levels, the way the screens are built, and the end
sequence.

The two Bronze parts (menu and game, cut by comparing the title with
play) were rebuilt as five: a resident base for the loader and the
variables, and the intro, the menu, the game and the ending over it. The
ending first lay over the game and took the game's bytes as its own; a
resident base under all of them fixed the ownership. Unpacking every file
needed the running XOR the loader applies first (`$CEAA` rewrites its own
EOR's operand); `work/levels.js` then reproduced level 1 byte for byte, but
only once the tune file was loaded before `$500C` ran, since the briefing's
code expects both.

Several first readings were wrong and were caught by the code or the
emulator: RUN/STOP does not end a level (the back arrow does, while
paused); `$CBD2` restores the briefing's code from a stash under the I/O
area rather than saving the level; the bytes from `$CB61` hold code as
well as flags; the intro's band code at `$58DE` is only reached through a
rewritten JMP, so the tracer left it as data until it was declared. The
level tunes first seemed silent on the simulator: a level starts its music
at the first release, in music mode, not at the set-up, which the play
snapshot's driver state showed.

The sample check (`facts.md`) found 7 of 60 comments wrong in a detail.
The exits' byte order was found wrong while drawing the maps, before the
sample: the entrances' layout did not fit the exits' bytes, and the code at
`$1351` reads them as column high, column low, row.

The levels page shows the terrain without the objects (trap doors, exits,
traps, water), which each file draws from its own tables. The browser
extension was not connected, so the pages were checked with headless
Chrome screenshots of the built site (`python3 -m http.server`), with an
isolated profile in the session's scratch folder.

After the first push the contributor asked for the levels' objects, a
working end tune, the sound effects and a graphics overview. The end tune
had been silent on the page, not just its samples: its frame routine never
writes the volume, which only the NMI does, so the page now counts CIA 2's
timer down and runs the NMI itself, and `site/lib/sid.js` gained the 6581's
DC level that makes volume samples heard. The objects turned out to be
ORed into the sprite shapes, not drawn as characters. Drawing them showed
seams every 48 pixels: the stored terrain of every other block is 8 lines
higher, which the maps first drew as it is stored. While building the
character-set view, the panel's set was found at `$7000`, where the page
and `facts.md` had said `$5800`, and the listing's "sprite shapes
`$C0`-`$D2`" at `$7000` turned out to be the panel's characters with four
real shapes at the end; all three were corrected.

## Typed data no label reached (22 October 2026)

#455 made the ledger count typed data that no label reaches, and the
listings then left out 3,831 bytes (#459). The intro's 3,022 were the
bitmap every picture unpacks into, at `$2000`, and the bytes past it to
`$3FFF`: each had a line comment, but the comment sat inside the span of
the picture stream's label before it, so it owned nothing. `$2000`,
`$2DA1` and `$3F40` now have labels of their own, and `$2DA1`-`$2DA8`
turned out to be an eight-byte header in the packer's format before
picture 0's screen colours, like the one at `$E000`. In the game part,
the label the BIT at `$5235` gives `$80A2` cut the terrain shapes' span
short; a line comment at `$80E2` takes the rest. The end sequence's first
15 bytes, two zeros and thirteen `$FF` before the tune's player, are
excluded: a run of the whole end sequence with a watch on them saw
nothing read them before it restarts the machine.

The snapshots were remade from the C64 Preservation Project's G64s,
which give D64 files with the contributor's SHA-1s (`orientation.md`).
Each new snapshot matched its listing byte for byte, except the
resident's three bytes of zero page that change as the machine runs. The
ending was reached by calling the loader's end-sequence entry from the
briefing, which is quicker than winning the hundredth level.
