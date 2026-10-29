## next · 2026-10-29 · Barbarian: The Ultimate Warrior (C64) · air with Claude

- **A state reached by a poke shows what the code does from there, not
  the way a player gets there.** To reach side 2's ending, the live test
  set the skill level to 7 during the first bout, in the throne room, and
  won it. The game then changed to the hall of arches before the ending,
  and the draft said the ending always changes arena. A game won bout by
  bout changes arena with every win, so the eighth bout is already in the
  hall and that swap never runs: `start_ending` swaps only when the
  throne room is up. The copy pass caught it by reading `start_ending`
  beside `walk_off`. Before writing what the game does from a test that
  poked its way somewhere, read what the normal path leaves in every
  variable the code you describe tests.
- **A comment carried from one part to its twin keeps the first part's
  values.** Side 2's engine is side 1's at other addresses, so side 1's
  names and comments were carried across by matching code. The comment
  on the arena's background colours kept side 1's "brown (`$09`)", where
  side 2's bytes are dark grey, `$0B`; it surfaced only when a page drew
  side 2's arena. `kit/skills/core/15-parts` now says to check each
  carried comment that names a value against the second part's bytes, as
  The Last Ninja Remix's run found for carried calls and constants.
