# Short Circuit — TODO

Tier: `bronze` in `game.json`, because the run was made on `claude-sonnet-5-5`, which is not a proven model (`python3 kit/scripts/models.py`). The work was done to the Silver standard of the kit's definition (coverage 99.9 per cent, minisite built, facts written). It becomes Silver when a maintainer has sampled its listing on a proven model and, if the sample finds too many wrong, audited it (`kit/CHECKING.md`).

## Missing for Silver

- A maintainer's sample of the listing's comments (`kit/skills/core/60-verify`). Part two's actor routines (`$2DD4`-`$35B3`) and the variable comments that only list references (from `$8B20`, `$9100` and the character-set areas) are the weakest.
- Names for part two's creatures: the fifteen event routines allocate sprites whose pictures nobody has looked at (`$8A6E`).

## Ideas

- A map of part one, drawn from `$4000`-`$42FF` and the tiles at `$5000`, with every object marked from `$1568`.
- A map of part two's two rows with the event columns from `$896E`.
- A walkthrough: the order of objects that builds the decoy robot (the objects `$225A` names).
- The title picture, drawn from `$5C00`, `$6000` and `$8548`.
- The 1,192 bytes after the title picture's bitmap (`$7F40`-`$83E7`) and the 1,051 bytes at `$8B75`-`$8F8F`: what reads them, if anything.

## More ideas

- Name part two's creatures. The events were run by poking the scroll column (`agent-history.md`); a bird, a squirrel, a low animal, a log and a crouching figure appear, and a careful run with a checkpoint on each starter routine would match them to the event numbers.
- A map of part two like part one's. Its tile colours come from two tables (`$4320` and `$9448`) whose use by the colour fill at `$2AD4` was not worked out.
- A Play tab: part one's menu and part two's creatures are small enough to port, and the first would be the more interesting.
