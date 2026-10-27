## next · 2026-10-27 · Mr Puniverse (C16) · air with Claude

- **Hold the page's first picture to the emulator's: a lockstep cannot
  see the start memory.** Mr Puniverse's port ran 120,000 frames in
  lockstep with the game's own code, twice, through all 25 rooms, while
  its page drew the title on black. On plus4emu the title is blue-green:
  `irq` copies the room's colours from `$0339`-`$033B`, in the tape
  buffer, and nothing writes them until the first room is drawn, so the
  title shows what the Novaload load left there (`$4C`, `$4A`, `$F0`).
  The load also leaves `$A1` at `$034B`, which the first interrupts read.
  The port and the game started from the same memory, the listing's,
  with the same few bytes of the KERNAL's added, so both were wrong
  together and every pass compared equal. A test that drew the title
  from the page's code and compared it with plus4emu's picture found it
  (0 of 64,000 pixels off once the four bytes were added). The rule is
  in `kit/skills/c16/c16-reference`, "The mistakes that bite".
- **Let the interrupts in before the first read of a byte they write.**
  A page's runtime takes an interrupt only where the port yields, so a
  port that reads the key code before its first yield after the `CLI`
  that lets interrupts in reads it as it was before any interrupt ran.
  The game, at `new_game`, had taken two interrupts by then, and with
  RETURN held from the first frame it waited for the key to be let go,
  while the page drew the title at once and took the key as the menu's.
  The page's own test of starting a game found it; a checkpoint before
  the read (the game's `JSR draw_lives`, `$3209`) fixed it, and the
  lockstep holds the port to it.
- **Count a page's pass when its clock gets there.** The page's runtime
  counted a pass of the main loop as the port yielded the checkpoint,
  before the clock had moved through the stretch that leads to it. From
  the EGY bar's refill to the first pass of a turn the game draws the
  whole room, some five frames, so the page's first pass after F1 came
  in frame 191 against the C16's 196 while its clock was right. Counted
  once the stretch is paid, it came in frame 196, and a minute of random
  play gave 443 passes on the page and 443 on the C16. The rule is in
  `kit/skills/core/70-minisite/play.md`, "Pace it by the machine's clock".
