# Darkman — TODO

Tier: Bronze. Coverage 100 % of the traced bytes in all 7 parts. The game was
annotated mostly on Sonnet 5.5, which the kit does not count as proven, so it
stays Bronze until a maintainer has sampled its listing on a proven model
(`kit/CHECKING.md`). The first sample (60 comments, seed 20261024, checked on
Opus 5.5) found 8 wrong in a detail, none in its main claim, over the mark of
2; all 8 and the comments that repeated their error were corrected. An audit of
every comment is recommended, then a second sample.

Missing for Silver beyond the maintainer's check: nothing known. For Gold: a
human pass over every section.

- Unreached sprite shapes in level 2 ($01, $70, $73, $74) are level-specific;
  trace them from level 1's code.
- Name Darkman's move states ($2768, $2F67) and which strike is a punch and
  which a kick.
- Trace the photo-session code around the text at $57C6 in level 1.
- The Play tab: a port of the frame, the objects and the mask game.

Article ideas: the mask game as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen.
