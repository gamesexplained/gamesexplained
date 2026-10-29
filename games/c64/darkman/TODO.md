# Darkman — TODO

Tier: Silver. Coverage 100 % of the traced bytes in all 7 parts. The listing was
annotated mostly on Sonnet 5.5, which the kit does not count as proven, and has
had the maintainer's check (`kit/CHECKING.md`): a full audit of all 3,698
comments and every claim in `facts.md` on Opus 5.5, then a second sample
(seed 5813) that found 2 of 60 wrong, within the mark.

Missing for Gold: a human pass over every section.

- Unreached sprite shapes in level 2 ($01, $70, $73, $74) are level-specific;
  trace them from level 1's code.
- Name Darkman's move states ($2768, $2F67) and which strike is a punch and
  which a kick.
- Trace the photo-session code around the text at $57C6 in level 1.
- The label `music_init` ($B0C8) names the sound-effect driver's init; a rename
  reaches every part's operands.
- Two comments describe stretches the listing holds no bytes for (level 1
  $250E, level 4 $1496); a build from the snapshots would settle them.
- The Play tab: a port of the frame, the objects and the mask game.

Article ideas: the mask game as a mini-game; the disk prompts and the
level-by-level load; the four-band play screen; level 6's uncalled routine at
$5552, which sets the cheat flag when only bit 7 of $DC01 reads low.
