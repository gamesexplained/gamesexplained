## 0.0.76 · 4 October 2026 · Mr. Hat · jankfoundry with Claude

**A twin that nothing writes can still differ.** Mr. Hat's title font
sits at `$CE00` and is copied to `$2800` each time the title is set up.
In the frozen image the magazine shipped, 14 bytes of the source differ
from the copy, and no instruction can write either. The damage came
before the freeze, after the first copy, so the first title is right and
every later one shows a broken I. The analysis had excluded the copy as
output and never compared the two; a fixed version of the game, diffed
against the disk at the same instruction, pointed straight at the bytes.
`40-sweep`'s twin-copy check now says what such a difference means.
