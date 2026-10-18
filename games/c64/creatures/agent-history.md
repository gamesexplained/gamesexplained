# Creatures — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 13 October 2026: images, tools and the route

The two G64 sides came from the C64 Preservation Project's collection
(`orientation.md`). VICE v3.13.2 (Linux release) passed all 57 emulator
checks. `apt-get install` failed until `apt-get update` had run.

Side A boots to the title, which loads `GAME`; the game asks for side B
and loads one file per stage. Playing to every stage was not practical,
so each part was reached from the part before by setting the stage
number `$12A2` to one less than the stage's own, X to 0, and the program
counter to `stage_next` (`$14AF`). A first attempt that jumped to `$14AB`
with X set took the attract block's path and fell out to BASIC. After a
snapshot load the first file request sometimes failed into the "insert
side B" prompt; a fire press retried it. The route stopped in the witch's
shop after every level file, and pressing fire blind there bought
weapons: a script that finds EXIT by its screen codes and selects it
replaced the image comparison that had missed it.

VICE hung more than once while routes jumped into the loader (at `$496A`
after a skipped range, at KERNAL `$ED5D`); `tools.py stop vice` and
`tools.py vice` cleared it each time. The stage-1 route jammed at `$4800`
until it went through stage 0 (`1@`) as the game does. A store checkpoint
on a file's last byte fired early, because the engine writes `$ABFF`
itself at `$335A`; arming it only once the loader at `$4800` had started
fixed the hand-over snapshots.

## The parts and the engine

Comparing the stages' snapshots showed the engine resident at
`$0334-$3FFF` and `$A400-$FFFF`, so it became a part of its own and every
load lies over it. The attract and shop blocks share `$E000-$F1FF` and
are swapped with `$9A00-$ABFF`. An early comparison that called side B's
`1@` block and `LB`'s block "99 % the same" had compared one block with
itself; they are different code and became two parts.

Code maps needed `--under-rom`, or the code at `$A305` and `$E000` up was
dropped. The first trace of the title was dumped after the game had
overwritten it (440 overlaps), and was redone at the first loader call.
The tracer also walked into zero page and into the KERNAL's serial
routines from the loader's `JSR`s; those ranges were set back to
undefined and described at the call sites.

Two disassembler sessions started at the same moment took the same port
(3001, later 3003), and the second failed with "Address already in use";
started one after another, each part got its own. A scratch script
named `typing.py` in the working folder shadowed Python's module of that
name, and every later script that imported PIL failed until it was
renamed.

## Annotation

One agent annotated all fifteen parts, the engine first. Many first
readings were wrong and were corrected against the bytes before export:
what were called "collision groups" are sprite attribute bitmaps, a
"kind" is a sprite frame, an "explosion" a colour cycle, two "animation"
bytes the x and y movement scripts; an object's "lifetime" is a wake
delay and its "alive" flag an awake flag; three "potion creature" sprites
on the Get Ready screen are a marker; the raster chain starts at line
`$F9`, not `$36`; a "first sprite multicolour" was `$D026`, the second.
The death tune is at `$BC2B`, not `$2BBC`. Tables whose ends were
guessed were measured instead (the colour lists, the title's fades),
and two claims that "nothing refers to" a byte turned out to have
readers.

Level files carry tables in fixed formats, so their spawn records and
scripts were described by a generator from the bytes. Its first comments
read "takes 1 frames" and printed hit points one too high; the template
was fixed. Comments it wrote where no label stood counted for nothing in
the ledger, and needed labels of their own.

The listing's report of loaded data that no label reaches had never run:
it compared a listing's snapshot with a hand-over only when the two were
different files, and every part's listing was built from its hand-over.
Run by hand against the play snapshots, it found about 60 KB outside the
count at 100 %: sprite blocks reached only through pointers, the panel's
shapes, characters and leftovers. Labelling them took most of a session.
A label of my own on `tile_addr_hi` had also reached a kilobyte, through
the strings at `$B0C0` and the tablet's shapes at `$B100`, and counted
them under the tile table's description. `listing.py` now runs the
report on the hand-over itself (`kit-feedback.md`).

## Verify

Every part has a `facts.md`. The sample of 80 comments (seed 20261014),
checked by an agent that wrote none of them, found 11 wrong, 13.8 %; the
eleven and the 123 other comments that shared their beliefs were
rewritten (`facts.md`, "The listing's error rate"). Writing the facts
caught more of my own: a variable "nothing else sets" that `stage_start`
sets every life; the broom does not itself kill; second stages share all
the tunes; the shop tune lives in the engine at `$F300`.

Live tests: Clyde's spare hit (`$12A0`), the pause, the music toggle, the
title cheat's grey fuzzies, the reset that wipes the game. The C64-Wiki's
`POKE 7328,208` hangs the game at the first lost life (`features.md`).
A first test of the spare hit entered `player_hurt` by setting the
program counter and left Clyde stuck dying; it was replaced by walking
him into level 1.1's creatures.

## The minisite

The creature gallery is a port of the engine's animation routine,
checked frame by frame against the engine in the simulator over every
script (`test_gallery.js`). It passed while two creatures on the page,
world 2's swelling ball and level 2.1's end creature, were wrong: the
test started every object animating, and those objects' spawn records
start them stopped, a shot giving each one step. The test now also
runs those objects stopped, as their records start them, and shoots them. Building the gallery also
found three scripts whose last bytes no label reached, so the listing
left them out; `listing.py` now names such short holes.

The chamber widgets show recorded frames. The capture script loaded
three chamber snapshots all named `play.vsf`; VICE refuses a second file
under a name it has loaded, the script went on, and all three captures
were the same machine. Chamber 3's first capture, from a route that had
skipped chamber 2's exit, drew a broken panel: the chamber flips eight
engine branches, which the skipped exit restores. The chamber's own Get
Ready snapshot gave a clean one. The first box for the gunner was drawn
on empty floor at the left; he stands at the bottom right.

The copy pass corrected the draft: a rescue pays two potion creatures of
each kind, six in all, not six of each; the shop comes before every
stage after the first; Clyde's surname is Radcliff. The music player is
a port of the game's driver, checked write by write against the engine
(`test_music.js`).

The stage maps on the Maps tab came after the first draft. Matching the
emulator's screen to the map on level 1.1 put a record's creature at map
pixel S + byte 5 - 80, and a run of level 1.1 with the landscape forced
to scroll read all 114 records where the map put them. The same run of
level 2.1 read 49 of its 96: the main loop was making one pass every two
frames. Clearing `$126C` and the objects did not help; the snapshots of
world 2 and 3 had been made from a route that skipped chamber 1's exit,
`torture_leave`, and with its writes made first the stage ran a pass a
frame and read every record. The live facts taken from those snapshots
were screenshots, which the pass rate does not change. Level 3.2's run
lost Clyde on the spikes, which jump into engine `player_hurt` past the
RTS that kept him alive elsewhere; that run switched the spikes off. The
six runs are the fixture of `test_maps.js`. The band colours the runs logged at
every record matched the map's sets, and showed that the engine's
comments on them were wrong: `$12BE`-`$12C2` said background colour and
are multicolour 1, and the next two runs of five said only "second" and
"third" colour. The raster routines that write them (`raster_band2` and
the others) confirm it, and the 15 comments were corrected.

The witch's shop widget came next. The run's two shop snapshots, 
`shop-screen.vsf` and `shop-entry.vsf`, both held the Get Ready screen after
it; the shop itself was reached from level 1.1's play snapshot with side
B attached and fire at the disk prompt, in a freshly started VICE,
stopping at `shop_start` (`$E500`). The two frames recorded there first
drew wrong in `frame.py compare`: the witch's sprites were drawn from
the wrong memory, because `frame.py` took the RAM under a banked-out
KERNAL for an Ultimax cartridge, and the digits between lines `$5A` and
`$CA` were the wrong way round, because the shop inverts them mid-frame
and the capture held only the end state. Both were fixed in the kit
(`kit-feedback.md`), and the frames then matched to the pixel. The
page's message box, run on the shop's own code, first differed from the
emulator's record by two frames in which a big box was half drawn: the
record was read at the end of the emulator's frame, while the main
loop's box step, which starts at line `$F4`, was still running. Read
where each pass of `shop_loop` ends, the record matched the page run for
run.

The ending widget runs the ending's code from the listings in a small
machine on the page. Its first frames drew the text screen and the
scenes, and the scenes' 2,452 passes matched the emulator's record from
the first run, but the colour splits came early: 33 cycles on the
shack's ground line, 52 pixels wrong. The page's 6502 had every cycle,
where the video chip takes the bad lines' and the sprites' from the
processor. With `kit/c64/machine.js`'s model of those cycles copied in,
the shack's frames matched VICE's pictures to the pixel and the
village's but for 4 pixels where the cliff's colours come in. Making the
interrupt wait for an instruction's last cycle but one moved that split
two cycles late instead of one early, and was left out. The emulator's
own snapshot of the hand-over has no text font at `$D000`, so the text
screen was checked only on the page, whose memory comes from the
listings.

On 14 October 2026 the kit moved secrets, quirks and bugs to a
Discoveries tab of their own (`70-minisite`, "Discoveries"). The five
`Secret:` sections of How it works and the rescue's from Maps moved to
`discoveries.html`, with three findings that had sat inside other
sections: the witch's line for no lives, her unread message 4 with the
five sound effects nothing asks for, and the ending's border stripe in
`frame_music`. The sections they came from link to them.
