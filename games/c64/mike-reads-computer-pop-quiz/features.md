# Mike Read's Computer Pop Quiz — features

What the game is documented to do, with verification status against the binary. Statuses: **open** (documented, not found yet), **traced** (in the code, could not be exercised; say what was tried), **confirmed** (in the code, consistent with the emulator), **live** (observed directly), **differs** (the code does something else).

Sources:

- Sinclair User 87, March 1989, page 63, review of the ZX Spectrum version by Jim Douglas, on everygamegoing.com (https://everygamegoing.com/larticle/Mike-Reads-Computer-Pop-Quiz-000/37355), read through a fetch tool on 13 November 2026: a second-hand summary of the Spectrum game, used only for what the C64 game also shows.
- A web search on 13 November 2026 (MobyGames, ExoticA, computinghistory.org.uk summaries): the game is based on Mike Read's television pop quiz; Elite released it in 1988, Encore later; it shares its engine with Elite's *A Question of Sport*. The pages themselves could not be read (MobyGames refused the fetch, ExoticA answered with a browser check).
- Not read: the ZX Spectrum manual on spectrumcomputing.co.uk (its text uses embedded fonts that the tools on hand could not decode).
- The game's own text: the credits and the rounds' announcements (`$3E04`, `$3E83`, `$AEB7`-`$B456`, the string sweep in `work/strings-title.txt`).

## Features

| Feature | Status | Where |
|---|---|---|
| A one-player game against the computer, or two players | live | menu "Select game options"; player one on joystick port 1 or the keyboard, player two on port 2 (`$1C9C`) |
| Each team chooses a specialist subject: Pop, Rock, Rock 'n' Roll, Country & Folk, Classical, Mystery | live | the six icons; subject names at `$B32F` |
| Each team picks a captain and two members from twelve stars | live | the face grid; team introduction "the members of ...'s team are ... and ..." (`$FEC0`) |
| Five question blocks on the tape, one loaded for a game | live | "Question block 1" to "5" (`$1C3B`); four Novaload files a block (`orientation.md`); a block lasts four games (`games_left` `$2B90`) |
| The Jukebox round: choose a number, answer a question on a subject, four answers against the clock | live | "The first round of the game is the Jukebox round" (`$AEF6`); the number grid 1-12 shuffled over the subjects at `$287F`; answers in four slots (`$3C3A`) |
| A wrong answer is offered to the other team for a bonus point | traced | "Incorrect. A bonus point to ..." and "for a bonus point" (`$1E2B`, `$1E6A`); the pass to the other team at `$3029`-`$3099` |
| The Your Scene round: an easy question for one point or a hard one for two | traced | announcement `$3E04`; "Your Scene round - ... will you please choose Easy or Hard" (`$B440`); Easy asks the team's own subject, Hard another, `$3A84`-`$3AAB` |
| Spot the Star: up to three clues, three points on the first, two on the second, one on the last | traced | `$B204`-`$B277`; "Correct 1/2/3 points" (`$1DF2`-`$1E18`); the next clue at each time-out, `$2FC6`-`$2FDD`; every item and clue of the five blocks built by `$262E` on the kit's 6502. The screen shows the team's captain, not the star (`$2DA4`-`$2DC4`) |
| Name the Year: events of one year, the team names it | traced | `$B287`, `$B2AD`; built the same way as Spot the Star |
| What happened next: a question with answers A to D | differs | the text (`$25F8`) and a routine to fill its answer buffers (`$2640`) are in the game, but no step of the show (`$338E`) and no call or pointer reaches them |
| The Quickfire Round: as many questions as a team can answer | traced | `$B2CF`, "End of Quickfire round" (`$1EA1`); 9 questions on one clock at half speed, a wrong answer a point to the other team (`$0D88`, `$0DDD`, `$3125`-`$3162`) |
| The final round is the Jukebox again | traced | `$AEB7`; show steps 25-30 run the Jukebox on the six numbers left (`$3362`, `$338E`) |
| 1,275 subject questions, 255 a block | confirmed | built by the game's own `$3416` and `$3C3A` on the kit's 6502 from each block's snapshot (`work/allq.js`), block 1 again from the listing (`test_questions.js`) |

## Beyond the documentation

- Credits in the game's own text (`$3E83`): designed by Ian Upton and Nick Acton, graphics by Dave Percival, music and sound effects by Mark Cooksey, programming by Richard Underhill. The loading picture adds "in conjunction with MPC Games Ltd.". Unused panel credits in the menu (`$CC8E`-`$CD0A`) name Steve Beverley for the visuals.
- The question text is compressed: each block carries a list of words, and a byte from `$80` up in a question or an answer stands for one of them (`$259C`).
- The computer opponent is told the right answer's slot and takes it 192 times in 256 when it is behind, otherwise answers at random (`$0936`).
- Sound effects 0, 7, 9 and 10 of the effects code every block loads are never played (`$4FCB`'s nine callers).

## Open questions

- None of the features above is left open. Your Scene, the clue rounds, the Quickfire Round and the final Jukebox were read in the code and their questions built on the kit's 6502, but not played through in the emulator.
