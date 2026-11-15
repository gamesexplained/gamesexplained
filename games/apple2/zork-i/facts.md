# Zork I — verified technical facts

What is true of the game as a whole: how its parts follow one another, and what they share.
Each part's own facts are in `parts/<id>/facts.md`.

## Checks behind the pages

How the pages' widgets, pictures and sounds were checked against the game, and which emulator showed what the pages describe. The pages themselves say only what the reader is looking at.

### discoveries.html

- The interpreter's own copy and split (`$1D69`, `$130B`), ported to the page and held byte for byte to the code in the kit's 6502 simulator for lines of 0 to 110 commas.
- This is the interpreter's own code, run on the page in the kit's 6502 simulator on the listing's bytes: the numbers go where the interpreter leaves an instruction's operands (`$82-$85`), and the run starts at the handler (`$111D`, `$114F` or `$10E8`) and stops where it stores the result (`$0B55`).
- Run the same way in the emulator, 17 sums gave the same answers as the page, and a test holds the page to them.

### index.html

- A test runs each routine on the same bytes in the kit's 6502 simulator beside the port: every dictionary word, 2,000 random words with capitals and punctuation in them, 511 whole lines, and every object's name, with the same result every time.
- This is that kilobyte from the emulator, set in type.
- Right: the kit's picture of the same snapshot.
- alt="The same screen as the emulator drew it"
