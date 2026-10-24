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

## 24 October 2026, the contributor's follow-ups

The contributor asked for four things after the Silver merged: a plainer
standfirst, the title music chained as the game chains it, a guide to
winning that had been checked, and a Play tab. They also asked for
research on the Phantom, Zoff's pet. The same model did the work, in a
cloud container.

### The Phantom

The booklet's mission briefing warns of the Phantom. Steve Cain of
Denton Designs told Sinclair User (issue 40, July 1985, page 58) that it
was a bug in the C64 version, one wrong mnemonic, which they had taken
out. Copies from archive.org were compared with the tape. Beyond's disk
holds the tape's three files byte for byte. The Yak Society (dated 30
April 1985), TBC, Radwar and TCI cracks, the last also on a compilation,
were booted in VICE to `$4000` and their memory compared over the game's
bytes: all hold the same program, and the differences are in screen
memory and the loaders' leftovers. So no copy with the bug was found.
Two more images, a crack signed Tuerk and one called FCG, never reached
`$4000` in seven minutes of running and were not compared.

### A player for the guide

The guide's route was checked by playing it on the kit's C64
(`kit/c64/machine.js`), the game's own code steered through its own
input. `work/walk/bot.js` points the cursor at an icon and presses fire,
and `work/walk/win.js` plays the route in phases, saving the machine
after each. What went wrong on the way, for whoever drives this game's
icons next:

- The main loop works out the cursor's cell once a round of the icons
  (`$76`, `$77`), and an icon under the cursor sets `$78` to `$FF` while
  it waits for fire. Pressing fire before that clicked the icon the
  cursor had just left. Holding fire after `$78` cleared carried the
  press onto the next screen and beamed the wrong person.
- A click while the main loop was busy (a portrait rolling in, the iris)
  was lost; the player waits for a pass at `icon_poll` first.
- A team icon is disabled for a moment after an arrival, and a movement
  arrow is disabled while its character fights.
- A patrol's route is not its script alone: six guards walk chains of
  scripts (`+5` bit 7, the chain in `+6`), and `+8` holds only the
  script walked now. Hunting such a guard by its current script sent the
  team back and forth across the ship. The player now runs a copy of the
  machine on with no input to see where a guard will be, and waits at
  the first place on its way it can reach in time.
- Zoff was missed at the armoury while the player chose Manto and opened
  the objects screen. Making those choices before Zoff runs, with the
  cursor waiting on the beacon, catches him.

A game played that way from the snapshot of a new game won once. The
recorded game for the page is played from the listing's own memory at
`$4000` instead, so that a test can replay it from what the repository
holds: the start copies the KERNAL's vectors from `$FD30`, which the
kit's C64 does not have, and the copy is stepped over: only the
KERNAL's routines use them, and the game calls those only to load or
save. The control menu waits for a
function key, and without one the demonstration starts when the title
tune ends; F3 is held for ten frames to choose the joystick. Replaying the
recorded joystick gives the same game frame for frame. `test_solution.js`
replays it and holds the Solution tab's table of stages to the game.

### The Play tab

The port is in `port/src`, one file to a part of the game, and runs
beside the game's own code in `kit/c64/lockstep.js`
(`port/test/lockstep.js`): from the first instruction with and without a
key, and from the 82 moments of play `port/scripts/gen-states.js` saves
from the demonstration and the Solution tab's game. What went wrong on
the way:

- The interrupt saves 24 zero-page bytes the main program draws with and
  puts them back. The lockstep took the replayed handler's writes of
  them as its own, and the port drew on with the game's pointers. The
  lockstep now gives such a byte back to the port (case 19 in
  `kit/c64/test_lockstep.js`).
- The portrait roll's raster wait exits onto the head of its copy loop,
  and the lockstep stopped there ten times a wait (case 20).
- Long routines (a screen's drawing, the view map, the frame round an
  icon) hand the page's clock back with `{ cycles: 0 }`, so that the
  controls answer while they run. The lockstep counted each as a stretch
  of the game's work and ran the game on with the input of the moment;
  it now passes them over (case 21).
- The page's clock: each routine's own cycles fitted to the game's
  (`port/scripts/fit-cost.js`, `port/cost.json`), the interrupt's
  routines timed alone, and the video chip's stolen cycles charged by
  line. The clock paid for a long routine all at once and ran past the
  end of the frame (34,000 cycles at the iris); it now pays up to the
  frame's end and carries the rest. Over 3,900 frames the
  demonstration's screens and tunes come within 4 frames of the C64's,
  and the cursor is where the C64 has it on every frame of the Solution
  tab's first 3,000.
- Driving the page's own icons in `test_play.js` met the same timing as
  the guide's player: fire counts only once the icon's frame has been
  drawn (`$78` set to `$FF`), the cursor's cell lags the cursor by a
  few frames, and an icon at the screen's edge is reached at the edge of
  its rectangle, two cells a step.

Porting the code meant reading all of it, and 15 of the listing's
comments said something the port showed wrong; they are corrected in
place, and `facts.md` and the How it works page with them where they had
the same claim (the time lock stops the clock's roll and the ticker
too). The port's own notes had names crossed: Kryxix called "the
general", Manto and Maul's gravestone given to Syylk and Sevrina, the
44th kill called the 34th. The memory decides those (the name tokens at
`$81B1`, the records from `$CA0E`), and the notes now follow it.
