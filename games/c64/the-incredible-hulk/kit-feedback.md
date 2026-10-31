# The Incredible Hulk — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "The comparison that counts the pixels that differ from the emulator's picture of the same frame is the drawing's test": I recorded the whole frame with `kit/c64/frame.py` rather than drawing the screen from one read of the registers, and the comparison put the screen split on lines 210 and 265, which corrected the comments at `$6AB6` and `$6B1C` and `orientation.md`.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format": I gave the 846 comments generated from the database's records a stratum of their own, drew 20 of the 80 from it, and reported the weighted rate beside the plain one.
- `60-verify`: "search the listing for every comment that says the same": each of the sample's six wrong comments led to the others that repeated it (`word_count`, the word buffer, command 85, the item-word compare), corrected with it.
- `60-verify`: "A test must contain cases that have to succeed": `test_pictures.js` decodes all 70 files and draws 45 rooms, and `test_parser.js` runs 20,202 lines, so that each test fails when the port is broken on purpose.

## What was changed in the kit

None.

## Candidates

- **A widget's answer beyond the ported routine is an untested claim.**
  The parser box ports the command line up to the verb and noun, and the
  test holds that much. Its answer then went one step further, which
  actions fit, and for GET RING it said "No action has this verb", when
  the game's own GET answers the line. Nothing tested that step. It was
  caught by reading the action scan to write the answer. The skill would
  say: when a widget writes what the game does next, beyond the routine
  its test holds, either take that step into the test or have the widget
  stop where the test does.
- **A quoted reply written from expectation.** A draft quoted the game's
  answer to a command without running it through the port the page
  already had, and the quote was wrong. Running every quoted reply
  through the port, or the game, before the copy pass would have caught
  it at once.

## Maintainer asks

- #661: Say whether code a game runs inside the disk drive is counted.

## What cost the most time

Regenerator 2000's tracer decoding the inline arguments after `SETHLI`
and its four sister routines as code again on each later trace; a note in
`kit/skills/c64/tool-regen2000` that typed inline arguments must be typed
again after every trace (or the trace run once, before typing them)
would have saved the most.

## System and tools

Linux 6.18 x86_64 in a cloud container with no display; VICE v3.14.0
(vice-mcp), check-emulator 57 of 57; Regenerator 2000 0.9.20; Python
3.13.17; Node v22.22.0. Nothing new for the install notes.
