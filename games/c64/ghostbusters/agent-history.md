# Ghostbusters — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 29 September 2026

**Orient.** The one-load conversion starts with a loader that overwrites the vector at `$0314`
while the drive is still loading; the game's own cold start is `$6000`. The video bank's
contents in the file are leftovers: the start-up clears `$4000`-`$5FFF` and rebuilds it, so the
coverage excludes that range.

**Coverage.** Five annotators took disjoint ranges. The game states are a table of 64 handlers at
`$381A`; naming them `stNN_...` by state number made every later cross-reference readable.

**Verify.** Twenty scripted runs in the kit's simulator (`work/verify/t1`-`t20`). The manual's
"the game ends at 9,999 PK energy" turned out to be the meter's cap: the end is the Keymaster and
the Gatekeeper meeting, which in eight runs from 5,000 happened between 8,495 and 9,999. GOOD
TRY, described online as the ending for having money but missing Zuul, is two men caught by the
Marshmallow Man on Zuul's street.

**The account-number port.** Its first test passed 20,000 cases while the decoder was wrong: the
parser returned its four bytes in reverse, the test wrote them to `$EAC7` in the same reversed
order, the game's decoder then failed the check exactly as the port did, and both agreed on
"invalid". The page's widget showed the printed number as INVALID. The fix put the bytes in the
order `$7505` stores them (`$23` first) and made the test demand a round trip: the number the
encoder prints must decode to the balance it came from, for 10,000 names. A test that compares
the port with the game proves nothing on inputs where both fail; it needs cases that must
succeed.

**Frames.** Four screens were recorded in VICE and match the renderer to the pixel; five more
come from the kit's simulator, recorded with `work/port/game/simframe.js`.

**Time.** The container stopped for about four hours during verify (16:13-20:20 UTC); the
60-verify time includes it.

**Editorial structure, 30 September 2026.** At the steward's request the How it works page
was split, on the model of Chiller's editorial draft, into Overview (the game, its makers, the
six weeks, reception, versions), The city, How it works, Music and speech, and Discoveries
(claims the code contradicts, bugs, what was left in, open questions). Findings were moved,
not rewritten; each lives on one tab and the others link to it. What belongs to the one-file
conversion moved to About, so the tabs describe the game and not one copy of it.

**A second copy.** The steward sent a cracked disk. Run in VICE to `$6000` and compared with
the image: the game's code is the same at the same addresses. The crack lost the compact's and
the hearse's pictures (`$0400`-`$07FF`) and 32 bytes of phrase 3 (`$FD30`, the KERNAL's
vector table written over it), which the two shop screenshots and the speech port showed. Two
VICE scripts run at once against the one emulator drew the same screen into both files; the
pictures were taken again one at a time.

## 3 October 2026

The pages were reworked into the layout of Fist II and Doctor Who: How it works became
Gameplay, Controls, and Graphics, The city became the Map tab, and the sources became footnotes
listed on About. For the Graphics tab the page unpacks the sprite stream at `$B408` the way
`rle_unpack` (`$610B`) does; the result matched every sprite byte held in the nine recorded
frames. The old How it works text said eight shapes were mirrored "for walking left"; the
mirrored shapes are the proton stream's six and the two after them (`$4640`-`$483F`), and the
men have their own left-facing frames, so the Graphics text says that instead. Item 4's shape,
drawn for the first time, looks like the trap with its flaps raised.

## 15 October 2026

The Play tab's car jumped from side to side on the drive while it was
steered. The page drew the last whole frame's registers, the fine scroll
in `$D016` among them, over memory the next frame had already changed,
and `road_scroll_left` and `road_scroll_right` move the road a character
in memory every fourth step. Followed in Chromium over 900 drawings, the
car moved by 6 and 10 pixels and turned back 132 times; drawn over the
memory each frame began with, it moved in steps of 2 pixels and turned
back 4 times, in a drive steered the other way 5 times. The same fault
made the Storm title's message flicker.

Drawn over memory as each frame began, the title's bottom row jumped
right 7 pixels and back 9 every eighth frame: `bottom_scroller_text`
writes the row at line $B8, before the beam shows it from $F3, and the
frame drew the row as it was before. The page now gives each frame
memory as the beam meets it (`C64.videoMemory` in `site/lib/c64.js`):
memory as the frame began, with each change after logged where the game
made it. Over 600 drawings the row moved 0 or 1 pixel left each time,
and the car still moved in steps of 2.

Every 45 frames the title's lower rows dropped about a row and the
bottom row vanished for two frames, before this change too. The title
loop polls for raster line $28 (`$6307`) and then sets `$D011` to $18;
the runtime moved the clock a whole line for each turn of a polling loop
on top of the 7 cycles its raster read takes, so every ninth turn
stepped over a line, and in two frames of every 45 the skipped line was
$28. Those frames kept the $1B the interrupt leaves, and the split at
$C1 then moved the rows below. A turn now moves the clock to the start
of the next line; over 400 frames the write came at line $28 in every
one.
