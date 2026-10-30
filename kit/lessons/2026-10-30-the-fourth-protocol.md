## 0.0.270 · 2026-10-30 · The Fourth Protocol (C64) · air with Claude

- **A branch straight after a JSR tests the flags the subroutine left,
  which need not say anything about the number it returned.** Episode
  one's `judge_security` calls `random` for a number from 0 to 98 and
  branches with `BNE` at once, as if it had just loaded the number. Inside
  `random`, the last instruction to set the flags is the `CMP #$63` that
  throws out numbers too big, and it never finds them equal, so the
  branch is always taken and the memo it would skip, a break-in one time
  in 99, never comes. The listing and `facts.md` said "one time in 99"
  until the How it works page's test ran `judge_locks` in the kit's 6502
  with `random` seeded to give 0; the emulator agreed. Before describing
  a branch that follows a `JSR`, read the flags the subroutine's last
  flag-setting instruction leaves on every path to its `RTS`.
- **The CIA's time-of-day clock counts in decimal digits, and its 50/60
  Hz bit sets how long its second is.** The game times its pauses by
  comparing the clock's seconds register with a constant, so `$14` waits
  14 seconds, not 20, and `$FE` waits for ever, since the seconds never
  pass `$59`: that wait ends only on SPACE. With `$DC0E` at `$01` (a 60
  Hz input) on a PAL machine, which feeds the clock 50 Hz, each of the
  clock's seconds takes 1.2 real ones: in VICE v3.14.0 on 30 October
  2026, 1,000 frames were 16.7 of the clock's seconds. The first
  annotation read the constants as binary. The checker's sample of the
  listing found one such comment ("or 254 seconds"), and a search for
  the same reading found it in other comments of episodes one and two
  and in the title's facts.
  `kit/skills/c64/c64-reference` now has the clock in its CIA section.
