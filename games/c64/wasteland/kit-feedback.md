# Wasteland — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `10-orient`: "The game's own loader puts the part in memory. Never assemble an image from the disk's files": every map and tile set part was loaded by calling the game's `enter_map` from a stub, not read off the image, and that is how the loader's one-track-off table came to light (five maps read off the image by a reader without the quirk gave the wrong bytes).
- `60-verify`: "When you measure with breakpoints, put one on a routine you know runs": every counted live test (the idle turn, the main loop's pace, the pictures' pace, the joystick) carried a checkpoint on the interrupt handler, and the joystick's 0 reads of port A meant something only because the same counter showed 203 interrupts in each hold.
- `40-sweep`: "check whether the code reads it or reads a twin elsewhere": the Ranger Center's last 2.5 KB proved to be the radio's program and the radio's tail the game's own bytes, so both are described as leftovers of the disk's build, not as code of the part they load with.
- `50-coverage`: "The skip idiom (a two-byte or three-byte opcode used to skip the next instruction)": the game's `BIT` skips name addresses inside the map parts' ranges, and the map agents were briefed to explain each as an operand; none was given a meaning.
- `60-verify`: "If the first sample is bad, audit the whole listing before the page is published": the first sample found 15 of 63 comments wrong or wrong in a detail, so before the pull request 22 agents that wrote none of the comments checked all 11,532 against the bytes and corrected 2,441, and a second sample, drawn with another seed and checked by four more agents, measured what was left: 3 of 80, all details (`facts.md`, "Comment sample").

## What was changed in the kit

- `kit/scripts/parts.py`: a part keeps its own ranges where a part over it loads again (`elsewhere()`), and a gap's label names the part whose load wrote that stretch, not the nearest part beneath. Wasteland's radio and death screen lie over the game's first pages and call the rest of it; the game had lost `$7E00-$87FF` from its own ledger, and `symbols_export.py` dropped an agent's annotations there. Tests in `test_parts.py`; `10-orient` step 4 and `50-coverage`, "A game of several parts", say it.
- `kit/scripts/build.py`: a part id just before an address in a code span (game `$8820`) sends the link to that part's Source page; on a game of parts every such address had linked to the page's own part (`test_build_part_links.py`).
- `kit/scripts/build.py`: the broken-link check skips the first piece of a URL that a script puts together (`href = 'source-' + part`), which it reported as a broken link to `source-` (`test_build_links.py`).
- `site/lib/c64.js`: `C64.load` fetches and parses each listing once a page, however many widgets load it, and still gives each its own memory; Wasteland's How it works page loads the engine's and the game's listings from several widgets (`kit/c64/test_c64_load.js`).
- `kit/scripts/listing.py`: the check of the parts beneath no longer counts the code bytes that this part's own load replaces, which it reported as differences and asked to widen ranges that were already right, for every part that replaces code of the part beneath. Given a folder and no snapshot it now fails with a message; it printed its usage and exited 0, so a script that built the 51 map and tile listings built none and said nothing (`test_parts.py`).
- `kit/scripts/symbols_export.py`: says when the file it replaces had more user labels or comments than the session holds, which is what an export from a project file older than the work looks like (one wrote 194 symbols over the game's 1,600 in this run, restored from a copy); and says when a label it reports as lost is only an older name of what the owning part's `symbols.json` holds now (`test_parts.py`).
- `kit/skills/core/10-orient`: a load that several parts share and that stays while they change is a part of its own; `kit/lessons/2026-10-05-wasteland.md`.
- `kit/skills/core/50-coverage`: an unpacked load can run on past its own data; `kit/lessons/2026-10-05-wasteland.md`.
- `kit/skills/core/50-coverage`, "A game of several parts": automatic symbols that only the part beneath refers to are deleted, a stopgap until #213.
- `kit/skills/core/50-coverage/brief.md`: every annotation agent is told that a value in the snapshot is the last one written, and to find the writers before calling a value fixed; `kit/lessons/2026-10-05-wasteland.md`.
- `kit/skills/core/50-coverage`, "Rules that keep the number honest": a script that writes a comment for every record of a format has each template sentence tested against every path that reads the field before it writes, and chooses the sentence from the record's bytes; `kit/lessons/2026-10-05-wasteland.md`.
- `kit/skills/core/60-verify`: comments a program wrote are a stratum of their own, with about 20 drawn from it and the rate weighted by the strata's sizes given beside the plain one, and a bad stratum is audited by template, with the corrections made by a script and in the decoder; `kit/lessons/2026-10-05-wasteland.md`.

## Candidates

None.

## Maintainer asks

- #213: `symbols_export.py` should leave out an automatic symbol in a part's ranges that only code outside them refers to.
- #214: `listing.json` should name the snapshot it was built from.
- #215: an address link that lands on no record of its Source page should say so, or not be a link.
- #216: who writes the standfirst; the template and `style.md` say a human, `70-minisite` says the agent.
- #217: `c64-reference` should give the cycles the video chip takes from the processor.
- #218: `kit/c64` should read the screen's text, including text a game draws into a bitmap with its own font.

## What shows itself, for the next run that meets it

None of these needed a skill: each failed loudly. They are here for the
next agent searching for the symptom.

- **The masters refuse to play.** The game loops on "Insert side 1" with
  side 1 in the drive: the side check wants bytes the game's own copier
  writes. Make the play disks with Utils, Copy, in the emulator
  (`orientation.md`, "The play disks").
- **The copier's prompts are drawn into a bitmap**, in the game's own
  six-pixel font, which no screen-text tool reads. The game's Copy asks
  for each side's master and copy in turn, and its prompts could not be
  scripted until the run had written a reader for the font (#218 asks
  for one in `kit/c64`).
- **A script hangs at `$FF00`.** A stop checkpoint left armed by an earlier
  script stopped the machine inside the loader, and the next script waited
  on it for ten minutes. Clear the checkpoints (`vice.clear_checkpoints`)
  at the start of every script.
- **The emulator's MCP tools did not connect for the session** (connection
  refused), while `kit/c64/vice.py` over the same port worked throughout.
- **`vice.frames()` returned zero hit counts** until the machine had been
  stopped at a checkpoint first; runs of 500 frames or fewer then counted.
- **Booting side 3 alone jams the processor at `$2931`.** It is an older
  build of the start-up whose engine is not on its disk; not a fault of
  the image or the emulator.
- **The container restarted mid-run.** Every disassembler session and
  agent stopped. Each part's session came back from its `symbols.json`
  and the annotation logs written since its export (a script of the
  run's own, `work/lead/restore.py`); the project files that rebuild left
  in `work/` held only the import, so later exports came from the live
  sessions, never from those files.
- **`kit/c64/machine.js` reads 0 from the CIA timers** unless started with
  `cia: true`, as its header says; the game's random numbers add CIA 1's
  timer A, so a simulated roll needs it.
- **A data label's reach.** An automatic symbol inside a typed table cut a
  layer's 64-byte reach, leaving 23 bytes of map 4 undescribed; renaming
  minted symbols to user names gives the longer reach (`50-coverage`,
  "Know how far a description reaches", says so).
- **`check_docs.py` rejects the comment sample's paragraph** in
  `facts.md` when it says that comments were "corrected" or that one
  "was wrong": it reads those words as a narrated mistake, while
  `60-verify` asks the paragraph for what was changed. "Rewritten" and
  "had the code wrong" pass.

## What cost the most time

The rule now in `50-coverage`, to test each sentence of a decoder's
templates against the code before it writes a comment for every record,
would have saved the most: the maps' decoder wrote 7,973 comments, and
after the first sample 22 agents spent about two hours, half an hour of
it stopped at a usage limit, auditing all 11,532 comments, which
corrected 2,017 of the decoder's (`kit/lessons/2026-10-05-wasteland.md`).

## Operating system and tools

Linux 6.18 x86_64 (Ubuntu 24.04 cloud container, four cores, no display).
VICE from the vice-mcp release v3.13.2 (`v3.13.2-linux-x86_64-gui.zip`)
under Xvfb, every `check-emulator` check passing; regenerator2000 0.9.20
built with cargo inside `tools/`; Python 3.11.15, Node 22.22.0, and
Playwright's Chromium 141 for the page checks. Nothing in the install
notes needed changing.
