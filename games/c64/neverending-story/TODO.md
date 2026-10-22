# Work toward Gold

- Gold is a human's pass over the three pages, section by section (`kit/style.md`). The copy is
  `agent-draft`: nobody has read it yet.
- Open questions, also on the Discoveries page: what MUSIC, NOM and TEST did before their actions
  were emptied; whether Ocean's own cassette could save a game, which would say who switched
  saving off; and what the crucifix, an icon with no text in any part, was for.
- The cassette original was not examined. Its loader and its restart may differ from this copy's.
- Three things the audit read in the code and nobody has played: in Part 3, dropping the pouch
  and taking it again should print the Empress's congratulations and put the coin back
  (GET POUCH, `ACTION_SCRIPT_0B` at $2E83, prints event 4 of the loaded part, which in Part 3 is
  that text, when the coin is gone); LOCK CELL sets flag 11 again where it
  might clear it, so the cell should never lock ($2E4C); and the script bytes at $2B2F-$2B3F are
  named by no pointer. Each would be a Discoveries section once seen live.

# Work toward Platinum

A Play tab that is the whole game: every routine ported to JavaScript
and run in lockstep with the game's own code, with `test_play.js`
beside the page (`kit/skills/core/70-minisite/play.md`), and no bug
known that stops a player finishing.
