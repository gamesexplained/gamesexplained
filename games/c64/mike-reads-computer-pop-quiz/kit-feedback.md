# Mike Read's Computer Pop Quiz — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A shape the game paints into the screen itself is drawn by the game's own routine": I drew the answer clock and the "frame tiles" by running `draw_clock` and `draw_frame_tiles` on the kit's 6502, and the second showed that the tiles the listing called the screen's frame are the speech bubble's outline; the page's section had been titled from the label.
- `60-verify`: "Read every comment it marks wrong or doubtful": all eight findings of the sample were read against the code, and all held.
- `60-verify`: "every other comment that says the same thing": the swap of screen colours and colour RAM at `$209A` was in four operand comments, and the missed `sta $5FF8,x` loops in all eight sprite pointer comments; 18 comments were corrected for 8 findings.
- `c64/steps`: "Writes that match the game's frame by frame can still be silent": the effects code never writes the volume after a block loads; `fx_init`, which sets it, is run before each effect button.
- `10-orient`: "a stopping checkpoint on the game's first instruction (the loader's jump into it)": the first stop, at `$4000`, was the loader's second stage; the KERNAL load log then showed the last file loading over the stage, and the stop at its return, `$40E2`, gave the hand-over.

## What was changed in the kit

- `kit/lessons/2026-11-14-mike-reads-computer-pop-quiz.md`: the run's lessons (the game's own text builders as the extractor, a drawing routine run before a page section is named from a label, and a turbo format with a checksum tried before one without).
- `kit/c64/tap.py` reads Novaload, a format of kind "novaload" in its table, and labels each file with its name (`turbo block 7 "FX"`); `kit/c64/test_tap_novaload.py` holds it to a made-up tape. Before it, `tap.py` listed this cassette as the boot program and one stretch of 799 seconds it could not decode, and once the "pages" format from the Short Circuit branch was merged it read about 220 false page blocks out of the Novaload files, because that format has no checksum and Novaload's files also start with a run of 0 bits and a 1. Novaload, whose files must pass a header checksum, is now tried first. Every other tape in this machine's game folders (Aaargh!, Aztec Challenge, Into the Eagle's Nest, North & South, Rick Dangerous, Short Circuit) lists the same items as before (`work/tapcmp.py`).
- `kit/c64/tap.py` reads Ocean's loader of 1984, a format of kind "ocean84" (`kit/c64/test_tap_ocean84.py`). It was read off the boot file of Roland's Rat Race (Ocean, 1984; the interrupt at `$04B9`), whose tape `tap.py` listed as 125 false "pages" blocks: after a lead-in and a 1 the loader skips a byte (`$AA`), then reads a header byte and 256 bytes per page until a header of `$04`. It has no checksum, so a stream counts only when it ends with `$04`, has no gap and loads at least half its pages straight after the one before; it is tried before "pages". The tape reads as 9 runs of pages, among them the loading tune at `$A000`, whose jump table the loader calls. Of 25 tapes Ocean and Imagine published in 1984 and 1985 in the Ultimate Tape Archive, only this one uses the format; Hyper Sports and Yie Ar Kung-Fu (Imagine, 1985) start with `$AA` too but are Ocean-Imagine type 2 (a flags byte and a page byte per block), which no format in the table reads yet.
- `kit/c64/tap.py` reads Ocean-Imagine types 2 and 3 and Novaload Special (`kit/c64/test_tap_ocean_imagine.py`, `kit/c64/test_tap_novaload.py`). Types 2 and 3 are the "pages" format (Ocean-Imagine type 1, Short Circuit's) with `$AA` after the 1, ending with page `$00` `$00` (type 2, Yie Ar Kung-Fu) or `$02` `$02` (type 3, Hyper Sports), as FT Console 2.76's notes describe them; the "pages" reader takes the `$AA`, the end marks and the rule that most pages follow the one before as options of a row. Novaload Special (`$AA $55`, then a page byte, 256 bytes and their sum per block) had to come first: read as Ocean-Imagine, its blocks line up exactly and came out with the right bytes under the wrong name and unchecked; on Summer Games II side 1 all 64 of a stream's checksums hold. Moving the "pilot `$E3`, sync `$ED`" row, which has no checksum, after the Novaload rows stopped it taking one byte out of the middle of a Novaload file there. Every other local tape lists the same items as before.

## Candidates

- **A counter that bounds a retry loop counts draws, not distinct items.** `pick_question` (`$2C72`) stops checking its asked-question bits once a per-subject counter reaches 0, and it decrements the counter on every draw, the rejected ones too, so repeats start after about two thirds of a subject. The listing's comment said it right; what could have gone wrong was the page saying how long a subject lasts. It was measured by running the routine 200 times on the kit's 6502 and counting draws to the first repeat. A skill line would say: when a routine retries random picks against a used-set, run it on the simulator to the first repeat before describing how long the set lasts.

- **The routine harness keeps being rewritten.** Each porting helper added hooks, a stack push and chips with a keyboard and a moving raster to its own copy of the routine-test harness (`work/play/rt.js`, `g1/chips.js`, `g3/check.js`). These belong in a shared `kit/c64/` harness beside `lockstep.js`, so the next port starts with them.
- **Polling loops and the checkpoint rule.** `play.md` puts checkpoints at every JSR the main program makes and at stage heads. A stage whose head is a loop polling what an interrupt writes yields there many times; an exception for that case in the rule would have saved two helpers a question.
- **A `start` option for the port's program.** Starting `P.program` at another stage than the hand-over (for a lockstep from a saved machine) was done by hand in each test; the page would use it too.
- **Measure sprite-split offsets with DMA on.** Raster-split handlers whose writes were placed from timings taken without the video chip's DMA drew stray pixels where sprite rows meet; with offsets taken with `dma: true` the screen was clean. A line in `play.md` would say so.

## Maintainer asks

None.

## What cost the most time

Writing the page widgets' renderers for the faces, fonts and pictures by hand; a site library function that draws a block of multicolour cells from bitmap, screen-colour and colour-RAM bytes (the format every one of them shared) would have saved the most.

## Operating system and tools

Windows 11 Pro 10.0.26200 with WSL2 Ubuntu; VICE v3.13.2 built from vice-mcp commit `1e83aab134`, check-emulator 57 of 57; regenerator2000 0.9.20; node 24 and Python 3 from the kit's `tools/`. The browser checks used the contributor's Chrome in headless mode from Windows against the WSL preview server (`work/shoot.ps1`).
