# Hammerfist — cheats

## Initials shortcut

Enter YCY in a qualifying high-score row. Complex 7 `$8325-$8348` changes `$98C1` from `$F0` to `$D0`. F3 then increments the route index and jumps through `$AFF1`, rather than selecting the ordinary fist. Native instruction traces confirmed both the initials branch and the callback destinations; a high-score input route was not recorded.

## Direct branch patch

In Complex 7, writing decimal 208 to address 39105 (`$98C1`) applies the same branch change directly. Writing 240 restores the ordinary F3 branch. Both destinations were single-stepped in VICE. This poke changes a branch in this load; other loads have different callback addresses.
