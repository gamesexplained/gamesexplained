# The NeverEnding Story — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

- **Four parts.** The Ocean disk boots to a title screen, and Space there loads Part 1 (`orientation.md`). Part 2 and Part 3 are loads of their own. The title is a part because the player meets it before Part 1 is loaded; the game names the other three Part 1, Part 2 and Part 3.
- **One part is analysed.** `parts/part-1` is the machine at the Part-1 command prompt in the Great Forest. The title, Part 2 and Part 3 are folders that hold their name and nothing else; Part 2 and Part 3 have not been captured in this analysis.
- **The title leaves code behind.** Part 1's image keeps the title player's tail and its handler table at $9CFF-$9EF2 (`parts/part-1/facts.md`, "Hidden-page observation"). Whether a later part keeps them, or loads over code that Part 1 leaves resident, is open.
