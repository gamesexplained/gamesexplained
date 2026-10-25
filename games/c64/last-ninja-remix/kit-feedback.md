# Last Ninja Remix — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

An earlier run took Central Park, then holding the engine too, to 99.6 %
from an imported analysis. This run made the engine a part of its own,
added System 3's intro, the seven title loads and the six later levels,
and took all sixteen parts to 100 %.

## Skill text that changed what I did

- `15-parts`: "Code that is the same at the same address in every part is resident": comparing the seven levels in play showed `$1000`-`$1FFF` and the status panel the same in all of them, so the engine became a part of its own, listed once, and each level lies over it with the ranges its load writes.
- `60-verify`: "correct them by template in this run, as one claim made many times": the later levels' code is Central Park's at other addresses, so a wrong comment in Central Park was wrong six more times; each was corrected in Central Park and the copies generated again, and the sample's population left the copies out.
- `70-minisite`: "takes the port from the page itself, so the two cannot drift apart": `test_index.js`, `test_discoveries.js` and `test_levels.js` cut the title cards, the credits scroller and the area painter out of the pages and run them beside the game's own routines.
- `70-minisite`: "A section off the screen is skipped": a full-page screenshot came out blank below the first screen, which this explained; each section was then shot on its own to check the pictures.

## What was changed in the kit

- `kit/lessons/2026-10-24-last-ninja-remix.md`: four lessons. A picture widget is tested against the painted picture, not the memory behind it; comments carried to a part that is another part's code reassembled are corrected at the source and kept out of the sample's population; a live test's length is how long it was watched, not how long the thing lasts.
- `kit/skills/core/10-orient`, step 1: a trainer can leave code of its own in the game with its options off, so compare the code in play with another release's and mark what differs as the crackers'. The listing described the end of the engine's interrupt as the game's until an auditor found it in no other release; X-Rated's crack goes from the clock straight to restoring `$01`. It would have mattered in `games/c64/master-of-magic`, whose crack's trainer changes the game's own code (`cheats.md` there).
- The lesson file gains a fourth lesson, on the trainer, and the second lesson a paragraph on carried comments that are wrong on code of the same shape.

## Candidates

- **Test a picture widget on the painted pixels.** The title cards' test compared the play window's bitmap and screen colours with the emulator's and passed while the status panel's lettering was broken, because the panel's colours come from a copy of colour RAM the page had not loaded. `70-minisite` would say: when a widget paints a picture, render it with the site's renderer and compare pixels with the emulator's state painted the same way. No other game folder could be named where a memory test passed over a wrong picture, so it stays here.
- **Check the pairing of a reassembled part before carrying comments.** The six later levels were paired with Central Park by walking instruction streams from unique anchors. Where a level inserts an instruction, the walk could pair the instruction before the insertion's partner with the inserted one: The Street calls `DrawCrossingLight` at `$8A62` and the next six calls were paired one early, and four levels add a call to the main loop just before the hook Central Park also calls, and the hook's comment went onto the added call. The comments carried across then named the wrong callers. Comparing each paired `JSR`, `JMP` and branch's target with the pairing of the target found every such stretch, nine in all; four of them were first put down as the level's own change, until a checker reading those levels' code found the call they had moved past. `15-parts` would say: after pairing two parts' code, check that each paired control transfer lands on paired targets, and where it does not, look at the next instruction before calling it a change. No other game folder has parts made of another part's code relocated, so it stays here.

- **Correct a family's template, not the instances the checker was shown.** The audit gave checkers a template's comments as one item, with up to four instances from different parts. Where they found the template wrong, the corrections were written for those instances, and the members in other parts kept the error: 66 of the 72 condition lists, and eight comments in The Mansion and The Final Battle. The second sample found one of the 66; a search of every member of every family a checker marked wrong, for text the correction had replaced, found the rest. `60-verify` says to correct "every other comment that says the same thing"; it would add: when the comment comes from a template, correct the template and generate again, then search the members for the replaced words. No other game folder audited families this way, so it stays here.

## Maintainer asks

- **Add a kit script that carries a part's comments to a relocated copy of its code** (filed as #552). Six of this game's sixteen parts are Central Park's code at other addresses with their own data. The run wrote its own pairing and carrying scripts in `work/` (about 1,100 lines of Python, with 950 more that read the levels' data formats), and the pairing went wrong silently where a level inserts code (see "Candidates"). After the audit, about sixty carried comments on code of the same shape were still wrong, because the level's code called a routine of its own where Central Park's called another, or loaded a different value, and the comment described Central Park's. A script in `kit/scripts/` would pair two snapshots' code from shared anchors, check every paired jump and call against the pairing of its target, flag every paired call whose target has no twin and every paired immediate that differs, carry the comments with their addresses rewritten, and report what it could not place; `15-parts` would point to it for a part whose code is another part's reassembled.

## What cost the most time

The full audit of every comment, which the maintainer's sample made necessary (1,942 items in seventeen units, 382 wrong, and 66 of 355 facts; the second sample found 1 of 60 wrong), and the change that would have saved the most is the script asked for above: with the pairing checked as it was made, the carried comments would have needed checking once, in Central Park.

## Operating system and tools

- Linux x86_64, Ubuntu 24.04.5, in a cloud container. VICE x64sc v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`) under the kit's virtual display; regenerator2000 0.9.20.
- The disk images are a crack with a trainer. Its two options were left at NO; its level skip on the ← key is always on, and its code, at the end of the engine's interrupt, is in the engine's listing, marked as the crackers'. The route is in `orientation.md`.
