## 0.0.345 · 2026-11-11 · Cuthbert in the Cooler (C16) · jankfoundry

- **A sample's error rate is an estimate, not a lower bound.** The kit
  said to report a sample's rate as a lower bound on the listing's,
  because a checker misses some. Cuthbert in the Cooler's audit showed
  why that reads wrong: its first sample found 16 wrong among 80 drawn
  from 249 comments, 20.0 % plain and 13.2 % weighted by its strata,
  and chance alone can put either above the listing's true rate as
  easily as below it. Only the 16 confirmed errors over all 249
  comments, 6.4 %, are sure. A rate is now reported as an estimate,
  with its interval, its weighted rate and the note that the checker
  may have missed some, and `sample.py count` prints the sure minimum
  beside it.
