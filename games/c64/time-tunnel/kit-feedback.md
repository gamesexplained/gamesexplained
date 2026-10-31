# Time Tunnel — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": the checker's verdict on what four `pla` take off the stack (`gold_change_room`) led to three more comments with the same belief (`gold_doors`, `gnome_hurt` and `salem_change_room`), and its caller count with the `jmp`s left out (`sprite_alloc`) to a fourth, `object_pick_up`; all were corrected with the sample's 14.
- `60-verify`: "Comments a program wrote, a decoder describing every record of a format": the 179 comments written from the object tables got 20 draws of their own, which found the template's height wrong; the script was corrected and its 89 sprite comments written again from the bytes.
- `70-minisite`: "Check it in a browser": the pictures from `shoot.js` showed the Maps tab drawing the controls' screenshot under every room, which no check and no console message had shown.

## What was changed in the kit

- `kit/scripts/shoot.js`: an element in `main` with the `hidden` attribute that shows all the same, because the page's CSS gives it a display, now counts as an error and is named. The Maps tab here had an `img` with `hidden` and a class with `display:block`, and it showed under every room with no console error. `test_shoot.js` checks it.
- `site/lib/site.css`: `[hidden]{display:none!important}`, so that an element a page hides stays hidden whatever display its own CSS gives the element's class. Checked over every built page with Playwright: four showed the bug, this game's Maps tab and three published pages (Mr Hat's empty `img` laid out under its room canvas, Qix's colour key and Rick Dangerous's key shown before their buttons asked for them). With the rule, `shoot.js --click` finds no error on any of the four, and each page's own code shows the element when it means to.

## Candidates

A movement band written from its thresholds is one line short. The gold
rush's street and Salem's street each cancel a step up when the gnome is
already above one y and a step down when he is at another y or below,
testing the y before the step. So a step that starts at the threshold is
allowed and ends one line past it, and the band he walks in is one line
wider at each end than the two numbers say. Both comments gave the
thresholds as the band, and the checker found both by running the test in
the simulator from each side. `50-coverage` would say: when a test of a
position decides whether a move happens, write the range the thing can
reach, found by running the test from each side, rather than the numbers in
the compares. No other game's notes show the same mistake, so the skill is
not edited.

A page that runs the game's own code can call a routine in a state the
game never puts it in. The Maps tab entered the gold rush's closet with the
arrival flag clear, as for a walk from room to room, and the era's entry
routine read its table of rooms one entry past its end and jumped into the
middle of an instruction, which drew another room's objects. The picture
looked like a room. It was caught only because the closet showed objects
that start in room 4. `70-minisite` would say: before a page calls one of
the game's routines, take the state it needs from the routine's own
callers, and compare what it draws with the emulator for at least one case
of each path. No other game's notes show it, so it stays here.

## Maintainer asks

None.

## What cost the most time

A scratch disassembly of the whole program, made before the disassembler
held the code map, decoded code as data, and a claim read off it ("effect 2
is never played") reached the page until its test scanned the listing; the
kit's references search over the listing (`kit/cpu/opcodes.py --refs`), the
one `50-coverage` names, would have saved it.

## Operating system and tools

Ubuntu 24.04.5 on x86_64, a hosted cloud container. vice-mcp v3.14.0
(`v3.14.0-linux-x86_64-gui.zip`) passed all 57 of `check-emulator`'s
checks. regenerator2000 0.9.20 built with `cargo install --locked`. Node
22.22.0 and the container's own Playwright and Chromium for `shoot.js`.
