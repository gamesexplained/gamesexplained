# Rick Dangerous — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 12 October 2026, Bronze run (claude-opus-5-5)

The first boot ran into a dead emulator (EmulatorDown on connect); it had
exited since the last session. `tools.py vice` and `check-emulator`
(57 of 57) brought it back.

The second boot autostarted the TAP and sampled every twenty seconds. The
samples showed `WarpMode` 0 from the first one, so the turbo part loaded
at real speed for about four minutes, until warp was turned on by hand.
The game came up on the Hall of Fame; the title screen showed only after a
fire. The later boots turned warp on eight seconds after the autostart
and checked it on every pass.

The hand-over took two boots. The first logged every store to `$FFFE` and
`$0314`. It showed the turbo loader's interrupt at `$E1E2`, two stores
from `$083A` while `$01` was still `$24`, stores from zero page, and then
the start-up's own stores at `$083C`-`$0847`. The second
armed an execute checkpoint on `$0800`-`$0FFF` after the first store from
zero page, and stopped on `$0810`, a `SEI` and a stack reset.

The string sweep's screen-code pass found nothing readable; the text is
ASCII with `@` as padding, which the second pass and a search for words
at any constant offset found. The Hall of Fame names did not show as
strings because they are stored column by column.

The cheat code was read before it was understood: `$0A71` tests bit 3 of
`$DC01`, which looked like joystick port 1 right. The census showed the
game never writes `$DC00`; a live read gave `$7F`, so the same bit is the
2 key. Testing ← and ↑ from the same snapshot showed ← ends the game,
where the manual says ↑.

The first draft of the page said the name was typed; the name-entry code
at `$208A` shows it is picked letter by letter with the joystick, and the
page was corrected before the commit.

## 13 October 2026, to Silver (claude-opus-5-5)

The executed-address map came from a tour of the game driven by a script:
the title, the story screens, every control, the four levels through the
cheat, game over and the name entry. It added 3.2 KB of code the static
trace had not reached, most of it behind operands written at run time: the
object handlers' split tables at `$1D40`/`$1D83`, the stick dispatch at
`$0E64`, the raster handlers' tables and the music's command table at
`$5226`. Four of the map's instructions, `$E5CD`-`$E5D4`, were the KERNAL's
keyboard wait from before the game banked the KERNAL out; they were taken
out of `codemap.json` by hand and the kit's `codemap.py` now names such
addresses.

Coverage was written in batches of annotation files (`work/ann-10` to
`ann-32`): the routines by hand, then generated descriptions for the
self-modified operands, the object arrays' fields and the tracer's symbols
inside described tables. A binary printer was first decoded from `$4150`,
two bytes into its first instruction; it starts at `$414E`.

The first verify sample (seed 20261013) found 11 of 45 hand-written and 2
of 20 generated comments wrong. The commonest wrong belief was the sound
effects' working memory, laid out in the head as two definitions back to
back when the code keeps state and definition per voice; the next was the
sprite paths, written up as the title screen's from their name when their
only caller is the story screen. Each belief was searched for across the
listing and corrected, about 70 comments in all, and the whole listing was
then audited in two halves by fresh agents.

Reading the tile tests for the page's overlay corrected one more: the tile
flag `$80`, first written up as deadly, marks the top of a ladder; `$04` is
the deadly one.

The music player on the page runs the game's own code on a small 6502 core
written for it; it matched the kit's simulator on all 117,097 SID writes of
the seven tunes at its first run.

After the audit a second sample (seed 20261014) went to a fresh checker.
The hand-written comments were nearly clean, 1 of 45; the generated ones
were not, 6 of 20, five of them from the script that described bare
symbols by the nearest label before them. That script's comments were all
rewritten with a stricter rule, and the self-modified-code comments, which
named their routine the same way, were checked by the same test. The bug
in the multiplexer's ninth X bits, which the audit had noticed, was traced
before it went into `facts.md`: nothing writes `$397C` or `$397D`.

The contributor found the first Silver page thin on how the game works, so
six sections were added: the raster lists and the main loop's beat, Rick's
movement, the springy floor, the scroll, the boulder's script, and the
multiplexer with its lost ninth bit. Each widget is a port held to the
game's own code in the simulator (`test_move.js`, `test_trap.js`,
`test_mux.js`). The movement port at first disagreed past X = `$E6`, where
the main loop would already have changed rooms; the test keeps the stick
inside the room. Running `move_rick` showed the tile flag `$60`, labelled
"floor and wall" on the overlay, to be a springy floor found in only two
rows of the maps, and the common floor to be `$48`; the labels were
corrected. The trap scripts answered which trap is the manual's boulder.
