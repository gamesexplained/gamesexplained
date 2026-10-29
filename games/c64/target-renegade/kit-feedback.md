# Target Renegade — kit feedback

## Skill text that changed what I did

- `60-verify`: "A wrong comment is usually one belief written down more than once": a wrong sprite-writer reference was fixed in every generated instance and its template, not just the sampled comments.
- `50-coverage`: "Runtime state is excluded": native loads and runtime writers separated authored resource bytes from generated screen, sound and reflection buffers.
- `70-minisite`: "Draw from the memory the game draws from": all five initialized stage fonts/colour tables were compared with their selected resource allocations before publishing the browser.
- `10-orient`: "Save the hand-over too": the cold entry preserved loader source $3546–$3645 before title drawing overwrote it.
- `80-retro`: "The failure shows itself": visible startup/path/approval failures were recorded in history instead of becoming another global instruction.

## What was changed in the kit

None. The existing coverage, native comparison, generated-template review and sampling rules caught these failures. The contribution changes this game's folder only.

## Candidates

None requiring a new shared rule. Typed interior aliases and code/data overlap needed careful reconciliation, but the existing routine/table and ownership rules already apply.

## Maintainer asks

None. The listing audit is a game follow-up, not a proposed change to the kit.

## What cost the most time

A local helper that compared every cited generated-comment reader with its actual field access would have prevented the repeated sprite-writer citation error; the kit already requires that check, so this run does not add a duplicate rule.

Cold loading exceeded the initial wait, and the all-platform status command met process-list restrictions. The installed C64 tools and recorded snapshots were reused without new installations or system changes. Independent review resumed from saved verdicts after a usage limit; the second sample used a fresh proven checker to finish the remaining twenty records.

## 28 October 2026 pass (page work on an unproven model)

- A game's loading picture can be recovered with no emulator: pack the disk (`kit/c64/disk.py pack`), run the picture file in `kit/c64/c64run.js` with `R.cpu.rom.char` given a blank 4 KB array, and draw a frame with `C64.renderFrame`. The loader read the character ROM and the simulator stopped until a blank one was given. A small script that does this for any disk file would save the next run the discovery (a candidate for `kit/c64/`, not added here).
- `check_docs.py` refuses any note in a game folder beyond the template's. Research notes go in the gitignored `work/`, and the facts that matter go into the pages and `facts.md`. `kit/skills/core/70-minisite` could say so.
- A page's sound driver test reads the driver by its `/* name */` marker, so moving a player to another tab needs the markers to travel with the code and the test to name the new page. The kit's `port_check.js` already says this when a block is missing; it needed no change.

### Maintainer asks

None.

### Auditing a listing of 1,622 comments

Splitting the comments before briefing kept the audit affordable: normalise each comment's numbers and addresses, treat any group of four or more with the same shape as a template family, and give each checker either about 77 handwritten comments or the whole family list. The family checker wrote a script that tests every instance's variable parts against the bytes, and read at least eight instances by hand. Nine Opus checkers used about 1.4 million tokens in total and found 56 wrong comments in 1,622. Each report was spot-checked against the listing with one `opcodes.py --refs` or one record dump before it was believed, and all held. `kit/skills/core/60-verify` could name the family split; it is a candidate, not added here.

