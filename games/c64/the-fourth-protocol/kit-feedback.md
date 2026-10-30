# The Fourth Protocol — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": every widget on the three pages got a test that runs the game's own routine in the kit's 6502, and the Building 17 test is what showed that memo 31, the break-in, never comes.
- `60-verify`: "A wrong comment is usually one belief written down more than once": the checker's eight wrong comments came from a few beliefs, the time-of-day clock read as binary seconds among them, and searching for each found 32 more, corrected with them.
- `60-verify`: "Comments a program wrote, a decoder describing every record": the sample drew 20 of its 80 from the 1,345 comments my decoders wrote from templates, and `facts.md` gives the weighted rate beside the plain one.
- `70-minisite`: "Draw every one of them as a picture from the extracted bytes": the Maps tab draws each of episode two's 249 places as the game's screen shows it, held to `show_location` by a test, rather than listing them in a table.

## What was changed in the kit

- `kit/skills/c64/c64-reference`: the CIA section now says that the time-of-day clock counts in BCD and that bit 7 of `$DC0E` sets its 50 or 60 Hz input; the lesson is `kit/lessons/2026-10-30-the-fourth-protocol.md`.

## Candidates

A branch straight after a `JSR` that tests the flags the subroutine left.
Episode one's `judge_security` branches on Z right after `JSR random`, and
Z there comes from `random`'s own `CMP #$63`, never equal, so the memo
the branch skips can never come. The listing and `facts.md` described
the branch by what the number would mean, and nothing caught it until the
page's test ran the game's routine with `random` seeded to give 0. The
skill would say, in `60-verify` or `50-coverage`: before describing a
branch that follows a `JSR`, read the flags the subroutine's last
flag-setting instruction leaves on every path to its `RTS`. The lesson
file tells it; no other game folder shows the same mistake yet.

## Maintainer asks

- #638: Let a part laid over another name what it keeps at the other part's addresses.

## What cost the most time

A shared tracer in the kit that takes a map of the calls followed by inline arguments, with the count chosen by the function number in A at the call, and the game's dispatch tables, would have saved writing a tracer of my own for each of the three episodes.

## Tools and system

Linux 6.18 x86_64, Ubuntu 24.04.5 in a Claude cloud container with no
display (Xvfb). VICE v3.14.0 (vice-mcp release, `check-emulator` 57 of
57), regenerator2000 0.9.20 built with cargo into `tools/`. Four
disassembler sessions ran at once on ports 3000-3003, one for each part
being annotated, with `KIT_R2000_PORT` choosing the session for
`r2000.py` and `symbols_export.py`.
