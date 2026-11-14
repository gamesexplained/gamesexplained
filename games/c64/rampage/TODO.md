# Rampage — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

Silver. Coverage is 100 % and every step ran on a proven model. The
sample check found 2 of 80 comments wrong (2.5 %), both in a detail and
both corrected (`facts.md`, "The listing's error rate"). The listing has
not had a full audit: one is recommended before anyone relies on it line
by line (`kit/CHECKING.md`).

Next: Gold needs a human's pass over each section of the four pages.
Platinum needs a Play tab that is the whole game ported to JavaScript and
held in lockstep with the game's code; the pages' widgets already run the
level set-up, the drawing code, the punch, the bullets, the sound and the
helicopters' paths, which is a start.

## Open questions

- **The American disk of 1988.** The same collection holds
  `rampage[activision_1988](!).g64`, a different program on a disk with
  no file directory. It was not analysed. Whether it shares this
  version's bugs (eating that gives nothing, the third monster that
  cannot be shot, the two lost tunes) is unknown, and it would make a
  second game folder.
- **How often `update_sound` was meant to run.** Nothing calls it, so the
  rate is unknown; the Discoveries page plays the effects with one call a
  frame, and says so.
- **What was in the twenty `NOP`s of `irq_top`** (`irq_top_gap`,
  `$7953`). The once-a-frame handler is the natural place for the missing
  call of `update_sound`, and a `JSR` is three bytes, not twenty. Unknown.
- **Whether the blank explosion shapes were meant.** The rotor's frame is
  added to the explosion's shape, which runs it on into shapes `$C4` and
  `$C5`, both empty. The page reports what is seen and calls the intent
  unknown.
- **`RHONA`, `I LOVE`, `YOU`.** Who Rhona is, and which of the four people
  the second loading picture credits wrote it. A web search on 13
  November 2026 found no page that mentions the message.
- **What D. Wainwright did.** The loading picture names four people; the
  comment signed David Jolliff (`facts.md`, "Build") gives the code to
  Michael Archer and himself and the graphics to Mark Jones.
- **The protection on a real drive.** In VICE the loader's check passes on
  some boots only (`orientation.md`). Whether that is the emulator's
  reading of the G64 or the disk's own behaviour was not looked into: the
  loader stays off the pages.
- **Eating.** The manual and the arcade game give energy for food and
  take it for poison; this version gives and takes nothing
  (`features.md`), and the page says so. A web search on 13 November
  2026 quoted MobyGames' trivia for the game as saying that the UK
  version has bugs, eating that does not give energy among them, and
  that the US version is faster and does give it. The page itself
  refused an automated read, so that is a search result's wording and
  not a source read here. Reading the American disk would settle it.

## Ideas

- A picture of each of the sixteen vehicles in the vehicles table of
  How it works, drawn at the speed and direction its record gives.
- The game-over newspaper drawn from `gameover_pictures`, beside the
  joining one.
