# Turrican — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 17-18 November 2026, Silver run (Claude Opus 5.5, for air)

**Set-up.** A cloud container on Linux 6.18, with VICE release v4.0.0
(vice-mcp) under Xvfb and regenerator2000 0.9.20. The image is the C64
Preservation Project's G64 of both sides (`orientation.md`). The first
snapshot read came back 23 bytes out: v4.0.0 adds a `C64MEMHACKS` module
before the RAM, so `kit/c64/snapshot.py` was changed to find the `C64MEM`
module by name, and the emulator check to read it the same way. Another
run's identical fix reached `main` first, and the merge kept it.

**Parts.** The game is sixteen loads: the engine (with the hero's sprites
from `FT`), the title, thirteen level files and the ending. Each packed
file was unpacked with the game's own unpacker on the 6502 simulator and
matched its part byte for byte. The engine sits at the bottom; the title
lies over it while the title shows, and each level over the one before.
Two kit changes came from this layout. A level's code named an address
after a label in the title, which the level's own load had replaced, so
`parts.py` now names an address only from the part whose load wrote it.
And the hero's last 24 sprite shapes, at `$E000`-`$E5FF` under the
KERNAL ROM, could not be counted by the engine, because the title's logo
lies there while the title shows. This run added a "keeps" row for
them; another run added the same idea as "ranges" on the bottom part
first, so the engine's `part.json` lists them in its "ranges", and the
ledger counts them. Coverage is 100 %,
370,711 bytes in 16 parts.

**Verify.** The checker (Claude Fable 5.2, one agent) marked 8 of 80
sampled comments wrong. Each was one belief, searched for in every part:
178 comments and 8 labels corrected in 14 parts. The live tests are in
`facts.md`: the pause-and-fire walk in 1-1, the ending to the hall of
fame with LEVEL !-!, MR. RETURN, the failed save.

**Pages.** How it works, Levels, Graphics and Discoveries. Every tune and
effect runs the game's own player on the 6502 simulator in the page, and
`test_pages.js` holds each button to the game's player run on the
listing, call for call.

Wrong turns, in the order they happened:

- Drawing the levels' sprites showed eight comments that read the
  game's sprite-mode flag backwards, and the hero's drawing routine gave
  the wheel's sprites the wrong mode and the shield the wrong colours.
  All nine corrected; `facts.md` lists them.
- The page test found the ending's tune drifting from the game's after
  14 frames. The ending's player reads 191 bytes of the engine's code at
  `$1808`, through a 22nd place in its table of sound programs that
  program 18 jumps to. A load watch in VICE on the ending's snapshot
  confirmed it in the running game. The page now carries those bytes,
  and the finding is a `Bug:` section on Discoveries.
- After correcting comments, five listings were rebuilt from `play.vsf`
  instead of the `entry.vsf` they were built from, which changed bytes
  the game changes as it runs (167 in the ending's player variables).
  The page test caught it through the tune bytes; the five were rebuilt
  from their own snapshots, and their bytes match the earlier commit.
  `listing.py --recomment` is the command for a comment change.
- The browser check found eight of the thirteen maps on the Levels tab
  drawn as plain sky: only the first level of each world loads
  characters, colours and blocks, and the page drew the others without
  them. Each level's snapshot showed the blocks and colours identical to
  its world's first level; the page now lays them in, and says so.
- Rereading the leads list against the finished pages found five
  outcomes that no page held. The title's packed logo, the junk rain in
  2-2 and the objects cut short in 1-2 and 4-3 went onto pages; the
  bosses built from sprite columns stay a lead.

**Reader review.** One reader (Claude Fable 5.2), which wrote none of
the pages, read the built site at both widths with every control driven,
against the notes; its report is in `work/reports/reader-review.md`. It
found seven weaknesses and twenty findings missing from the leads list.

What changed:

- Levels: the maps hide writing that no page mentioned, 1989 in 1-1 and
  DTE on its side in 1-3; both are now a `Secret:` section on
  Discoveries, in the two levels' notes, and behind buttons that scroll
  the map to them. Every object in the levels' lists is marked on the
  maps, with the screen each level starts on, and the map opens there.
  The page's reason for leaving the objects out did not hold. Buttons
  find the four 1UPs of 1-1, the pods of 1-2, the junk rain of 2-2 and
  the drips of 4-3, and 2-1's extra row is drawn below a dashed line.
- How it works: a passage on the eleven object slots and the cleared
  records; a switch that draws the block and square lines on the map;
  the weapons table explained, with the grenade's and the mine's own
  rules; the table's bars kept to the phone's width.
- Discoveries: section 01 says that fire ends a pause and has a heading
  that matches the six seconds shown; 02 and 03 state facts about the
  game in place of how they were tested; 05 and 06 (now 06 and 07) link
  the picture they mean.
- Graphics: the explosion's blank gap cut from 25 frames to 6; the
  hero's controls redraw at once (the browser check had read the old
  picture after a click).
- The notes: `facts.md` said the fish gives a short whip back as 0, the
  listing that `$BE9E` is not written; the code at level 2-1 `$6D34`
  stores the length only when it is 22 or more, so the whip comes back
  as whatever that byte held. `facts.md`, `features.md` and the two
  comments now say so. The leads list gained the reader's findings,
  and `TODO.md` holds those that stay.

What was left, each for a reason:

- Graphics' sheets grouped and named by enemy, and a boss assembled: a
  viewer per level's objects is a page of its own; in `TODO.md`.
- Mid-level screenshots on How it works, the speech's words, the
  credits side by side, marks on the ending's tune: in `TODO.md`.
- The ending tune's paragraph and the panel switch's blue rows: read
  again and kept; the table under the player carries the detail.
- The tile figures in 4-1 and 4-2: looked at, not identified; a lead.
