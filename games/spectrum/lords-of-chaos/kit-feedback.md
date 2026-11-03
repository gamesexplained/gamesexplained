# Lords of Chaos — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "search the listing for every comment that says the same, and correct them together": the sampled weapon record that read a weapon's combat and defence as healing and mana had the same reading in all three scenarios' object records and the header's pointer, and the magic bow was called a shield in an engine comment and in facts.md; all were corrected with it.
- `70-minisite`: "Draw every one of them as a picture from the extracted bytes": the Maps page draws the three scenarios whole from their files with the How it works page's renderer, and drawing each route from its bytes put three of scenario 2's routes into a rock wall.
- `60-verify`: "In a game of several parts search every part's listing": the object records' wrong comments were in the three scenario parts as well as the designer's header, and were found there.
- `70-minisite`: "a viewer that asks for every frame finds the shapes the listing missed". Drawing every shape for the Graphics tab left graphics 1 to 4 and frames 165 to 167 with no thing to show them; the search that followed found the cursor's four looks and the sparkle the code starts by writing a frame number, and corrected four engine comments (draw_hit called its graphics things, and the cursor's colour set was not named).

## What was changed in the kit

- `kit/scripts/listing.py`: an instruction at the top of memory whose operand lies at `$0000` (a JR at `$FFFF`, the IM 2 vector, its offset the ROM's first byte) is listed as its byte with a note saying what it is, instead of stopping the build; a Spectrum snapshot holds no ROM, so the operand is not there to list.
- `kit/spectrum/codemap.py`: the trace takes such an instruction's operand from `$0000`, as the Z80 does, and keeps the code it marks below `$10000`; its self-check covers it.
- `kit/scripts/test_listing_top_of_memory.py`: a new test of the listing.py case.
- `kit/lessons/2026-11-03-lords-of-chaos.md`: the run's lessons, the Play tab's among them.
- `kit/spectrum/lockstep.js`, for the Play tab: a byte `readsAt` hands over is the instruction's first read past its operands, so an indexed load (`LD A,(IX+d)`, which reads its displacement first) and `LD A,(nn)` hand over the byte of memory and not an operand; and `countCalls` leaves a class on P alone, since wrapping one broke `new` on the error the port throws to start a panel again. `kit/spectrum/test_lockstep.js` has a test for the second, which fails without the fix.

## Candidates

`70-minisite/play.md`, "Pace it by the machine's clock", says to fit each
routine's own cycles by non-negative least squares. On this game that
left the waits 8 to 9 % short on sessions the fit had not seen, because
the port does 43 of the game's small routines inside their callers and
their time belonged to no call the page prices. Measuring each routine's
own T-states on the game, crediting a helper's to the innermost routine
the port also calls, and pricing the routines whose cost varies by the
work counted inside them brought it to 1.5 % (the lesson has the
figures). The skill would say: price a routine from its own T-states
where the port calls it as the game does, credit the time of what the
port does inside it to it, and fit only what is left. One game has shown
it; a second would meet the bar for a core skill.

A comment saying what sets a routine off was written from what its table
looked made for, and was wrong: the trip squares were said to wake their
creatures when stepped on, when only a change to the square does
(trip_square's callers are use_square and set_terrain_under). It read as
right in the listing and on the draft of the Maps page, and was caught by
a test that ran the game's routine on every square. The skill
(`50-coverage`, where triggers are written) would say: when a comment
names what makes a routine run, list its callers from the cross
references first.

A route table named a waypoint past the end of the waypoint table, and the
game reads the bytes after it without a check. Any decoder or page that
bounds the index hides this. The skill (`70-minisite`, "Maps or levels",
or the decoders in `40-sweep`) would say: read an index the way the
game's routine does and mark one past the table's end, rather than
skipping or clamping it.

A port written as plain functions froze the page where the game spins for
ever: random_below given a limit of 0 draws until a byte is below it, and
the port's `do ... while` did the same in JavaScript, which locks the
browser's tab, where the Spectrum goes on running its interrupt. A
routine test with random inputs hit it (a combat of 255 in strike_hit).
The port now throws `P.Hang` there and the page runs only the clock and
the interrupt from then on, which `test_play.js` holds. `70-minisite/play.md`
would say: a loop with no way out and no input in it throws, and the page
keeps the machine's interrupt going, rather than loop in the port. One
game has shown it.

## Maintainer asks

None.

## What cost the most time

A listing.py and codemap.py that handled an instruction at `$FFFF` whose
operand wraps to `$0000` would have saved the most: every scenario part
ends with its IM 2 vector there, and the listings stopped at it until both
were fixed on this branch.

For the Play tab, the pacing: three fits in a row came out right on the
sessions they were fitted on and wrong elsewhere, each for want of rows
from a path the page takes (the hand-over's menus, the designer, a pause
after a spell). Replaying whole sessions on the page against the game
(`port/test/t-page.js`) is what showed each one; it should be the first
check of a fit, not the last.

## Tools and system

Linux x86_64, a hosted cloud session with no display; ZEsarUX 13.0 under
`tools/zesarux`, driven through its remote port; SkoolKit 10.1; Python
3.13; Node 22.23.4. ZEsarUX resets the machine when a tape is opened with
`realtape-open` after a snapshot has been loaded: open the tape first,
then load the snapshot.
