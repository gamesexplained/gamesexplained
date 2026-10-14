## next · 2026-10-14 · Granny's Garden (BBC Micro) · air with Claude

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
