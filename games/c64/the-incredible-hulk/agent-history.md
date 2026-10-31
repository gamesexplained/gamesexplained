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
