---
name: 75-review
description: Give the finished minisite to one reader that wrote none of it, with reader.md as its brief, to find what fails a reader and which leads in the notes never reached a page. Fix what holds, record the rest. Silver needs it; a Bronze run skips it.
---

# The reader review

An author reads past the gaps in their own pages, as a model does in its
own listing, so the finished site goes to one reader: an agent that
wrote none of the pages, with [reader.md](reader.md) beside this file as
its brief. Start it once `70-minisite` has built the site and its
browser checks pass. A Bronze run, which builds no full minisite, skips
this step.

One reader is not a fan-out: start it without asking and run it alone,
as `60-verify` runs its checker, which keeps to a contributor's "one
agent at a time". Run it on the model the contributor named for
checking (`kit/START.md`), started the way `60-verify` starts a checker,
or else on the strongest model the session has. Its model goes in
`game.json`'s `step_models` under `75-review`.

Then settle what it reports. Fix each weakness that holds, check any
claim a repair adds against the code or a live run, and repeat the
browser and routine checks a repair touches. A finding you decide
against gets one line saying why. A lead the reader found missing from
the list joins it, with its outcome. Record in `agent-history.md` the
reader's model, what it found, what changed and what was left.

## Outputs

The reader's findings in `work/reports/`; each one fixed or answered in
a line; the record in `agent-history.md`; the leads list updated for
the pull request's description. The minisite is Silver only once the
repairs are made.
