# Into the Eagle's Nest — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The run

One agent, on `claude-opus-5`, over 26 October 2026, from a tape the
contributor owns. The contributor asked for Silver and said the game
could be looked up online.

## What went smoothly

The tape boots in VICE with nothing special: autostart, warp on, and 220
seconds later the game's own code runs. An execute checkpoint over
`$0E00`-`$CFFF`, armed once the loader had started, stopped on the first
instruction of the game, `$1014`, and that image is what the listing is
built from.

The structure came out of three cheap measurements rather than out of
reading code. A power-cycled machine with nothing loaded, saved beside the
hand-over, said exactly which bytes the tape wrote. VICE's execute record
through a play session said which of them run. The frame recorder said how
the screen is put together. After that the regions were known before a
single routine had been read.

## Two wrong turns worth knowing about

**The character set looked as though it had no letters.** The panel's
cells read `$2E $2F $74 $2D` for KEYS, and those glyphs, printed as text
art from the snapshot, looked like dithered wall tiles. A long detour went
into doubting the screen address and the video bank before the real
problem showed itself: the letters are drawn as holes in a solid cell, and
at 8 by 8 characters of text art they read inside out. Rendering the
character set to a PNG and looking at it settled it in one pass, and
`work/charsheet.py` and `work/screenpng.py` do that for the next run.

**The panel's ammunition was misread off a screenshot three times.** The
emulator's 384-pixel picture draws this font's 9 with a flat top, and it
reads as a 5 at that size. The value in memory, `$99`, with both panel
cells holding `$F9`, is what settled it. A number on a screen is worth
reading out of memory.

## What the sample found

The sample of 60 comments came back with 13 carrying a wrong detail,
21.7 %, well over the mark. Two were serious: the two hand-overs the main
loop makes, the lift and a prisoner brought home, had been written as each
other's job, and a whole range of tile codes had been read as soldiers
when it is the chests. Both mistakes had been copied into several
comments, which is the usual shape of a wrong comment and the reason the
skill asks for every repetition to be corrected together. `facts.md`
records the measurement and `TODO.md` asks for the audit.

The chests turned out to hold the best thing in the game. Shooting a
closed one is a one-in-four chance of anything at all, and on that chance
an even split between 4000 points and the explosion that ends the game.
No source had written that down, and it came out of correcting a wrong
comment.

## The second pass

The contributor read the published pages and questioned six things: the
tier, the floor format, the colour modes, the alphabets, the missing
sprites and the loader, and whether a chest really killed one time in
eight, since they had never been blown up. The session moved to
claude-opus-5-5 for the rest of the work.

The chest odds were wrong. The correction made after the sample had been
written from `$5598` alone; reading `$5528` and `$5CB9` beside it, and
then putting each kind of open chest in front of the player in the game,
showed that a shot only opens a chest and that the explosives go off only
when they are shot again. The first attempt at that test put the chest at
a map address worked out by hand, which was wrong; stopping the machine
at `$5C6A`, where the game has just computed the tiles round the player,
gave the right one.

The drawing was wrong in the way the contributor said. The page's own
tile renderer drew every cell multicolour, while the game draws a cell
hires when its colour is below 8, which is every wall and the whole
panel. The frame rebuilt by the site's renderer had been right throughout.
The pages now draw each tile in its own mode, a Graphics tab takes the
screen, both alphabets and the sprites apart, and the Maps tab draws
every floor tile by tile, with a test that runs the game's own builder.

The Source code and About tabs had never been in the bar, because the
game's own tab list named three pages; `build.py` now always closes the
bar with them.

Following a shot frame by frame found that it is never drawn, and
decoding the tape found what the loader does with the title picture and
what the bytes at `$8C00` are. The floor format was right: the page's
expansion matches the game's map to the tile, apart from what has moved.

## The audit

The contributor asked for the audit so the game could reach Silver. They
are not a maintainer, so it was made unsigned, on claude-opus-5-5, one
checker at a time over five address ranges and then `facts.md`, each a
fresh agent that had written none of it. Of the 667 comments, 205 needed
a correction, about one in three, which is more than the first sample's
rate suggested; the long comments about the figures, the prisoner and
the shots held most of them. Every flagged comment that a checker called
wrong outright was read against the code before it was applied, and the
checks held. The `facts.md` pass found 28 of 114 claims wrong, among
them the shot's "range of five", which is the number of the firing
sound, and the box of ammunition's sixteen rounds, which is `$10` added
in decimal mode, ten.

Halfway through, the contributor questioned the chest widget, which
never showed explosives. The table of random numbers in every snapshot
was a ramp, because the kit's VICE ran with sound off, and with sound off
VICE answers the noise register with its cycle counter. Running the
game's own table builder with the sound chip clocked gave noise, and
odds of about one in seven for jewels and one in ten for explosives.

The sample after the audit still found 5 of 60 wrong, so the
contributor asked for a second round. Five new checkers, told the kinds
of error the first round and the sample had found, corrected 78 more, and
a third sample found 4 of 60, still over the mark. Two of the second
round's findings came from running something: the floor builder in the
simulator put tile `$E4` on the ground floor, not the basement, and the
contributor then asked for `$E4` to be tried in the emulator there. With
the tile under the player the game ended the mission in all three ways
the code has, which the first pass had reported as never firing.

## The port that was a tick late

The music driver, ported to JavaScript for the page, agreed with the
game's own code for 1,802 calls and then drifted by exactly one tick. The
game's end-of-tune routine does not return: it sets the counters and jumps
back to the top of the same call, so the first notes of the repeat are
played in the call that found the end mark. The test caught it; reading
the two side by side had not.

The sound effects went the other way. A port of the nine of them, read off
the code by hand, disagreed with the game on almost every frame, so the
page runs the game's own code for them on the kit's 6502 instead. That is
both more faithful and less work, and the test then checks what the page
adds: the memory it hands over and the entry points it calls.

## The Play tab

The port was written in nine groups, one agent at a time, each holding
its routines alone against the game's own code and then the whole loop in
lockstep with the rest of the game standing in. The last group ported,
the title, the menus and the briefings, left nothing standing in: a copy
of the harness that made every stand-in throw ran 2,000,000 passes
identical under both players. The port's reading corrected 14 comments.

Two players drove the checks. A random stick reached three rooms, so the
explorer was written: it reads the map the game builds, searches it for
the squares it has seen least, and walks there, which reaches 26 to 29.
It never rides a lift, and normal play rarely meets the prisoner, so the
page's test forces the four ends of a mission and, in a second session,
puts the prisoner beside the player. Two kit fixes came out of the
lockstep: stand-ins run on the banking the game keeps, and a replayed
handler gets the SID's faded bus as the game's read it, which a shot
flying off the end of the map had shown.

The pace took three tries. Costs per state made the page 5.6 % slow with
medians and 7.9 % with averages, because what the play interrupt does in
a state follows the play; a fit by the routines each interrupt calls
brought it to 1.8 % on input the fit had not seen. The page also reached
play 28 frames early, because the wipe interrupt was installed inside
the same stretch as the floor's build and ran through it; a checkpoint
at the call put it 2 frames from the game.

The contributor asked for cheats on the Play tab. The game has one, the
name `%MAGGOTS!&`, so the page offers it whole and in its three parts,
each wrapped round the port's routine that reads the flag `$603F`
(`EaglePlay.cheats`). Random play was never walked into by a guard, so
`test_cheats.js` makes the hits through `hit_the_player` itself. It also
found a frame after a door with no key in hand, under the game's own
cheat as well as the page's: both write the key in the interrupt. The
same pass fixed the Maps tab's Size buttons, which the canvas's
`max-width` held to the plate's width.

## Not done

A recorded route through a mission, and the questions in `TODO.md` that
need somebody to play the game further than this run did.
