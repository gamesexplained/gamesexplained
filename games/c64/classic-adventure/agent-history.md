# Classic Adventure — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 8 October 2026

The contributor attached a D64 and asked for a clean Silver run with
one agent, web lookup allowed, and leave to open the pull request. The
run was in a cloud container with no display: VICE 3.13.2 (vice-mcp)
passed all 57 of `check-emulator`'s checks, and regenerator2000 0.9.20
was built with cargo into `tools/`.

The disk is a transfer of the tape release, one file with a BASIC line
that hides `UPERSOFT` behind DEL characters and a wrapper that moves the
whole file up by `$0340`. Stopping checkpoints on the wrapper's two
halves and on `$12B5` gave the hand-over snapshot. The stale bytes the
move leaves at `$083F`-`$0B9D` were checked byte for byte against the
moved copy before they were excluded.

The inlay, found as a scan on REG-Vault, the game's own help screens
and Wikipedia gave the features list before any code was read. The
inlay names the Pavloda tape loader, which is not on this disk; that row
stays open.

Reading the printer first paid off: the dictionary references, the
`%` marker and the case swap explained every text table. A decoder in
`work/ca.py` then read the vocabulary, exits and both rule tables, and
`work/annot_data.py` wrote one description per record from the bytes,
1,749 labels in all, with the empty records named. The routines and
variables were described by hand.

Three kit scripts broke on the way. `symbols_export.py` and `coverage.py
--live` could not import the C64 client, because `r2000.py` imports its
sibling `ports.py` and the loader did not put its folder on the path.
`codemap.py` recorded the KERNAL's execution under `$E000` as the game's
code, and `check_listing.py` then wanted those bytes typed as code even
though the ledger excludes them. All three were fixed in this branch.

The first walkthrough went the wrong way out of the building (`ENTER`
there leads back to the road); the moves after that were planned from
the decoded exits. Live play then settled the score (150 at most, not
210), the cave closing on a count of 15 objects of any kind, the carry
limit, the dwarf's axe, the blast's three outcomes and the DROP ROD
rule that makes the winning one unreachable.

In verification the features table's darkness row was wrong: it said
the fifth move in the dark kills, read off one walk. A test with the
lamp lit and put out between dark `LOOK`s showed the count is spent over
a life and the fourth description kills. The same pass found by reading
the rules, and then confirmed live, the chained bear that can be taken,
`FEE FIE` never bringing the troll back, two empty messages, and the
score's hundreds digit. Porting the turn counter showed that its carry indexes past
the digits with `X` at `$FF`, which a first reading had taken for the byte
before them; the live test showed the 10,000th command patching the code. The `turns` and spare-variable comments said
"never read"; SAVE copies them to tape, and the comments now say so.

### 9 October 2026: the check, the port and the pages

The independent check of 60 comments (seed 20261008) found the 40 by
hand right and 3 of the 20 by the decoder wrong, all one sentence of
the action-list template: the lists store the actions that end a rule
without an argument byte, which the engine's two-byte stride had hidden.
The template was tested against all 452 lists, the decoder fixed, and
the 323 comments it changed sent to the disassembler, rebuilt from
`symbols_import.py` after a container restart. That rebuilt session
exported the six KERNAL calls under system names where the first export
had automatic ones (#260).

The interpreter was ported routine by routine into `work/adventure.js`,
which `work/inline.py` copies into the pages, and `test_play.js` runs it
beside the game's code on `cpu6502.js`, with the KERNAL's line, screen
and tape routines answered by hooks. The first version agreed with the
game on random commands and missed the boundaries; aiming the jiffy
clock at the chance thresholds and poking the turn and score digits to
their carries made the test reach them, and 504 sessions, 137,126 lines,
were identical. The pages run the same port: a rule inspector on the
How it works tab, six demonstrations set up as play would leave the
game, the score routine on ticked objects, the room browser and the Play
tab.

### 9 October 2026: scrollback, a walkthrough and the map

Asked for after the merge of #261. The screens keep the lines that
scroll off their top. The walkthrough on the Play tab was planned in
node on the port, with a breadth-first search over the exit table and
the rule moves, and then played on the port with a trace: the first
plan failed at the closing, because arriving in room 15 with flag 12
set moves the player to room 115, so the last leg goes to room 14 and
then DOWN. Typing XYZZY gave "I dont understand!": the vocabulary keeps
four letters and spells the word XYZY. The route of 193 commands closes
the cave at 150 without testing a chance condition, and `test_play.js`
now plays it, with the six commands that should win, beside the game's
code; 505 sessions, 137,621 lines, were identical.

The map was first laid out by a directional force layout, which left
the all-different maze floating and crossed most lines; the rooms were
then placed by hand around the loop from Bedquilt through the giant room
and back, with the lines bent away from rooms they would cross and the
labels placed by a script that scores overlaps. The SVG is in the page;
`test_map.js` holds its lines, its lit rooms and its treasure marks
against the exit table, the rules and the starting objects.

