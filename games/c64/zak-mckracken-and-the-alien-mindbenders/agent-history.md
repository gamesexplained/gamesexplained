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

## 5 November 2026: the music player becomes a part (#771)

The Silver run left the music player, sound 1, as a `coverage.virtual`
row: it is loaded into the heap like any resource, and `15-parts` counts
a buffer's contents as data. Aaron chose to list it as a load part
instead. The loader's code settled it: load_resource writes sound 1 to
`$C300` whenever `$61EF` is set (main `$D4FF`-`$D506`), and
op_music_memory forgets the sound's table entry afterwards, so the place
never changes. The snapshot `music-on.vsf`, saved during the Silver run
while tune 95 played, holds sound 1 there byte for byte except the heap
block's header.

`parts.py add ... main --adopt` made the program's symbol map, listing,
facts and ledger settings the part main; `parts.py add ... music --over
main` added the player with the range `$C300`-`$C735`. listing.py, run
on the music part, says 1,050 bytes of main's code differ in
`music-on.vsf`; they are all in the heap, where `startup.vsf`, main's
listing, still holds the start-up code the heap clear wipes, so the
range is right. The player's 879 bytes of code and 199 of tables were
annotated in one session; the 24 comments were then audited by
gpt-6-astra at medium effort through Codex, which found 4 wrong in a
detail (`parts/music/facts.md`), all corrected. Reading it found the
tunes' cues for the opening's pictures (variable 17), the pitch table's
American tuning, and that the music counts sounds 3, 4 and 5 down
without ever counting them up, which corrected a fact in main's facts.

The page's two players now take the player's bytes from the music
part's listing instead of an embedded copy of sound 1, and the tests
read the parts' listings. The About tab's feature table no longer links
its addresses: in a game of several parts the whole game's files link
only addresses written with their part's name.

## 6 and 7 November 2026: the story, played to the end

Aaron asked for a playbook for exploring a SCUMM game (characters,
places, puzzles, the solution, secrets, names for the bare numbers),
and then for what came in the box. The playbook went into the kit as
`kit/skills/cpu/scumm/explore.md`, with `kit/scumm/world.py` to gather
what each step needs from every script.

Every line of text came first (`work/text.txt`, 1,296 lines), then the
actors, the pseudo rooms and each room's objects. The solution was
written as an input file for the kit's ScummVM a scene at a time, each
scene replayed from the start, and run to THE END on seed 1 with
`--no-copy-protection`: `work/replay/final.txt`, 4,048 lines, about two
hours of the game's clock, 35 seconds to run. `strace.py check` on the
whole trace found no place where the decoder and ScummVM disagree.

What playing it taught, in the order it cost time:

- A click on an object off the screen walks to the screen's edge first.
  In a maze, that point can be a doorway, and the kid walked through it
  into the wrong chamber. The kit's `walkto` now moves the point along
  the edge when an object with a Walk to script covers it. The first
  version avoided every object, which moved the click in rooms where
  nothing was wrong, changed the timing, and so changed the jungle's
  random paths after it: the recorded jungle crossings stopped
  matching. Narrowing it to objects with a Walk to script kept every
  earlier recording.
- The jungle's paths are picked again on every visit, so the crossings
  were played a step at a time from the trace's notes
  (`work/replay/autoj.py`).
- The Lotto keypad takes clicks on its digit objects, not typed keys;
  the draw waits about five minutes of play (bit 1455); the stupidity
  machine takes the verbs away for minutes. Each needed an until on the
  game's own state rather than a pause.
- Mars: the fish bowl suffocates Zak unless it is taped and goes on
  after the oxygen tank; the white crystal is free for a moment, so the
  click on it has to come straight after the button.

The newspaper and the manual were read from the Internet Archive's
scans (`zak-mckracken-newspaper`, `game_manual_Zak_McKracken_Manual`);
the page links to them. The copy protection is explained without its
code table or the arithmetic script 110 uses to make the symbols.
