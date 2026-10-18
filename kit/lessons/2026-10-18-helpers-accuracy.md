## next · 2026-10-18 · Gribbly's Day Out (C64) · air with Claude

- **More reading per routine leaves fewer wrong comments, and helpers
  are the cheaper way to buy it.** Three copies of one Gribbly's Day Out
  run carried `50-coverage` on from the same point, after the lead's
  first pass at 27 % coverage: one agent alone, a lead and two helpers,
  and a lead and four. Fresh checkers then judged the three versions of
  the same 90 comments side by side, blind to which run wrote which.

  | Run | Time | Tokens | Wrong of 90 |
  |---|---|---|---|
  | One agent | 40 min | 1× | 17 |
  | Lead and two helpers | 62 min | 2.4× | 7 |
  | Lead and four helpers | 52 min | 3.3× | 9 |
  | One agent, then a full audit | 124 min | 3.1× | 8 |

  The single agent's extra errors were in the code, at addresses whose
  code reaches across the program: a key's two roles swapped, the rule
  for the next screen misread, a key that turns a display off glossed
  as turning it on. Each helper read a smaller range more closely, and
  at the merge one helper's reading corrected a variable the other had
  named for the wrong thing. The audit found 14 of the single agent's 17
  wrong comments without being told where they were, and broke none
  that were right, but reading a finished listing again cost more than
  reading it closely the first time. One run of each, on a game of
  14 KB of code: the gap between one agent and the rest is at the edge
  of chance (0.05 for one against two helpers). So a run whose
  contributor allows helpers splits even a small game, and starts two
  when the number is left to it.
