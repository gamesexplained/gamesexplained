# Mercenary — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 25 September 2026: setting up and orienting

The run was a cloud session with no disk image on the machine at first;
the contributor uploaded `MERCENAR.D64` into the session. Their Google
Drive held only `Mercenary III.adf` (the Amiga sequel), so the first
question was which copy and which platform; the upload settled both.

The emulator was the v3.13.1 Linux release zip (with fourteen runtime
libraries from apt), and passed all 56 checks, so no workaround applied.
`check-emulator` leaves the machine paused: the first autostart after it
did nothing until the machine was resumed.

The disk's `MERCENARY` turned out to be a packed one-file build: a BASIC
`SYS` line naming "COMPACKER V2.0", a depacker in the stack page, BASIC's
own `RUN` of the unpacked program (`1999 SYS 2065`), a run-length stage at
`$B98B` that decodes downward from `$CFFF`, and a copy at `$5000` before
the game's start-up at `$7200`. Three wrong turns on the way:

- A stopping checkpoint on `$B98B` fired inside BASIC's ROM while the
  `SYS` line's number was being converted, with `$01` = `$37`; the
  snapshot taken there was useless. Stopping on the `SYS` target `$0811`
  and stepping five instructions reached the real `$B98B`.
- The first hand-over snapshot held leftovers of the previous boot under
  the KERNAL: an autostart resets the CPU but keeps RAM. A power cycle
  (`vice_machine_reset` with `mode: hard`) before the boot gave clean RAM.
- `$5000` was taken for the game's first instruction; it is a copier, and
  the start-up at `$7200` and the two blocks it copies from exist only
  until the second bitmap overwrites them, so the image to read is the
  machine stopped at `$7200`, after the copy.

The pointer at `$0800`, which the `SYS` stub sets by storing `$6C` at
`$0800` before jumping on, is the first script's address: the stub is not
the packer's decoration but part of how the game finds its opening script.

## Features and text

A research agent read the manuals, Zzap!64 and the fan sites in parallel
with the orientation. It reported the Mercenary Site unreachable: its
fetcher upgrades plain HTTP to HTTPS, and the site serves HTTP only.
`curl` over plain HTTP reached it, so its pages were read directly
afterwards.

The string sweep found words ending in a character with bit 7 set, not
whole messages: the messages are token lists over a dictionary. Decoding
the pointer tables at `$2120`/`$2210` took two tries: the words start one
byte after the address the table holds (the printer's index starts at 1),
and words 1-7 are endings printed with no blank before them ("LAND" + "ED").
The one conflict in the documentation that the code could settle at once,
T or P to take an object, went to T (`$970A`).

## Coverage

Twelve annotation agents (the same model as the lead) took disjoint
ranges: variables, the scripts and text, three data ranges, the start-up
and panel, and six code ranges of about 2.5 KB each.

Midway, the emulator had to be restarted: switching it to NTSC and back
for the PAL test left every earlier snapshot refusing to load. The restart
used the bare `tools.py stop`, which also stopped the disassembler twelve
agents were writing to. The session was rebuilt from their logs (each
replayed to its length at the stop, then the rest appended), about ten
minutes lost; the agents were told and went on. The kit now says to stop
the emulator alone.

The agents' first guesses about the data mostly fell: the four tables at
`$2C00` were taken for building pointers and are the roads (the building
pointer is `$2600`/`$2700`); `$2B00` was taken to be per object and is per
square; the fill loop at `$2170` was taken for copy protection reached
after a load, and is the reset trap, which the original disk's `CBM80`
signature arms. Two agents disagreed on script 10 (which branch pays the
500,000); the script's inverted test settled it. The Source tab showed the
script table shifted by a byte, because code reading `$0801,Y` mints a
symbol on the first entry's second byte; `listing.py` now keeps such pairs
whole.

## Verifying

The agents' suggestions for live tests were the best source of findings.
Agent 9 wondered whether E at ground level at 08-08 would give "a free
ride": it does, into the Colony Craft's hangar and up to its deck. Agent 6
noted that the hit follow-up ignores hits outside the player's square: a
first test from the ground failed because the missile sinks into the
ground before it gets there (the level pitch's sine is not quite zero),
and from 1024 units up the building fell with no count and no message.
The TRAITOR sign was checked by flying the bought Dart to 13-04 and firing.
A reader's report in Zzap!64 15 of a crash above a million credits was not
reproduced.

## The minisite

The minisite's widgets were split among five agents: the city in 3D, the
underground, the arithmetic and line drawing, Benson's messages and
scripts, and the flight model. Each ported the game's routines and tested
the port against the game's own code in a 6502 simulator on the snapshots:
the city's view on 18,000 random views, and against the stadium view's
displayed bitmap, byte for byte; the rooms in 2,942 views; the floats on
millions of operand pairs and 4,680 lines; the printer on every frame of
219 messages; the flying step on 1.2 million passes and on a 253-pass
recording of the Dart. The lead wrote the frame, the secrets, the
controls, the opening and the odds and ends.

The ports corrected `facts.md` in a dozen places. The top speeds, first
worked out in exact arithmetic, came out as Zzap!64 13's table to the
digit once the port truncated as the game's floats do. The ceiling
replaces the climb's power of two rather than halving it, so every craft
has a hard top, and the Dart's is ALT 24000, below the Colony Craft.
Room lines are drawn in the ORA form. The model count had counted the
road pieces twice. The rebuilt frame of the descent showed the roads in
the fourth colour, which is how the ORA form on the roads was noticed.
The flight agent pointed out that the other agents' random tests used a
multiplier that loses its low bits in JavaScript's doubles; the tests
were rerun with `Math.imul` and still pass. The flight port also predicted
that reverse thrust lifts a craft off with the nose level, and the
emulator confirmed the heights to the unit.

## 26 September 2026: the 08-08 lift is a bug

The contributor asked where to stand for the 08-08 lift from the ground,
which the page listed as a secret. Taken live from their Novagen disk: the
spot is a patch 1,024 units a side that nothing on screen marks, exactly
north-west of the landing point. They pointed out that the page did not
say what was going on: there is no lift on the ground there at all, and
the game treats the grass as the Colony Craft's deck because the E test
never reads the height. The section was rewritten as a bug, with a map of
the square drawn from the game's bytes, the walk and the monitor pokes to
try it, and the two live tests it needed: walking to the patch from the
landing point by hand, and walking off the deck, which falls safely back
to 08-08. VICE's MCP keyboard presses with an automatic release did not
reach the game's matrix scan; holding the key and releasing it by hand
did.

## 27 September 2026: the Play tab

The contributor asked for the whole game in the browser, the craft that
fly about the world, a native-resolution view beside the faithful one,
and a mod that fills the city with traffic.

The emulator's MCP server did not connect, so the work was built on the
game's own code in the kit's simulator. A C64 around it (raster
interrupt, keyboard, joystick, colour RAM) ran the game from the listing,
counted passes where the main loop begins, and saved moments of play as
states. A research agent listed every mechanic the port would need and
the craft that move by themselves. Nine agents then ported the game's
routines in groups (the view maths, the scene, the objects, the scripts,
the motion, the combat, the panel, the rooms, the opening), each testing
its routines alone against the game's on random states, while the lead
wrote the main loop and a lockstep harness: the game stopped at each of
the port's checkpoints, its interrupts were replayed in the port there,
and all memory was compared at every pass. With every group in and no
fallback left, 11,240 passes from 38 moments of play were identical but
two.

Those two, and three lift-ride starts that drift, were the game's own
races, not the port's. Hooks on the machine showed the panel interrupt
printing one of Benson's figures in the middle of the sky fill, whose
fill byte it shares (the rest of the view left white for a pass), and the lift ride's
interrupt changing the step the main loop was reading, which the game
reads twice for that reason. The port runs its interrupts between steps
and shows the other case; the Play page says so.

The speed took longest. The first model charged each stretch of the main
loop by its average cost and a few per-unit terms; the page then ran
twice as fast as the machine, because its frame loop ran each call to the
next frame boundary and a long stretch carried the clock frames ahead.
With that fixed, and the raster wait no longer lengthened by the
interrupts that fell in it, walking still ran 8 to 14 % slow. Counting
every routine the port called and fitting each one's own cycles on the
machine brought every pass within about 1 %. The kit now carries both
lessons.

In the browser the opening, the landing, buying the Dart, walking,
turning, saving and the sound switch were tried; the native renderer
draws the same scene from the same positions as smooth lines. The mod
borrows object slot 9 to draw its vehicles with the game's routine, tests
the player's missile against them with the game's rule, and answers a hit
with two event scripts of twelve bytes in the game's own byte code; its
first version parked craft on top of the Dart and drew the interstellar
ship among the traffic, and both were changed. Shooting a car in the
simulator gave YOU HAVE JUST DESTROYED, A PALYAR CRAFT, PALYAR SHIP
ATTACKING and the attack ship.

For the new section on the craft that fly without you, the simulator
recorded the attack ship's pursuit of a craft standing still and of one
flying straight, the hired ship's descent (the formula in the code gave
the recorded heights exactly) and two pictures of the brother-in-law's
ship. Some close-ups showed a line of stray pixels at the foot of the view.
Hooks on the drawing routines found nothing drawing there but the fills
and a road: the line is the first raster line below the view, where the
panel's interrupt switches to text, and it came and went with the
viewpoint. The picture was taken from a viewpoint without it, and the
question went into `TODO.md`.
An agent folded the porting agents' findings about the game into
`facts.md` and `features.md`.

On 27 September 2026 the How it works page got its Sound section (#72),
and the steward reported that the lift's hum was missing from the Play
tab. It was not. The port writes every register the game writes (each
store to the SID in the listing has its line in the port), and on a ride
from 08-08 to room 8 the port's gate changes matched the game's code in
the simulator one for one. Rendered through `site/lib/sid.js` in node,
and measured in Chromium with an analyser on the page's output, the hum
ran at about 0.043 RMS for the whole ride, against 0.10 for Benson's tick.
It is quiet by design (sustain 4 of 15) and low (38 to 83 Hz), below what
most laptop speakers play. The same search found one sound that neither
the game nor the page lets anyone hear: the wall sound that `build_room`
starts through `keep_in_room` on the way into a room and closes 33 cycles
later. The model applies a frame's writes at one instant, so a gate opened
and closed inside one frame is silent there as well; on the chip the
attack runs for the time between, which for 33 cycles is nothing audible.

The section's buttons replay the game's register writes frame by frame.
The first version put the forward wipe's high hum and its end at frames 34
and 56, counting the waits; the simulator put them at 33 and 55, because
the first wait ends at the next panel interrupt, which can come in the
frame the wipe starts. The opening's voice 2 turned out to have a third
event after the Novadrive and its fade: the script's own poke of `$81`
into `$D40B` at UNABLE TO CORRECT, the rumble of the fall, which lasts
until the first engine pass after the landing sets its pitch to 0.

## 27 September 2026: smooth motion on the Play tab

The contributor asked for the Play tab at the screen's own frame rate
rather than the C64's four to eight views a second, with the game kept as
it is. Running passes faster was ruled out first: every step the game
takes (80 units on foot, a sixteenth of a quarter turn, a craft's flight
equations, the traffic) is per pass, so more passes a second would be a
faster game. The view is drawn between passes instead, from two passes the
game has already computed: the picture on show and the next pass's eye,
which the game sets before that picture appears. The native renderer
already kept each pass's scene in world positions; it now also keeps what
each object was and where, and the pass's objects are looked up again at
the flip for where the next pass will draw them.

The hard part was when the next picture would go on show. Taking the last
picture's time made turning uneven whenever a pass ran a frame longer, and
in flight every sixth or seventh pass ran five to seven frames longer: its
city_view_update rebuilds the road list when the craft enters a new square
or a new view radius. A harness in node timed every checkpoint of the main
loop, scored each version against the ideal (each picture's eye moving
evenly over its actual time on show, known afterwards), and settled on:
where the program is in its pass and how long the rest took last time, a
rebuild foreseen from the eye's course, and the pace eased over a frame.
With that the worst change of speed from one frame to the next matched
the ideal's, walking, turning and flying, at 60 and 144 Hz.

The same harness ran the page on `main` and on the branch with the same
input, the smooth view asked for a pose at 144 Hz throughout: the game's
memory was identical at every pass, walking (1,221 passes) and flying under
attack (554), with and without Targ Traffic. The view in the C64's pixels
was compared with the game's own frames at the moment of a flip; putting
the ground from row 67 when level (`$AFD5` places the horizon 33.5 double
rows down) and rounding line ends to the nearest pixel brought a level
view to no pixels different and a banked one to within about 3 %. In the
desktop app's browser pane the page drew 121 views a second on a 120 Hz
screen, at about 0.3 ms each. The gun sight, which the native view had
been painting over, is drawn in front of it again.

## 29 September 2026: the pace beside a turned craft

Issue #79 reported the Play tab's cycle model 8 % short in one random
flight, nearly all of it in the object loop (`$85D8`-`$85DB`). The rows
could be taken again in node: the port and the runtime's `MODEL` read out
of `play.html`, the game from `listing.json` on `kit/c64/machine.js`, the
two in `kit/c64/lockstep.js` with the checkpoints, waits and ignored bytes
the issue gives. Flights held level or climbing to the issue's height
(`$07A…`) by a scripted stick came out within 0.1 % over 1,500 passes, so
height was not it. The issue's own input (CTRL + Q, `0`, the stick back
for about 80 passes, then random stick and keys) came out 4.8-5.8 % short
on four seeds, the object loop 21.5-23.5 %: the 80 passes loop the Dart
into the ground at about pass 145, and the player stands where the crash
left it, turned to the heading it had.

Timed per call of `draw_object`, every object was within about 800 cycles
except a turned one: the Dart, 6 vertices, about 7,100 short a draw.
`orient_vertex` turns each vertex of objects 0-15 once for each angle that
is not 0, through `rotate_pair`, and the port counts it (`@rotatePair`),
but the fitted table had no entry for it, so it cost nothing. Measured on
the game's code it adds about 1,125 cycles a vertex (facts, "A turned
object"), and that is the entry added. With it the object loop is within
1 % on the same sessions. On the page's own runtime, from the same moment
on foot by the crashed Dart, 2,000 frames gave 244 passes on the machine, 256
on the page before and 247 after; 4,000 frames on another seed, 442, 461
and 447. A flight with nothing turned in view gave 328 passes on the page
either way (331 on the machine). The issue's own flight could not be
replayed, since its input is not recorded; giving objects 8 and 9 a
heading in a scripted flight showed the same shortfall there (8,460 a
draw) and the same fix.

Left open: on foot at the crash site (02-07) the stretch after the frame's
wait (`$AF7D`-`$85B0`, the flip and the sky and ground fill) runs 2.5 %
short, and in one of the random sessions the lockstep found a single byte
different at the start of pass 291, `$02C2` (vertex slot 2's Y' exponent,
game `$15`, port `$14`), which this session did not explain.
