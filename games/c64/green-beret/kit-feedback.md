# Green Beret — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `60-verify`: "Before saying that nothing reads or writes an address, search with every opcode and every index that can reach it": every comment that said nothing reads its bytes was checked against `opcodes.py --refs` and against the addresses the music decoder walked, which found 53 bytes of the title tune's sounds in a block called unread.
- `60-verify`: "Force the rare state.": rather than dying in the fights again and again, the stack pointer was lowered by two bytes for each death and the game run on, which put the crash at 23 deaths where the reading of the code had said 12.
- `tool-regen2000`: "Undocumented opcodes come out as data.": `opcodes.py` found the `LAX`, `ASR` and `SAX` of the copy-protection check at `$0100`, which the disassembler showed as bytes.
- `70-minisite/play.md`: "Count the page's pass once its clock reaches the checkpoint": `test_play.js` compares the page's first pass of the main loop and each life lost with the C64's frames, which is how the 8 frames the page lost in the intro showed.
- `70-minisite/play.md`: "Correct each comment the port shows wrong": five comments the port showed wrong were corrected and counted in the `play` row, one of them a second stack leak now on the Discoveries page.

## What was changed in the kit

- `kit/cpu/m6502.py`: `UNDOCUMENTED` decodes `LAX` absolute (`$AF`), `ASR` immediate (`$4B`) and `SAX` absolute (`$8F`), with a case in `kit/scripts/test_listing_undocumented.py`. The copy-protection check that the start-up copies to `$0100` is made of them, and the code map records it running, so `check_listing.py` failed it typed as bytes.
- `kit/skills/c64/tool-regen2000`: "Undocumented opcodes come out as data" now says to keep a spot typed code when `m6502.py` lists its opcode, and to add the opcode there, with a test, when the code map records it running, since `check_listing.py` fails a `byte` there. It said only to type such a spot `byte`, which the check then failed.
- `kit/c64/machine.js`: CIA 2's (and CIA 1's) serial port as output, a byte shifted out over 16 of timer A's underflows and bit 3 of the interrupt data set at its end, with a case in `kit/c64/test_machine.js`. Underflows that raise no interrupt are worked out when the chip is next read, so a timer nobody listens to no longer cuts the run into steps of a few cycles. The game's copy-protection check at `$0100` stops the machine without it.
- `kit/skills/core/70-minisite`: `play.md`, "Pace it by the machine's clock", says to leave a polling loop's cycles out of what is fitted, since the page's clock runs its turns itself; `games/c16/mr-puniverse` (`port/scripts/fit-cost.js`) and `games/c64/shadowfire` (`port/scripts/time-routines.js`) each worked this out on their own.

## Candidates

Timing a port routine by routine on `kit/c64/machine.js` needs `nest: true`:
without it an interrupt handler runs whole inside one instruction, and its
cycles land on the routine it interrupted. Only this run measured that way,
so it stays here until a second does.

A claim that a block is unread, made after searching every instruction's
operands, missed data a music driver reads through pointers held in its
own patterns: 53 of the 77 bytes at `$3FA3`, called "nothing reads", are
the title tune's sounds. It was caught by checking each such comment
against the set of addresses a decoder of the tunes had walked. The skill
would say, in `60-verify`'s "Negative results": data an interpreter reads
(a music driver, a script engine) is reached through pointers in other
data, which a references search cannot see; walk the interpreter's data
before calling any of it unread. The 50-coverage rule "A gap can hold a
different record type" is close, but speaks of gaps, not of a claim made
after the gap is described.

## Maintainer asks

An ask already filed covers this run's: #552 asks for a script that
carries comments to a relocated copy of code. This run's case, the music
driver's three copies of each routine, one per voice, is added to it as a
comment.

- #552: Add a script that carries comments to a relocated copy of a part's code (this run's case added as a comment)

## What cost the most time

The music driver: one note reader and one effects routine written out
three times, once per voice, so its 7,866 bytes needed every comment three
times over; a script that finds a routine's copies by their instructions
and carries one copy's comments to the others would have saved the most.

## Operating system and tools

Linux x86_64 (Ubuntu 24.04) in a cloud container; VICE 3.13.2
(`v3.13.2-linux-x86_64-gui.zip`) under the kit's launcher, all 57 of
`check-emulator`'s checks passed; regenerator2000 0.9.20.
