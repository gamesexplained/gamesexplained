# Mr Puniverse — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 27 October 2026: the Platinum run

One agent, one cloud session, from about 12:10 UTC. The
contributor (air) asked for Platinum and said yes to everything at the
start: looking the game up, the download, the installs, the pull request,
the issues and the Discord claim. Partway through they asked for PR 585
(`C16.io`, the site's chips for C16 pages) to be used as it went, which
meant merging `main` into the branch at 13:43.

**The image.** TOSEC's C16 set had the original Mastertronic tape and two
alternative dumps; the plain one was used. It is a raw tape with a
Novaload turbo loader, which plus4emu loads in about 42 seconds with
`LOAD`. The loader leaves the BASIC line `0 SYS6900` at `$1001`, so the
hand-over is `$1AF4`, and `work/entry.p4emu` was saved there. Plus/4 World says an older version with a different ending
exists; its cheats do not fit this tape's code, and this tape's do, which
is how the version was told apart.

**Annotation.** The code is small (`$1AF4`-`$340C`), so it was read
through once before any comment was written, then commented routine by
routine. The 25 room records were decoded with a Python port of
`draw_room` that matched the game's own drawing of all 25 rooms cell for
cell in plus4emu; the room comments came from that decoder, as a stratum
of their own in the sample. Two stretches between the tables hold only
the pattern plus4emu leaves in memory nobody wrote, and are excluded
from coverage with that reason.

**Verify.** Every feature was tested live in plus4emu (`features.md`).
A fresh agent checked 80 comments (60 hand-written, 20 room comments) and
found 4 wrong, 6 % weighted; each was corrected with every other comment
that said the same.

**Kit work for the Play tab.** The random cannon picks its side from bit
0 of `$FF1F`, which on TED is the line within the character row being
drawn. The kit's machine did not model it, so it was measured in
plus4emu (`kit/c16/ted_timing.py`) and added to `kit/c16/machine.js` and
`site/lib/c16.js`. The game's interrupt calls the KERNAL's keyboard scan,
which neither the machine nor a page can run without the ROM, so the
scan was written again in JavaScript as `C16.scnkey`, recorded against
the real ROM on 800 cases (`kit/c16/scnkey_record.js`) and held to it,
cycles included, by `kit/c16/test_scnkey.js`.

**The port.** 89 routines, each tested alone against the game's own
routine on 723 saved moments of play; one case, a shot moving into his
block, was wrong at first and fixed. The whole game then ran in lockstep
with a scripted player: 120,000 frames twice, all 25 rooms, every menu
choice, the pokes, the clock and the EGY bar running out and the 25th
vitamin. The script reaches 2,905 of the 2,996 instructions; what it
does not reach is unused code (`old_music_tick`, the two voice 1
routines), a stretch of `update_bridge` (`$2CE4`-`$2D09`) and a few
branches that need positions the script never makes.

**Wrong turns.**

- The page drew the title on black. The lockstep could not see it,
  because the port and the game started from the same memory: the
  listing's, with the KERNAL's bytes below the game added. Comparing the
  page's title with plus4emu's picture showed it. The title's colours are
  three bytes in the tape buffer (`$0339`-`$033B`) that only the load
  writes; with them and `$034B` added to `KERNAL_RAM`, the title matches
  plus4emu to the pixel. (`kit/lessons/2026-10-27-mr-puniverse.md`.)
- The first draft of the pages had wrong facts: the room and panel
  colours, the object tables' start (`$0FE8`, where the switch states
  are, for `$0FF0`), the ladder's character codes, the fall, jump and
  refill sounds, room 18's place on the map, the old tune's rooms and a
  count of the tune's notes. A line-by-line check against the listing
  and `facts.md` before the copy passes caught them all.
- `test_play.js` found the page starting a turn eight frames late after
  F1. The pacing fit (`port/scripts/fit-cost.js`) wrapped `P.N`, the port's
  counts of work, in a proxy to see the counts change, but every group
  of the port keeps its own reference to the object (`const N = P.N`), so
  the proxy saw none of them. The keyboard scan's cycles, counted there,
  were then never taken out of the interrupt's stretches, the fit put
  1,730 cycles on each interrupt, and the page charged the scan twice.
  The fit now watches the object's own properties. Refitted, the page
  started the turn five frames early instead: its runtime counted a pass
  when the port yielded the checkpoint, before its clock had paid the
  stretch that leads there, and the stretch from the refill to the first
  pass draws the whole room. Counted when the clock reaches it, the first
  pass comes in the C16's frame, and a minute of random play gives 443
  passes on both.
- The same test's start plan (RETURN, then F1, as the page's buttons
  press them) never started a game on the C16. With RETURN held from the
  first frame, the C16 waited in `new_game` for the key to be let go, as
  its interrupts had already scanned it, while the page read the key
  code before its first interrupt and went straight on. The port now
  yields a checkpoint at `new_game`'s `JSR draw_lives` (`$3209`), so the
  interrupts come before the read, as on the C16. The plan also waited
  for the title wrongly (for a character the title never shows) and now
  waits for the title's text.

**Copy.** Draft, then the rewrite pass (headings that counted or listed,
"no X" as the subject, a sentence about how the work was done), then the
plain-English pass, with the pages committed between them.

## 28 October 2026: REST ROOM

air pointed out that room 18's walls spell REST ROOM, and that the room
is an easy one, which fits. The run had read the first letter as a B
from plus4emu's screenshot, where the wall tops above the R's middle bar
make the letter look closed. The screen memory plus4emu saved for the
room shows an R: no wall across its foot, the same shape as the R of
ROOM below it. The Discoveries entry, `facts.md` and `features.md` now
say REST ROOM.
