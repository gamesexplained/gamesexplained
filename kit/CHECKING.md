# Checking a run made on an unproven model

Any model may run the kit. A proven model is one the maintainers declare
good enough in `kit/models.json`, or one that took a game to Silver
before this check was needed: `python3 kit/scripts/models.py` lists
them, with the games. When a run's coverage or verify step ran on a
model that is not on that list, the game cannot be Silver until a
maintainer has checked it. This file is that check. It is done at review
time, on the pull request's branch, before the merge. A game merged
before its check is published whole, with a banner saying it awaits
this check; the banner goes when the check is in its `accuracy`
(`build.py`).

The check exists because a weaker model's mistakes are silent, and so
is its checking. Its wrong claims read as confidently as its right ones,
and when it checks its own listing it finds fewer of them: on a test of
60 comments with 20 known errors, the weakest model tried found 4 to 7
and the strongest 16 to 18. A run's own sample can make its listing look
better than it is. So the check is the measurement every run makes
(`kit/skills/core/60-verify`, "Measure the listing"), made again by
someone whose checker can be trusted, with an audit when the listing
needs one.

A game built on an analysis the contributor made outside the kit
(`imported` in its `game.json`, `kit/skills/core/40-sweep`) needs the
same check unless every model named under `imported` is proven. Where
its claims came from changes nothing about how the listing is sampled:
the analysis's own record of what it checked is not evidence here.

## Who checks

A maintainer, or their agent, giving the work to checkers on a proven
model: fresh agents that wrote none of the listing. The run's own model
may check when it is proven, and the strongest model the maintainer has
finds the most (`kit/skills/core/60-verify`).

## A known contributor's audit

A contributor the maintainers know is listed in `kit/contributors.json`.
When their run audits every comment on proven models after the listing's
last annotation, and samples it again on a proven model after the audit,
that audit stands in for this check, and the game can be Silver without a
maintainer's sample: the maintainers trust the contributor to have run it
as this file says. Record the audit with the contributor's GitHub login as
`by`. A maintainer adds a contributor to the list when they know their
work. A game passed this way proves no model.

## What to do

1. **Sample the listing.** Draw 60 comments with a seed you choose, not
   one the run chose, and give them to a checker on a proven model with
   the brief in `60-verify/checker.md`. Read every comment it marks wrong
   or doubtful against the code yourself, and count what is still wrong.
   Correct those, with every other comment that says the same thing.
   A game of several parts is sampled across its parts.
2. **If more than 2 of the 60 are wrong, audit.** Checkers on a proven
   model audit every comment, in every part, and every claim in
   `facts.md`, which the article stands on and the listing does not
   hold. Correct what they find, every other comment that says the same
   thing, and the page wherever it repeats a corrected fact.
3. **After an audit, sample again** with a new seed. The page shows what
   this sample finds, whether or not it is within the mark.

The check does not pass or fail. It replaces the run's own measure with
one that can be trusted, and the About tab shows it beside the rest.

## Recording it

Add each step to the game's `accuracy`, after the run's own rows, with
your GitHub login as `by` (`60-verify`, "What the repository keeps"):

```
{"step": "sample", "size": 60, "wrong": 9, "fixed": 9, "seed": 4127, "by": "<your GitHub login>", "models": ["<the model id>"]}
{"step": "audit", "checked": 912, "of": 912, "fixed": 131, "by": "<your GitHub login>", "models": ["<the model id>"],
 "note": "and every claim in facts.md"}
{"step": "sample", "size": 60, "wrong": 2, "fixed": 2, "seed": 9902, "by": "<your GitHub login>", "models": ["<the model id>"]}
```

and set `tier` to `silver`. `check_docs.py` (through `models.py check`)
fails a game at Silver or above that ran on an unproven model unless its
last sample carries `by` and names proven models, no annotation comes
after it, and it is within the mark or follows a full audit that also
carries `by`; or unless, after the last annotation, a full audit on
proven models carries the `by` of a contributor in `kit/contributors.json`
and a sample on proven models follows it.

A game passed this way proves no model, however its samples came out:
the maintainers made the measure, and an audit may have made the
listing. When a model's own work keeps measuring as well as the proven
models' first drafts (on 11 October 2026, typically one comment in eight
wrong in a first sample), declare it in `kit/models.json`, naming the
games.

Checks made before 12 October 2026 tested twenty claims from `facts.md`,
ten names from `symbols.json` and the orientation facts, and one wrong
claim failed them. They are kept as `check` rows in `accuracy`; game.json
no longer has a `verification` record, and `check_docs.py` fails one.

## A platform written on an unproven model

A new platform's machine reference (`kit/skills/<platform>/<machine>-reference/`)
and its tool skills (`kit/skills/<platform>/tool-*/`) are what every game on
that machine consults instead of recalling it. A wrong fact in them is copied
into every later run. When the model that wrote them is not on the proven list,
a maintainer checks the platform by testing a sample of it, before a game on it goes to
Silver, and records the check in `kit/<platform>/INSTALL.md` beside its
measurements:

```
Platform checked: <GitHub login>, <model>, <date>; sampled 24 facts and
6 measurements, 0 wrong (the RST $08 handler, the BANKM address and the
interlace table among them).
```

Pick the sample yourself, and test it against the machine, not the prose:

1. **The machine reference's facts**: the memory map; the register, port and
   vector addresses; the timing constants; the character set. Each against the
   machine's ROM bytes, its documentation or the emulator. Prefer the facts a
   game's layout and the platform's tools lean on: a wrong vector or ROM address
   sends every later run wrong.
2. **`kit/<platform>/INSTALL.md`'s measurements**: re-run `check-emulator` and
   `verify-footprint` on the hosts it records, and confirm its pass counts, the
   builds it names and the versions. A date and a count that will not reproduce
   fail.
3. **The tool skills' behaviours**: the quirks they tell the next run to work
   around, observed live, and the commands they say work, run once.

One wrong fact fails the check: the reference was written from a
model's memory of the machine, and a sample that finds one error means there are
others. Correct what failed in place (a reference states what is true now); the
story of the check belongs where the platform's history is kept. The games a
platform produces prove its models, not its reference: they consult it, they do
not test it.
