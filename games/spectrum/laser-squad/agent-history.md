# Laser Squad — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 3 November 2026: the run

A Platinum run in a hosted Linux container with no display, kit 0.0.297,
ZEsarUX 13.0 and SkoolKit 10.1 under `tools/`. The emulator check passed
47 of 50, the three failures the Spectrum notes already record.

**The image.** TOSEC's two tapes of Blade Software's 1988 release: a
BASIC loader, the loading screen, the engine at `$5E28-$B620` and five
headerless scenario blocks of 18,911 bytes, each loaded at
`$B621-$FFFF`. The engine and each scenario became a part of their own
(`kit/scripts/parts.py`), six listings in all; the scenarios share their
header's addresses but each carries its own copy of the computer player.

**The order of work.** The port came first, routine by routine, each
checked alone on moments of play saved from ZEsarUX (`port/test/t-routines.js`:
201 routines, 8,476 moments), then the whole program in lockstep from the
engine's first instruction, with a bot answering every read of the keys.
The listing's comments on the code were written from the port. The
lockstep gave both sides the same made-up values for the refresh
register in the order they read them, so a port that read R once too
often fell out of step at once.

**The pace.** The game runs with the interrupts off and paces itself
with delay loops. The first fit, every stretch weighed the same, left half the
passes of a two-player game
6.4 % off: the long stretches of the computer's turns set the prices of
routines the short passes also call. A fit with tiny weights (1 / (T +
W)) ran for more than 35 minutes without ending; scaling the weights to W
/ (T + W) and capping the inner loop of the least squares fixed that.
The weighted fit (W 2,000) put the two-player game's middle pass within
3.1 %.

**The pages.** The How it works widgets run the Play tab's port on the
scenario as the tape loads it. The blast widget's first readout turned a
bush into a unit: the map still had the squares for placing units, and
the table of units at `$5C50` was zeros, so the blast's redraw of the
units put all twenty at row 0, column 0. Clearing the squares and
building the table the game's way first fixed it (`LSPages.inPlay`). The
names under the cursor were one message off at first: map byte n is
message n + 1, as `scenarioText` takes it.

**Checks that caught slips.** `test_play.js`'s save and load check saved
nothing at first: at the menu between turns the bot pressed fire, which
plays on, before it ever read a key, so the test now holds that menu for
its 2 until the cassette has the save. The route counts on the How it
works page counted truncated routes as missing until a route was taken as
found when it started at the right waypoint.

**Wrong turns.** `pkill -f fit-cost.js` killed the shell command that ran
it, whose own command line matched the pattern, so the edit after it
never ran. A count of the Water Dwellers' charges found none in 12,000
passes and was left out of the Discoveries page; the bug itself is read
in the code (`TODO.md`).

**The plan and the whole map (3 November 2026).** The Maps tab's plan
first drew straight lines between a unit's waypoints, which crossed walls;
running the scenario's own `findRoute` for each leg showed the legs with
no route at all, and a lockstep run with the search hooked showed what a
unit does then: it walks whatever route the last search left at `$5CF0`.
The Play tab's whole map first sampled the machine once a displayed
frame and missed the computer's half-turn, which the runtime runs up to
4,000 frames ahead of the screen; it now samples as the runtime finishes
each frame (`rt.onFrame`) and draws the frame on screen. A tapped arrow
key moved the deploy cursor four squares because the page held each key
for 16 reads and the cursor loop reads four times a move; the page now
lets a key go once the game has read it and a frame has been shown.

## Follow-up: each tile shown once (4 November 2026)

The Graphics tab's last section drew every tile of the scenario, the
units, objects, blobs, bodies, blows and hits again after the sections
above had shown them. Under the minisite skill's rule that a shape is
shown once, it now draws only the tiles no section above draws: the
map's own squares, and those no table names, outlined in red.
