# The Incredible Hulk — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 31 October 2026, one run on claude-opus-5-5, Silver

**Orient.** Commodore's 1984 disk (`questprobe_the_hulk[cbm_1984].g64`)
boots through a BASIC file, the database `SHULK.DB`, a second stage for
the C64 and a third stage in a file named with 16 repeated characters.
The program itself belongs to no file: 45 sectors from track 16, each
byte XORed with `$55`, land at `$5400`-`$7FFE`. A checkpoint on `$5400`
gave the hand-over snapshot, and the first "What shall I do?" gave
`work/play-start.vsf`. The 1986 release in the same collection has the
same 11,263 bytes of program, so one listing serves both.

`kit/c64/screen.py` cannot read a bitmap screen, and the text window is
the bottom five rows of `$0400`, so `work/scripts/play.py` reads those
rows itself. Typing into the prompt dropped keys until each key was held
longer and the script waited for the screen to settle; `\r` through
`vice_keyboard_type` arrives as a character, `\n` is RETURN. QUIT ends at
"Now Hit-Y", which the prompt-waiting loop did not know and hung on.

**Annotate.** The program is a port of Scott Adams's Z80 interpreter:
register pairs in zero page and five routines that take a word from the
bytes after their call. Regenerator 2000's tracer decoded those words as
instructions, and it went on doing so after they had been typed as data,
because a later trace walked over them again; it also followed the JMP
table at `$5503` into the action table and into the KERNAL's RAM. The fix
was `work/scripts/fixargs.py`: type every inline argument after the
tracing, set each resume point to code by hand, and clear the code the
tracer put outside the program. The condition table at `$6118` was typed
as code at first and made false symbols. The database (9,856 bytes at
`$8030`) was typed and commented by a script from its records
(`work/scripts/db_ann.py`, `actions.py`), one comment per action, word,
text and exit, which is the listing's second stratum. A first draft
said track 35's two sectors are free in the block map; they are marked
used, and both the comment and `orientation.md` were corrected.

**Verify.** The live checks ran through `play.py` and `session.py`. The
save-area bug came from reading the directory: A and D point at the same
blocks, which the block map lists as free. Saving to B, then to C, on
fresh copies of the disk showed the new file going into those blocks.
The ARIA password was traced first and then seen live, with the 17
treasures' places poked to room 16. The checker sample (seed 20261031,
80 comments, a fresh agent on the same model that wrote none of them)
found 6 wrong; each was upheld against the code and corrected with the
comments that said the same.

**Pages.** The picture decoder and the room drawing were ported and held
to the game's own code on the kit's 6502 (`test_pictures.js`), with the
drive modelled by hooks on `send_byte` and `receive_byte`. The first
port read the header two bytes early: the file's own length word sits
after the load address. The parser port (`test_parser.js`) failed at
first on the texts, which hold two carriage returns the page had
trimmed, so it reads them from the listing. One frame recorded with
`kit/c64/frame.py` and drawn by the site's VIC model put the text switch
on line 210 and the bitmap on line 265, which corrected the comments at
`$6AB6` and `$6B1C` (they said other lines). Watching the loads at the
three returns from `load_picture` showed items drawn from item 0 up, the
reverse of the comment at `$75F7`. For those loads the disk had to be
attached again after the snapshot was restored
(`tool-vice-mcp/workarounds.md` says so); LOOK does not draw the room
again, so `$1F20` was set to 1 to make it. VICE stopped answering once
and was restarted with `tools.py stop vice`.

Writing the parser box's answers showed that `$63` is cleared when an
action fits or when GET or DROP answers, not when an action has the
verb, so the comments at `$5B06`, `$5B44` and `$5B50` were corrected, and
`$5D9A`'s example ("Ring/RING/") named an item text that does not exist.
A draft of the Discoveries tab quoted the reply to EAST XYZZY from
expectation; run through the parser port it is "Don't know how to
-EAST- something.", since EAST is not a verb, and the page now quotes
GO EAST XYZZY and GO XYZZY, both run through the port.

C64-Wiki answered with a bot check whose page text asked the reader to
play another game; it was ignored, and the wiki has no page for this
game.

## 1 November 2026, claude-opus-5-5, the Play tab and the map

**Play.** The whole interpreter was ported to JavaScript routine by
routine (`play.js`, the page's `hulk-play` block) and run beside the
game's code on the kit's 6502 (`test_play.js`), with the KERNAL's calls
and the drive's fast loader as hooks. The first sessions ran the
demonstration in chunks of 500 polls and passed the step limit; ten a
chunk fixed it. Saved room 1 on the disk holds 255, a room with no text,
so pokes keep rooms to 0-20. The port first exited to BASIC without
reading the raster as the game does, and the saved-game sessions never
restored until each step waited for its own prompt. The page's clock was
fitted to VICE: 110.8 polls of the keyboard a frame at the prompt, and
the picture loads timed with the stopwatch. Those loads hung until the
disk was attached again after each snapshot load, and a `pkill -f` on
the script's name killed the shell running it.

**Map.** The ways between rooms are the exits table and the actions
with command 54, placed by their room condition, or by where the items
they test can lie, or, for an automatic action, where its flag is set.
Drawn six columns wide its labels did not fit between the boxes at the
page's width, so the drawing was turned on its side. `test_map.js` plays
each of the 50 ways in the game's code, and GO with each direction from
every room. A lone direction word is refused ("Don't know how to -NORTH-
something."), so the test types GO NORTH.

**SCORE.** Porting command 80 showed that it never moves the player:
`$56A6` stores the saved room, saves the current one and jumps to
`$5754` with the current room still in A. The Discoveries tab had said,
from the database's design, that SCORE finds the gems from any room. In
VICE, SCORE in the dome with the 17 gems in the fuzzy area printed
"YOU WON!" with no Chief Examiner, and in the simulator SCORE in a room
holding all 17 gave the password and "Stored 0 treasures". The page, the
listing's comments and `facts.md` were corrected.

## 1 November 2026: the solution and Skip loading times

Aaron asked for a switch that removes the wait for pictures and for the
solution under the game on the Play tab.

**Skip loading times.** The port marks its picture waits (`picture:
'load'` for the drive, `'draw'` for clearing, copying, filling and
drawing), and the page skips them while the switch is on. Over the
solution at the C64's pace the loads took 746 seconds and the drawing
230; every REMEMBER NIGHTMARE shows a picture and redraws the room, 16
seconds of loading each.

**The route.** Worked out from the action list rather than copied: the
Hulk's counter (`$1C00`) is his anger, the gas takes one a turn wherever
flag 4 is clear, REMEMBER NIGHTMARE adds two and past three the rampage
puts him in the fuzzy area with flag 4 set. Two REMEMBER NIGHTMAREs in a
row are a way out of the caves, so the ring and the gas outlet were never
needed. The ants attack on the turn after they swarm, so the first command
in their field after the warp is free, and everything there works in the
dark. The warp is the only chance on the route, and the office comes up
one time in five only until visited, so the office is the first warp
part and later warps cannot land there. Two published walkthroughs were
read (ctrl-alt-rees.com's HULK.TXT and the Adventure Gamers one); both
plug the gas outlet and lift the ring instead.

**Play this part.** The page's text tail first read only unshifted
letters, missed "What shall I do?" (its capitals are $61-$7A), and the
fast-forward pressed Return at the restore question for ever. The tail
now reads both ranges.
