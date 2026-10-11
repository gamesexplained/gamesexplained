## next · 2026-10-11 · Valhalla (ZX Spectrum) · air with Claude

- **Plan for the audit.** 16 of the 17 games with a first sample of
  listing comments on record had more than two wrong in 60, typically one
  in eight, and correcting only the sampled comments never brought a
  listing under that. A run now samples, audits every comment, and
  samples again with a new seed, until a sample has at most two wrong in
  60. Silver needs only the first sample: the page says what the last
  one found, and flags a listing that has not been audited or whose last
  sample is over the mark, so a run on a tight usage limit can publish
  sooner and say so.
- **A sample sees what its checker sees.** On a test of 60 of Valhalla's
  comments with 20 known errors, the strongest model tried found 16 or
  17 in every run and the weakest 4 to 7; a model from a second provider
  found three errors that every run on the first provider's models had
  passed, and two of the full audit's own corrections were still wrong.
  Every checker now works from one brief, `60-verify/checker.md`, on the
  strongest model the contributor has, and each sample records which
  model checked it. On the same test the brief took the strongest model
  from 16 or 17 to 18 in each of two runs, with no false alarm.
