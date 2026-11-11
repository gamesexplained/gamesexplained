# Boulder Dash — TODO

Tier: bronze. Run on `claude-sonnet-5-5`, which the kit has not proven, so a maintainer must measure the listing on a proven model before it can be Silver (`kit/CHECKING.md`). The listing is 100 % described (17,228 bytes) and a sample of 60 comments found 20 wrong (33 %), all corrected. The error rate is high, so an audit of every comment on a proven model is recommended before Silver.

For Silver:

- a maintainer's sample, or a full audit on a proven model;
- every feature in `features.md` confirmed, traced or open: five are open (see its open questions);
- verify live the items marked "traced": the creatures' handlers, the magic wall, the amoeba, RESTORE, two-player play.

Ideas:

- A Play tab with a level select, as the Gold reference page has.
- Rockford's frame sets at `$63E8`-`$66E7`: which set is used for which move.
- The eight unread blocks at `$68E8`-`$6E67`: whether the VIC shows them.
- Compare with the Atari original's cave data, which the sources say the C64 game converts.
