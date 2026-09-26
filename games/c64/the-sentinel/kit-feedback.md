# The Sentinel — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). What the skills and
kit got wrong or left out, what was changed, what needs a maintainer's
decision, what took longest, operating system and tool versions.

## What was changed, and why

- **`40-sweep`: a map of a documented version from another machine.** The
  C64 program turned out to be the BBC Micro original carried across, and
  a reconstruction of the BBC version is published. Unique ten-byte
  windows placed 10,751 of its 23,534 code bytes and 556 of its 885
  labels in a few blocks at fixed offsets, and with that map in the brief
  eight agents reached 100 % in an hour. No skill said to look for such a
  version or how to use one; the sweep skill now does, including the rule
  that the other version's words are never copied. In `kit/CHANGELOG.md`.
- **`10-orient`: ask what the image is before trusting it.** A backup of
  a running game is the game as it stood, with holes where memory was not
  saved; the step now says to restart such an image at the game's entry
  and to check fill-like ranges with checkpoints before the run goes on.
- **`c64-reference`: freezer-cartridge backups.** The contributor's image
  was a backup that crashed on resume, with 1.5 KB of code missing that
  only a checkpoint on the first pan revealed. The platform reference now
  says how to recognise such a backup, restart it at the game's entry,
  and tell a spare range from missing code before trusting the image. In
  `kit/CHANGELOG.md`.
- **`tool-vice-mcp`, known traps.** Autostart on a paused machine does
  nothing, and `check-emulator` and `frame.py test` leave the machine
  paused; autostart loaded the first program whatever `program` or `index`
  said; `vice_memory_read` stops at 65,535 bytes; every call stops the
  machine, so tight polling slows the game; keys sent while a restored
  screen is still being redrawn are lost; and how to run a protected `.g64`
  with the drive's own processor (the `vicerc` resource names that work,
  and the binary monitor's drive memory space for seeing why a loader
  hangs); letters are named in capitals for `vice_keyboard_matrix`, and a
  lower-case name is refused.
- **`50-coverage` and its brief: a scratch folder and a report file per
  agent.** The agents shared one scratch folder and overwrote each
  other's helpers (`refs.py`, `state.py`); one agent's report existed
  only in the conversation and had to be recovered from the transcript
  after the lead's context was summarised.
- **`frame.py test` fails when nothing ran.** Early in the run it printed
  PASS with 0 writes captured: the machine had been left paused, the test
  program never ran, and a still screen matched itself. It now needs at
  least one write per band of the test program.
- **`frame.py compare` reports an offset picture.** Three captures of one
  state differed by 2,160 pixels along every edge; one line lower, they
  matched exactly. It now tries offsets of one and two lines and says so,
  instead of sending the next agent after the renderer (#41 asks for the
  cause).
- **`r2000.py` keeps a batch's reads out of the replay log.** Inside
  `r2000_batch_execute`, every call was logged, reads included, so a
  replay repeated them.
- **`build.py` counts an exclusion as ROM only when its reason says
  ROM.** It matched the letters "rom" anywhere, so "missing from this
  copy" drew this game's missing code as ROM on the About tab, and two
  other games' footprints had the same slip: Encounter's zero page
  ("initialised from the image") and Wizball's level glyphs ("copied in
  ... from the blocks") now count as working memory.
- **`70-minisite`: the link check reads inlined scripts' comments too.**
  The port's header comment named its file in a `src=` attribute and
  stopped the build.
- **`80-retro`: list the `kit-ask` issues, do not only search them.**
  Without `gh`, the GitHub search tool found none of the four existing
  `kit-ask` issues; listing the issues with the label found them.
- **`kit/c64/INSTALL.md`:** this run's `check-emulator` result, 56 of 56
  with the v3.13.1 release zip, added to its row.
- `kit/VERSION` 0.0.24 → 0.0.25: the sweep and the platform reference
  change what the next agent does.

## Maintainer asks

- #40: vice-mcp's `vice_autostart` loads the first program on a disk
  whatever `program` or `index` say.
- #41: find why the emulator's picture of a captured frame sometimes sits
  one raster line lower than the frame.
- #42: ship a shared 6502 simulator in `kit/c64` for testing ports against
  the game's own code; each run writes its own.

## What took longest

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 18 | claude-opus-5-5 | 1 | freezer backup crashed on resume (RAM F900-FFFF lost); found the game entry at 3F00 and restarted there; a side trip into the second boot file did not finish |
| 20-features | 24 | claude-opus-5-5 | 1 | features from manual, wiki, Wikipedia, sentcode and the BBC reconstruction; most of the time went on finding that the backup lacks $B000-$B5FF (the pan scroll) and on a second upload that turned out to be Synsoft's Sentinel, a different game |
| 30-text | 8 | claude-opus-5-5 | 1 | text is ASCII through the C64's copy of OSWRCH with BBC VDU codes and a token table; no custom alphabet |
| 40-sweep | 2 | claude-opus-5-5 | 1 | register census, string sweep (BBC BASIC fragments, key tables), no twin copies; most of this was done inside the text step's time |
| 50-coverage | 62 | claude-opus-5-5 | 1 | 8 annotation agents on disjoint ranges plus one port agent (landscape generator, 8 traces, 10,000 codes); the lead ran live tests meanwhile and spent ~40 min on the second image (Synsoft's Sentinel, then a G64 of the original whose track 25 is damaged) |
| 60-verify | 25 | claude-opus-5-5 | 1 | live timing of the enemy clock and the Sentinel's turn, then merging eight agent reports into facts.md and re-reading each claim in the code; two claims from the reports were wrong and one of mine |
| 70-minisite | 26 | claude-opus-5-5 | 2 | page built around the landscape port: explorer with overview, map and generation stages; rebuilt frame with band overlay; memory-map diagram; enemy clock; energy row; copy and rewrite pass; the sound section waits for a subagent's port; the sound section: the subagent's driver mounted in sid.js's player, copy, section moved up to third; the U-turn tune tested live; every control exercised in Chromium |
| 80-retro | 13 | claude-opus-5-5 | 2 | kit edits (sweep for a documented version, freezer backups, VICE traps, scratch folders, three script fixes), two kit-ask issues, merge of main; paused to finish the minisite's sound section; kit edits and three kit-ask issues (#40-#42), kit-feedback, game.json, TODO, agent history; the key-name trap; facts brought in line with the sound port |
| total | 180 | claude-opus-5-5 | | 3.0 h of work |

```
Portable figures:
  minutes to play : 18.4
  min per KB      : 2.2  (62.4 min for 29,350 tracked bytes, 8 agents)
  hours           : 3.0
```

The one change to the kit that would have saved the most minutes, now
made in `10-orient`: check, before anything else, whether the image is a
backup of a running game and whether memory the game uses came back as
fill. Found on the first view instead of in the features step, the
missing `$B000`-`$B5FF` would have gone to the contributor at once, and
most of the forty minutes spent on it and on the second and third images
would have been saved.

## Operating system and tools

- Linux 6.18 x86_64, Ubuntu 24.04, cloud container with four cores and no
  display; Python 3.11.15; node 22.22.2; Chromium 141 through Playwright
  1.56 for the page check.
- vice-mcp v3.13.1 release (`v3.13.1-linux-x86_64-gui.zip`) under Xvfb:
  `check-emulator` 56 of 56 on 25 September 2026.
- regenerator2000 0.9.20.
- Subagents were started with the harness's model alias `opus`; the
  harness did not report which model the alias resolved to.
