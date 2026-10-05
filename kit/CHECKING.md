# Checking a run made on an unproven model

Any model may run the kit. A proven model is one that has already taken
a game to Silver, or one the maintainers declare good enough in
`kit/models.json`: `python3 kit/scripts/models.py` lists them, with the
games that proved each. When a run's coverage or verify step ran on a
model that is not on that list, the game cannot be Silver until a
maintainer has checked it. This file is that check. It is done at review
time, on the pull request's branch, before the merge. A game merged
before its check is published whole, with a banner saying it awaits
this check; the banner goes when its `verification` passes (`build.py`).

The check exists because a weaker model's mistakes are silent. Its
wrong claims are as confident as its right ones: an address off by a
page, a routine named for what it looks like rather than what it does, a
screenshot saved under the wrong name. Reading the page does not find
them. Testing a sample of claims against the game does.

A game built on an analysis the contributor made outside the kit
(`imported` in its `game.json`, `kit/skills/core/40-sweep`) needs the
same check unless every model named under `imported` is proven. Where
its claims came from changes nothing about how they are sampled or
tested: the analysis's own record of what it checked is not evidence
here.

## Who checks

A maintainer, or their agent running on a proven model. The model that
made the run cannot check its own work, and `models.py check` refuses a
`verification` recorded with it.

## What to check

Pick the sample yourself: never let the run choose which of its claims
are tested.

1. **Twenty claims from `facts.md`**, or every claim if there are fewer,
   spread across its sections. Prefer the claims the page leans on: the
   ones a widget on `index.html` is built from, and anything with a
   number in it.
2. **Ten named routines or tables from `symbols.json`**, chosen from
   across the address range, not from its start.
3. **The orientation facts**: where the program loads, where the main
   loop is, and which memory configuration is in force during play.
   These are what every later step stood on.

A game of several parts (`kit/skills/core/10-orient`) is sampled across
its parts: claims from each part's own `facts.md` as well as the game's,
routines from more than one part's `symbols.json`, and the orientation
facts of every part the sample touches. Reach at least one part other
than the first by the route `orientation.md` gives, from your own copy:
a route that cannot be followed fails the check as a wrong claim does.

Check each one the way `kit/skills/core/60-verify` does: trace it in the
listing, and where the claim is about behaviour, observe it live in the
emulator. A claim you cannot confirm and cannot refute counts as wrong
unless the run itself marked it open.

## What passes

No wrong claim in the sample. One wrong claim fails the check: a sample
that finds one error means there are others it did not find. Return the
pull request with the claims that failed. The run's own agent, or a
proven model, fixes them and runs `60-verify` again. Then check a new
sample; do not re-check the old one.

## Recording it

When the check passes, add to the game's `game.json`:

```
"verification": {
  "by": "<your GitHub login>",
  "model": "<the model id that did the check>",
  "date": "YYYY-MM-DD",
  "checked": 33,
  "wrong": 0,
  "note": "what was sampled, in a line"
}
```

and set `tier` to `silver`. When an earlier sample failed and a proven
model then redid the run's coverage and verify steps, keep the failed
sample in the same record, so the game's history is in one place and the
model it tested is not credited with the result:

```
  "failed": [{"model": "<the model whose claims were tested>", "date": "YYYY-MM-DD",
              "checked": 39, "wrong": 18, "note": "what was sampled, in a line"}]
```

A model named under `failed` is not proven by this game, whatever
`step_models` in its `game.json` says it ran. `check_docs.py` (through `models.py check`)
fails any game at Silver or above that ran on an unproven model and has
no passing `verification`. Once the game is merged, its models count as
proven for every run after it.
