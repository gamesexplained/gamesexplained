# Fat Worm Blows a Sparky — TODO

Current tier and what is missing for the next one. Coverage gaps from
`coverage.py`. Article ideas.

## Tier

`game.json` records `bronze`. The run reached the Silver-level work — a
100 %-aimed annotation pass, `facts.md`, the minisite — but it ran on
`deepseek-flash`, which is not on `models.py`'s proven list, so the game
cannot be Silver until a maintainer checks a sample of its claims
(`kit/CHECKING.md`). Set `tier` to `silver` there and add `verification`.

## Missing for Silver

- Coverage: done. `coverage.py` reports 100.0 % with **no bare bytes**
  (code 24058/24058, data 14010/14010) and `listing.py` reports no stretch of
  "data the ledger does not count". The 2026-10-01 review's typing pass is
  finished: 5,934 bytes of reachable code that were typed as data now carry a
  `c` block, which brought the listing's routine count from 230 to 349.
- `features.md`: the rows still at **open** (spindles/cloning, the four-bug
  death, de-buggers, Sputniks and Crawlies, the data buses, the difficulty
  ramp) need tracing in the code or a live test.
- `facts.md`: the variable addresses named by the agents (`$8001` heading,
  `$805D` sparkies, `$7FF4/$7FF6` position) are confirmed for `$805D` live
  and should be confirmed for the rest.
- **The review's independent sample was not done.** Its step 1 asks a model on
  the proven list to redo `60-verify` *and* sample the rest itself. The four
  read-only verification agents this session dispatched under
  `claude-opus-5.5` never ran: OpenRouter's credit balance refused every one
  (`402 payment_required`), so what was fixed here rests on the maintainer's
  own byte citations - each one re-read against the image and the simulator -
  and not on a fresh independent sample. `tier` stays `bronze` for that
  reason, not only for the model.
- The minisite's perspective widget was checked in `node` against the Z80
  routine at `$811E` on 3 October 2026, over 789 inputs including every
  boundary case, with 0 mismatches. A browser render was not part of this
  run.

## Article ideas

- The self-overwritten draw-list load at `$AAF3` (a section on the page).
- The single perspective multiply at `$811E` and the 128-byte curve at
  `$6300-$637F`: the whole 3D look is one multiply per extent word.
- The halt screen at `$D05E`, which builds its own 4 KB pattern at
  `$F000-$FFFF` with `PUSH` (`$D37D`) and was never reached by the recorded
  play.
