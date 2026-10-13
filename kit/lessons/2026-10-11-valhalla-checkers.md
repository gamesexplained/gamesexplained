## next · 2026-10-11 · Valhalla (ZX Spectrum) · air with Claude

- **Measure once, and recommend the audit.** 16 of the 17 games with a
  first sample of listing comments on record had more than two wrong in
  60, typically one in eight, and correcting only the sampled comments
  never brought a listing under that: it takes an audit of every comment
  and a new sample after it. That costs a large part of a run, while
  100 % coverage is most of what a page is worth, so a game's first run
  takes one sample, corrects what it found, and recommends the audit for
  a later run. Silver needs only the sample: the About tab shows every
  step behind the listing in a table, with the models that did it, and
  the Source tab says when a listing has not had a full audit or its
  last sample is over the mark.
- **A sample sees what its checker sees.** On a test of 60 of Valhalla's
  comments with 20 known errors, the strongest model tried found 16 or
  17 in every run and the weakest 4 to 7; a model from a second provider
  found three errors that every run on the first provider's models had
  passed, and two of the full audit's own corrections were still wrong.
  Every checker now works from one brief, `60-verify/checker.md`, on the
  strongest model the contributor has, and each step records which
  models did it. On the same test the brief took the strongest model
  from 16 or 17 to 18 in each of two runs, with no false alarm.
- **A maintainer's check is a sample and an audit.** The check of a run
  on an unproven model used to test 39 claims and fail on one wrong. A
  listing at 5 % wrong, about where one sits after a full audit, comes
  through 39 clean only about one time in seven, so the check failed good
  runs too, while the run's own sample, on its own weaker model, missed
  more of its errors. The maintainer now samples the listing on a proven
  model, audits every comment and `facts.md` when the sample is over the
  mark, and samples again; the rows go in `accuracy` with their `by`. A
  game checked this way proves no model, and the maintainers declare one
  in `kit/models.json` when its samples earn it.
