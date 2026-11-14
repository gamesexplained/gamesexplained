# Rampage — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": the test of the page's music player ran the game's driver to the end of the second tune's data, where it ran on into the scenery after 1,082 ticks; `facts.md` had called that voice whole, from a parser of the data that sized two commands wrong, and it now says the voice is cut at `$0AFF`.
- `60-verify`: "A control reading zero means the": the checkpoint on `update_sound` that counted 0 in 6,000 frames stood in one batch with `irq_top` at 5,998 and `start_sound` at 66, so "the sound effects' second half never runs" went on the Discoveries page as a count, not as a breakpoint that might have been dead.
- `50-coverage`: "without the search, leave the claim out": the readers of `level` came from `opcodes.py --refs`, every one a list, a colour, a name or a headline, which is what lets the Levels page say that the helicopters, the soldiers and the vehicles behave the same on the twentieth level as on the first.
- `60-verify`: "Prove reachability with inputs, not pokes": the hidden names were looked for in an unattended demonstration before being forced; twelve minutes in warp mode brought down one building of the eighteen levels it would take, so the page says the message is hard to reach by playing and that its picture comes from setting the level by hand.
- `tool-regen2000`: "Code that indexes into I/O mints symbols in the RAM beneath": the symbols `STA $D800,X` left at `$D800`-`$DBC0` sat on sprite shapes kept under the I/O area; they were cleared and the 64 shapes labelled as shapes.

## What was changed in the kit

None. Nothing this run met went wrong without showing itself and was
left uncovered by a rule or a script the kit already has.

## Candidates

A colour read off a small screenshot was wrong three times: rows of the
play screen taken for blue where they are black, and the site palette's
dark blue (`#2e2c9b`) taken for black, twice, in an image viewer. Two of
them reached a draft of the Levels page ("the border is dark grey", "the
weak road is unmarked") before the pixels' values, the border register
and the drawing code said otherwise. No other game's notes show the same
slip, so it stays here. The skill would say, in `70-minisite` where a
page describes what a picture shows: take a colour from the register or
the table that sets it, or from a pixel's value, never from how a
screenshot looks at a small size.

## Maintainer asks

None.

## What cost the most time

No gap in the kit cost this run more than a few minutes; the one change
that would have saved the most is `kit/c64/loads.py` stopping at the
KERNAL's load routine itself (`$F4A5`) as well as at `$FFD5`, since this
disk's loader calls it there and the tool reported no loads, which left
the files' order and addresses to be read out of the loader's code.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04) in a cloud container with no display; VICE
3.14.0 (`v3.14.0-linux-x86_64-gui.zip`) under the kit's launcher, with
the libraries it needs unpacked into `tools/vice-libs` as
`kit/c64/INSTALL.md` says, 57 of 57 of `check-emulator`'s checks passed;
regenerator2000 0.9.20. Nothing to add to the install notes.

The disk's protection passes on some boots only in VICE, as it does for
`games/c64/ik-plus`, whose `orientation.md` this run found the recipe
in. The failure shows itself (the machine resets to `READY.`), so it is
written in `orientation.md` and `agent-history.md` and not in a skill.
`agent-history.md`, "What will not behave", lists the other things that
stopped and said so.
