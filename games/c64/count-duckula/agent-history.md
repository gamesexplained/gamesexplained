# Agent history

## 14 November 2026

Saverio requested Silver, authorised game downloads and a PR/issues, and specified one run with targeted instruction traces or watchpoints and no optional playthrough. Work began on an up-to-date main at cfc184e9. The upstream push test returned 403; the contributor fork accepted it. A detached empty commit proved the supplied noreply author identity.

The headless emulator passed exact stop and watchpoint checks. Host-key delivery failed; matrix keys were used. Its final quirk probe raised a checkpoint-list exception. Two attempts to record a full frame crashed at the recorder's instruction-stepping phase; individual instruction steps and targeted store watchpoints worked. No system settings or global packages were changed. The existing disassembler was stopped before opening this game's snapshot.

Two ICS intros preceded a restored title state. A range execute checkpoint showed the first game address in the idle loop at $24D2. The retained own start at $2480 rebuilt the setup and reached the opening room. An early boot attempt sent Space during loading, returned to READY and required RUN; its capture was replaced. The annotation retained explicit unknowns for four small data tails.

The inventory fixture initially inherited X=16 from the snapshot instead of supplying an item id. Its resulting slot value was discarded as a fixture error; the shift sequence itself identified its writes. The initial natural-input snapshot was not used to infer the vertical jump because its prior movement state was ambiguous. The ankh and clock interpretations were established with stopping store watches.

The opening static capture matched 104,448 pixels, and its trimmed display excerpt was embedded in the article. The native room renderer matched every output byte for all 48 rooms. The music wrapper matched 9,000 driver calls in an isolated scope. The independent checker marked 79 of 80 comments right and one wrong-detail: reversal resets a mummy divider to one. The comment was corrected, and a later full audit remains a recommendation.

Authored-page copy was drafted after the analysis, then reviewed against the house style and rewritten for a reader unfamiliar with assembly. The browser pass exercised 48 room choices and 104 sprite choices, inventory and jump controls, and narrow layouts. A full-document Source screenshot exceeded Firefox's height limit; its page check uses the viewport instead.

The Firefox BiDi pass completed all six tabs without console errors or narrow-screen overflow. The shared sound checker's exported AudioWorklet code rendered the theme for ten seconds in Firefox: heard=true, volume and envelope positive, no error, output span 1.3294. The contributor paused before the final test run completed; VICE and the browser were stopped. On resume, VICE remained stopped and the final checks continued from the saved files.

## 15 November 2026

A maintainer's quality pass, asked for by Aaron after the Silver merged: cut the dull sections, take the emulator and test talk off the pages, add pictures and Discoveries, and use the bouncing-ball music view. The work ran on the kit's machine model (kit/c64/machine.js) from the committed listing, with joystick and keyboard input; the model hung in the sprite multiplexer at $29BE until zero page held an empty schedule, which the listing leaves out.

Discoveries came from the leads in features.md. Igor's clock bug was reproduced in play: the first loop left the room before Igor could arrive, so each entry now waits twelve frames, and the fourth entry into room 72 at 9:36 left the clock at 9:06. The cheat's colour effect was recorded before and after typing the phrase in room 66. The mummy's cost was measured standing and walking in room 66. The unused Duckula poses were found by listing every store to a sprite pointer or actor shape. The winning screen's NDOR was shown by setting $2DF7, so it stays on How it works and in the follow-ups rather than Discoveries.

Leaving rooms by the top carried Duckula through three rooms in the model. The up-exit code reads $35C4, which the listing lacks; downloading the game image to fill it was refused by the session's permission check, so the gap is recorded in facts.md and TODO.md. Routes in the model avoid up-exits.

The pages were rewritten from the analysis. test_clock.js was added and failed, as it should, when the contact distance or Igor's hour test in a page was changed by hand. The cast's poses and rates moved into a block that test_viewers.js checks against the game's bytes.

## 18 November 2026: maintainer's check

Aaron asked for a fresh sample of his November Silver games on a Claude model, with an audit of any over the mark. The sample (seed 51121, 65 comments) found 6 wrong: Duckula's shapes were said to take the actor colour, the title's two colour planes were swapped, and the shapes of the picture that opens a game were placed on the winning screen. Those were corrected with the notes that shared them. One checker at a time then audited the 626 comments in three address ranges, and the last range took facts.md too: 100 comments and six facts were corrected. Its leads corrected three more things: the $2DA7 tail is unread, BURN THE WITCH needs no trailing space (cheats.md, features.md and the Discoveries text said it did), and the green sprite is stretched to double height ($D017 = 4), which the reference screenshot shows; the pages drew it at normal height, with the green over the beak, and now draw it stretched. A new sample (seed 51124, 65 comments) found none wrong.
