# Zak McKracken and the Alien Mindbenders — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 5 November 2026: the Silver run

One agent, a cloud container with no display, about four hours from the
contributor's request to the pull request. The checker for the listing
sample was OpenAI's Codex CLI 0.166.0, signed in with the contributor's
ChatGPT account before anything else, running gpt-6-astra at medium
effort. The contributor chose medium because their plan's usage is small;
the run first proposed xhigh, the kit's advice being the strongest model
the account has.

**Images and boot.** The C64 Preservation Project's G64 collection has
the English release as three images: the boot disk and the two sides of
the game disk (`orientation.md`). The boot disk loads `AA` to
`$0400`-`$9FFF`, and the start-up copies seven blocks of it elsewhere:
code into the bottom of the stack page, the interpreter's opcode table
and handlers under the I/O chips at `$D000`, and the user interface
under the KERNAL at `$F0C0`. The heap clear that follows wipes the copy
sources, so no single later snapshot holds everything. The listing's
snapshot is taken at `$043C`, once the copies are done and before the
clear, and the coverage ledger excludes the sources with the address
each was copied to.

**The scripts.** The interpreter's table at `$D000`/`$D100` has 256
entries pointing at 110 handlers, and each lines up with ScummVM's list
for this version of SCUMM. The scripts themselves are on the disk sides
and come into the heap a room at a time. By `15-parts` that is data
fetched into a buffer during play, so the game is one part, and the
scripts are a `coverage.virtual` row, measured by a survey of every
room's file through the game's own resource index: 151 global scripts,
757 objects' verb scripts with their names, and the rooms' entry and
exit scripts, 116,884 bytes in all. Everything the manual describes that
lives in those scripts (the copy protection, the money, the mazes) is
`open` in `features.md`, because nothing decodes them.

**The music's program.** A tune needs sound 1, a resource of 1,078 bytes
of 6502 code, which opcode `$AB` loads into five pages at the top of the
heap, at `$C300`, before it starts a tune at `$C304`. It is native code
the game runs, outside the 64 KB the listing is made from, and none of
the kinds of part fits code that a resource brings into a heap. It is a
second `coverage.virtual` row, and the How it works page runs it on the
kit's 6502, but nothing describes it a line at a time.

**Annotation** went subsystem by subsystem, the interpreter and its
handlers first, then the sentence line, saving, the raster interrupts,
walking, costume drawing, the keyboard, messages, walk boxes, rooms,
scrolling, the disk, sound, the heap and the interface, to 30,112 bytes,
100 %. The game banks the I/O chips out to read its tables at `$D000` and
`$D3B0`, so the `io` rows in `game.json` mark those instructions as RAM
reads; without them the sweep counts them as chip registers. The
disk code reads and writes the serial bus at `$DD00` bit by bit. The
platform reference names the video bank bits of that register and not
the bus lines. The KERNAL's own line routines (`$EE85`-`$EEA9`) set and
clear bits 3, 4 and 5 and read bits 6 and 7, as the comments have it;
which of the lines is the clock and which the data rests on no source
the kit holds.

**Verify.** Codex checked a sample of 60 comments (seed 1105) and found
11 wrong, 18 % (`facts.md`, "The listing's error rate"). Each finding
held when read against the code. The commonest kind was a claim made for
every case that held for most: "each raster interrupt", "once a pass" for
routines skipped in room 0. The other comments that said the same things
were found by searching for them, and 25 more were corrected.

**The Maps and Graphics tabs.** Rooms are compressed on the disk. The
page's decoder was held
to decode_byte (`$0122`) on every byte of every room, 399,009 bytes, and
the bedroom it draws was compared cell by cell with a frame the emulator
recorded. The costume drawer was held to draw_limbs (`$1DFE`) on every
animation of every costume, twelve frames each.

**Sound.** The players took longest to get right, and each wrong turn
showed itself as a failing test:

- The effects never started. The engine begins the sounds on its queue
  only in a frame after the main loop has finished a pass, when the
  frame interrupt sets `$FC32` (`$12A2`). The page and the test now set
  it as the game does, every sixth frame at the starting speed.
- Every effect ended after one frame on the page. The memory the page
  gives the engine had been measured while nothing played, which missed
  the code that begins a sound; measured again with effects started and
  stopped, the range runs to `$452C`.
- Sound 2 never ended. The use counts in `$753F` count voices only, and
  the sounds below 6 are never counted down, so the page asks the
  channels whether such a sound still plays.
- Sound 36 ended with its filter part still running: the filter part is
  not counted, so isSoundRunning says the sound is over while it plays
  on. The page follows isSoundRunning, as the scripts do, and the test
  lists the case.
- Every button was silent in the browser while `test_music.js` passed.
  The driver used a constant defined beside it on the page, and the
  player's AudioWorklet runs `createDriver` from its source text alone.
  `kit/c64/sid_check.js` caught it. The constant moved inside the
  function, and the test now builds the driver from its text as the
  worklet does, which `kit/skills/c64/steps`, "sound", says to do and the
  test had not done.
- Sound 126 is silent: its parts byte is 0. Its button says so.

**Discoveries.** Two were seen live in the emulator (the pause and the
music through a change of room), three traced in the code, and two read
from the disk and from the sound engine run on the kit's 6502. The walk
bug was written again after find_object (`$0767`) was read a second
time; `facts.md` gives its four cases. A
suspected inventory bug, the last scroll showing three items and a
blank, turned out to be the scroll moving a row of two at a time. Claims
about the game's history that the run could not source were cut from
the copy rather than hedged.

**Tools.** VICE 3.14.0 with its MCP server and regenerator2000 0.9.20
behaved as the install notes say. Full-page screenshots of the built
pages came out blank below the first screen because of the site's
`content-visibility`; screenshots taken a section at a time, with that
style turned off, show everything.
