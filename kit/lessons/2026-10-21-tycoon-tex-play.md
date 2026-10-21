## next · 2026-10-21 · Tycoon Tex (Commodore 16) · air with Claude

- **Let a CLI in where the game's comes.** A port's checkpoint after a
  CLI is the instruction after it, so on the machine the stretch that
  ends there ran with interrupts off. A Play tab's runtime that clears
  the interrupt flag as the port calls the CLI, before that stretch is
  paid, takes interrupts while it pays. Tycoon Tex runs its start for
  eight frames with interrupts off and ends it with a CLI; on the page
  the interrupt came in from the first frame, and the interrupts taken
  while the start was paid put the menu's turns a frame and a half behind
  the C16's and level 1's first pass three frames late. Clear the flag
  once the stretch before the checkpoint is paid, and compare the frame
  of the first interrupt on the page and on the machine. The lockstep
  cannot show this: it gives the port the machine's interrupts.
