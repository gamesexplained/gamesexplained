# Mike Read's Computer Pop Quiz — TODO

Tier: silver. Coverage 100 % of all three parts (80,366 bytes).

## For Gold

- A human's pass over every section of the How it works, Discoveries, Questions and Graphics tabs (`AGENTS.md`, "Definition of done").

## The listing

- **An audit is recommended.** The sample of seed 77133 found 8 of 60 comments wrong (13.3 %, 95 % interval 6.9 % to 24.2 %), over the kit's mark of 2 in 60. All 8 and 10 more comments that said the same were corrected, but the rate says more of the same kinds are likely elsewhere: comments on variables that miss a reader or writer in another part or in a loop, and comments that confuse the screen colours at `$5C00` with the colour RAM at `$D800` (`kit/CHECKING.md`).

## For Platinum

- The Play tab: the whole game ported to JavaScript and run in lockstep with the game's code, with `test_play.js` (`kit/skills/core/70-minisite/play.md`).

## Questions only the contributor can answer

- Who the twelve faces are meant to be. The game names them by first name only (Mark, James, Terry, Mike, David, Phil, Sharon, John, Freddy, Eva, Gary, Andy), and some pairs look odd: the face beside "Phil" has long blonde hair, the one beside "Sharon" a moustache. The Graphics tab shows them; identifications can be added there.

## Ideas

- Fact-check a random sample of about 50 questions against the charts of the time, and say on the Questions tab how many held.
- A "One frame, rebuilt from memory" section on How it works: the question screen recorded with `kit/c64/frame.py capture` (bitmap, the 24-sprite text panel and the bubble sprites on a raster split) and drawn with `C64.renderFrame`.
- Record the tune's sound-chip writes in VICE and hold the page's player to them as well as to the simulator.
- Play Your Scene, the clue rounds, the Quickfire Round and the final Jukebox through in the emulator; they are traced in the code and their questions built on the kit's 6502, but not watched live.
- Add Novaload to `kit/c64/tap.py` (`kit-feedback.md`, "Maintainer asks").
