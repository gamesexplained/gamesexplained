## 0.0.161 · 2026-10-14 · Granny's Garden (BBC Micro) · air with Claude

- **Hear what reaches the chip, not what the program asks for.** Granny's
  Garden's tunes are three `SOUND` statements a note, and read in the
  program they are three parts in octaves. Recorded at the SN76489, the
  theme's top part runs up to 1.2 seconds ahead of the other two, because
  its channel number's flush digit starts each note at once, and the
  kingdom's tune never plays its top part at all, because its synchronise
  digit waits for a partner note that never comes. Neither shows in the
  code without knowing what the operating system does with the digits,
  and both were measured, not recalled, before they were written down.
  When a game plays music through an operating system call, record the
  chip's writes while it plays and decode them before describing the
  tune.
- **Press DELETE before the first letter.** The game's input routine
  counts a DELETE in an empty field, and BBC BASIC's `LEFT$` with a
  negative length gives the whole string, so from then on the answer the
  game reads is not the one on the screen. Porting the routine, a line at
  a time, raised the question of what an extra DELETE does; typing one
  into the game answered it, and reading the answer back from BASIC's
  variables showed what the screen hides. When a page ports an input
  routine, hold it to the game on the keys at the edges: DELETE in an
  empty field, a key when the field is full, RETURN at once.
- **Run a BASIC line before saying what it does.** An audit of every
  comment in Granny's Garden found 41 of 189 wrong in a detail, and most
  described what a line says rather than what the machine does with it:
  a flash code a later PRINT overwrites, an envelope redefined before
  each of five notes that BASIC has queued before the first ends, so each
  plays the definition that stands while it plays, `*FX15,0` emptying the sound
  queues as well as the keyboard's, and INSTR fragments that miss because
  the input routine capitalised the answer's first letter. Each was found
  by running the line, in the game or in a bare machine, and reading the
  screen memory, the chip's writes or BASIC's variables. When a comment
  says what a BASIC line shows, plays or accepts, run it and read the
  result before writing it.
