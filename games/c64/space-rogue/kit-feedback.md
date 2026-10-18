# Space Rogue — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `core/70-minisite`: "A widget that runs a mechanic is a claim too": running each page's port against the game's own code in the 6502 simulator found three wrong explanations in listings that had passed the sample: the tile halves the chart drawer reads, how `pick_ship` chooses an enemy, and a HIVE! mound wait of 92 where the listing stopped at 91.
- `core/60-verify`: "Both the sample and the audit are done by checkers": the sample went to Codex, which wrote none of the comments, and it marked 9 of 60 wrong, among them a pause routine read as taking its length from the caller.
- `core/70-minisite`: "counts the pixels that differ from the emulator's picture of the same frame": the count for a frame of the walk through a base was 13,852, and finding why showed that `frame.py` took the video chip's registers from RAM while the game had banked the I/O out.
- `core/10-orient`: "What makes a part is the machine's. On one that loads from disk or tape, a part is a load as the player meets it": I kept `TALK`, the base map and the tile set inside the base part, since they arrive behind the one docking, and gave Hive! and the ending parts of their own.
- `core/10-orient`: "Map the disk's files onto memory.": the 16-byte search over every snapshot showed the overlay layout before any code was read, and that `END` is `INIT` under another name.

## What was changed in the kit

- `kit/skills/core/50-coverage`: step 2's list of what to note while a routine is in front of you adds an `ADC` or `SBC` straight after a `JSR`, whose sum takes in the carry the routine returns. games/c64/castle-master has the same shape at `$5503`: `JSR $559A` then `SBC $4F84`, where `$559A` returns with the carry clear on every call, so the subtraction takes away one more, which the comments there do not mention. Lesson `kit/lessons/2026-10-15-space-rogue.md`.
- `kit/skills/c64/c64-reference`: the `$D011` row says what bit 7 is when read (bit 8 of the line being drawn) and when written (bit 8 of the raster compare), and that `LDA $D011 / ORA / STA $D011` run on line 256 or later moves a raster interrupt set for line n to 256 + n, past the bottom of a PAL frame for any n from 56 up. This game's intro freezes on it about one start in six. games/c64/lode-runner (`$6292`) and games/c64/choplifter (`$99E2`) have the same read-modify-write.
- `kit/skills/c64/tool-vice-mcp`: `vice_vicii_get_state` answers with the RAM wherever the processor sees RAM at `$D000`; read the registers through the io bank. games/c64/clowns met it with an Ultimax cartridge (#342), this game with `$01` = `$34`.
- `kit/c64/frame.py` and `kit/c64/screen.py`: the video chip's registers and line now always come from `$D000` in the io bank. `vice_vicii_get_state` gave zeros and line 0 while the game ran with `$01` = `$34`, and line 0 matched the chip's own at the top of a frame, so the Clowns check that compares the two lines let it through; the base's frame was drawn from the wrong registers. Tests: `kit/c64/test_frame_ultimax.py`, `kit/c64/test_screen.py`.
- `site/lib/sid.js`: the test bit set and cleared within one frame now resets the oscillator, as the chip does. The player lands a frame's writes at one instant, so the engine hum, which restarts its wave this way every frame, played as a steady tone. Test: `kit/c64/test_sid_test_bit.js`.
- `kit/scripts/check_listing.py`: an instruction that starts in the part beneath and runs on into this part's range is not reported as untyped code. Its operand bytes belong to the other part's instruction, and typing them as code here would decode a false instruction. Test: `kit/scripts/test_check_listing_codemap.py`.
- `kit/scripts/test_kit.py`: `-h` prints the usage and exits; it ran every test.
- `kit/style.md`: a section on "no X" as the subject asks for a sentence where a real thing acts, or "there is no X", in place of an absence as the subject ("no gate leads to it"), with three of this game's lines as its examples (Aaron's review of the Discoveries page). `kit/skills/core/70-minisite`: step 6 of the rewrite pass searches for it. games/c64/the-sentinel ("No landscape is stored") and games/c64/storm ("no brooch can bring it back down") have the same shape.

## What the run met

- A snapshot of the intro's entry sat in the KERNAL's serial routine when run, because side 2 was in the drive; `vice_disk_attach` with `work/side1.g64` first fixed it.
- `random_upto` (`$A298`) gives its limit too, so a call with 100 has 101 outcomes; three comments had counted 100 before the sample.
- The star field shown after a wrong answer differed from a fresh unpack of `SPACE` outside the typed text as well: the routine keeps the earlier picture past the end of its stream, so the page's port overlays the two, as the game does.

## Candidates

- `kit/skills/core/50-coverage`, a work buffer inside a loaded file: the intro types the answer to the copy protection into `$BF00`, inside the packed star field loaded at `$B700`, and unpacks that file again after a wrong answer, so the picture comes out changed. The listing called `$BF00` the line buffer and the file's last page packed data, each right alone; it showed when the Discoveries page ran the unpacker after a typed answer. The rule would say: when a buffer's range overlaps data a file loads, find what reads that data after the buffer is written. Only this game shows it so far; the lesson is in `kit/lessons/2026-10-15-space-rogue.md`.

## Maintainer asks

- #342: report `vice_vicii_get_state` returning RAM, with this run's case of the I/O banked out added as a comment.
- #360: give `accuracy` a row for comments a widget's check corrects, with this run's three corrections added as a comment.

## What cost the most time

The `$D011` row added to `c64-reference` here: the freeze it explains stopped every clean boot during orient, was first put down to the wrong routine, and was worked round with a poke from the monitor until annotation found the cause.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04 container, four cores, no display); VICE v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`); regenerator2000 0.9.20; Python 3.13.16; node 22.22.0; OpenAI Codex CLI 0.162.1 for the checker; Chromium from Playwright for the browser check.

## The Play port

- `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock": the fit and the pass-for-pass check were right and the page still ran busy views at half speed, because the main loop reads the interrupt's frame count in the middle of a stretch to decide whether to draw. The page now moves its clock on by the stretch's cost so far before such a read (`port/page/runtime.js`, `irqByte`). Only this game shows it so far; the lesson is in `kit/lessons/2026-10-16-space-rogue-play.md`.
- The same file, on a page that carries the game's data without its program: nothing says the game may keep state in its instructions. `port/test/t-page.js` runs the page's machine on the stripped disk beside the whole one and found 3,157 bytes the port reads; the lesson file says how.
- `kit/c64/lockstep.js` ran each of the title, the intro and the ending as a program of its own once `port/test/lockstep.js` caught the port's jump to the next program and compared at its target. A game of several programs that jump to each other could use that in the kit; it is left in this game's test until a second game needs it.
- `play.md` says nothing of a modern view on a Play tab (Native resolution, Smooth motion), which two games now have (`games/c64/mercenary`, this one). What both found: draw it from the game's own numbers at each pass and never write them, and hold that with two machines side by side, one with the view on (`test_play.js` here). This game added that a pass's numbers may exist only once its drawing starts, after the flip before it, so pacing the motion by the flips stalls it at every picture; pacing it by the passes' own times does not. Not changed here: whether `play.md` should say so is a maintainer's call.
