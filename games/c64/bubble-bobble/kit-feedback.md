# Bubble Bobble — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

Run on 5 and 6 October 2026: macOS 15.6 on an Apple silicon Mac mini,
Python 3.14.3, vice-mcp v3.13.2 (the macOS arm64 GUI release),
regenerator2000 0.9.20 built with a Rust toolchain installed inside
`tools/`, node 22 from Homebrew for the page's tests, kit 0.0.93, model
claude-fable-5-1 throughout: one agent, plus one checking agent for the
listing samples and one for the audit of the routine comments, never
two at once.

## Skill text that changed what I did

- `10-orient`: "Save the hand-over too": the compare of hand-over and play showed the start-up code and the title tune exist only at the hand-over, so the listing is built from `entry.vsf`.
- `50-coverage`: "Data the ledger cannot see": a script over the ledger found 6 KB of long tables past their symbols' reach before the figure was called 100 %.
- `tool-regen2000`: "Code that indexes into I/O mints symbols in the RAM beneath": the colour RAM symbols sat on level layouts under the I/O area and were redescribed as layout bytes.
- `60-verify`: "A test must contain cases that have to succeed": the page's level decoder was held to the running game's collision map cell for cell, which is how the unpacker's forced left wall was found.
- `60-verify`: "Measure the listing before calling it done": two samples of 60 comments each found one in six with a wrong detail, so every remaining routine comment was audited by a second agent and 99 of 367 were rewritten.

## What was changed in the kit

- `kit/c64/tools.py`: `vice` makes one MCP call after the emulator comes up and says so when it is not answered. An emulator whose machine thread never starts has an open port and reads as up; `check-emulator` then waits for ever with nothing on screen.
- `kit/c64/INSTALL.md`, macOS: "The emulator is up and answers nothing", with the symptom, how it was traced to the host's sound output, and the `vicerc` setting that cures it.

## The Play tab (7 October 2026)

Skill text that changed what I did: `play.md`, "Port routine by routine,
on the game's own memory" and "Then the whole loop in lockstep" set the
shape; "Run the page's runtime in node from the cold start before
opening a browser" found the black screen and the missing keys before
Chrome did; "Where one pass's cost follows mostly from the game's
state ... measure instead of fitting" is what the pacing does, since the
pass loop's checkpoints bracket each routine.

What the kit left out, worked round in `work/port/` and worth lifting:

- **A stand-in that waits.** `standIn` runs a routine that waits until
  the step limit. A variant that stops at the frame poll, polls from
  JavaScript and resumes (`test/harness.js`, `standInGen`) let the whole
  program run in lockstep with one group ported, and every agent test its
  group inside the real loop.
- **Checking a generator.** The harness cannot drive one; two agents each
  wrote a frame-stepped scene checker (`test/items.js`, `checkScene`;
  `test/round.js`, `checkGen`) that runs the port's generator and the
  game's routine side by side, moving the frame counter by hand at every
  yield. One such checker in the kit would save the next run two.
- **The repeated checkpoint.** `lockstep.js` takes a checkpoint named
  twice with nothing run between as one place. A loop that calls the
  same JSR for three rows is that case, and the run went out of step at
  the title with "the game went to $F0B9, the port to $F0CC". A sentence
  in the header, or a bare yield the lockstep itself inserts, would
  save the hour.
- **A polling read before a direct read of the same byte.** `irqBytes`
  hands the port the game's reads in turn, polling reads included, so a
  routine that polls `$08` and then reads it once gets the first poll's
  value. The skill could say to read directly after a wait.
- **The chips as the KERNAL leaves them.** A page's own chips need CIA 1's
  data direction ($FF) and the VIC's power-on registers; a game that
  only ANDs `$D011` shows nothing on zeros. `play.md`, "The page's own
  chips", could list them.

## Candidates

- `50-coverage`, the loop's second step: name a kind of object from its
  picture and colour, not from its handler. Three special bubbles and two
  enemy shots were named from their handlers and given each other's
  names; thirty comments changed when the pictures were rendered
  (`kit/lessons/2026-10-06-bubble-bobble.md`). Only this game shows it
  so far.
- `50-coverage`, the same step: write each description with its listing
  on screen. The routine comments were written in batches after one
  reading of the whole program, and a checker found a wrong detail in
  one of four, never the wrong routine; only a full audit by a fresh
  agent brought the rate down (the lesson file, and `facts.md`, "The
  listing's comments, sampled"). Other games' audits found the same kind of slip (Wasteland,
  Mayhem in Monsterland, Skate or Die) without saying when their
  comments were written, so this stays here until a run shows the cause.
- `play.md`, "Then the whole loop in lockstep": a sentence on the
  repeated checkpoint and on reading an interrupt byte directly after a
  wait (above).

## Maintainer asks

- **Lift `standInGen` and a generator checker into `kit/c64/lockstep.js`**
  (above, "The Play tab"): both are platform code, not game code, and
  both were left in `work/` because a change to `lockstep.js` needs a case
  in `kit/c64/test_lockstep.js`, which this run did not write.

- **A page check on a Mac that has no Firefox.** `tools.py browser` starts an installed Firefox and nothing else, and this Mac had Chrome and Safari only. The page was checked with Chrome run headless from the command line (`--headless=new --screenshot`, profile in `tools/chrome-profile`), which gave one tall screenshot and the console log but could press nothing, and which woke Chrome's own updater outside the repository. Suggest `kit/scripts/browser.py` take Chrome or Chromium as well (it speaks WebDriver BiDi too), or `kit/INSTALL.md`, "Browser checks", say what to do on a machine without Firefox and what that leaves outside the folder.
- **Say whether a tight usage limit still allows the one checking agent of `60-verify`.** `kit/START.md` says a tight limit keeps the run at one agent throughout; `60-verify` needs the listing sample checked by an agent that wrote none of it, and leaves the tier where it was otherwise. This run's contributor answered "tight", and the run started one checker, alone and after the annotation was finished, on the reading that the limit is about agents running at once. A sentence in `START.md` or `60-verify` would settle it for the next run.
- **`r2000.py` could refuse a second label of the same name before the batch runs.** regenerator2000 rejects a duplicate label inside `r2000_batch_execute` with an error for that one call and applies the rest, so a batch of two hundred annotations reports success unless every result is read. This run's own applier checked each result; `kit/c64/r2000.py` could print the failed calls of a batch itself.

## What cost the most time

Writing each routine's comment with its listing on screen, as `50-coverage` now says, in place of four hundred comments written in batches from one reading of the code, would have saved the two samples, the audit and the third sample that measured it, about fifty minutes.
