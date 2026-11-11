# Super Wonder Boy in Monster Land — TODO

All 490,491 counted bytes have descriptions. The requested Silver still needs the maintainer check described in `kit/CHECKING.md` because the imported listing was produced by an unproven model. Eight byte roles and the ordinary-play limits below remain explicit, rather than inferred from forced tests.

## Submission and review

- A maintainer must perform the listing check in `kit/CHECKING.md` before recording Silver. The imported analysis includes an unproven model, so the published tier remains Bronze with the pending-check banner.
- A full audit is recommended. The independent sample found one wrong detail in 60 comments; that detail was corrected. Later annotation is recorded separately.

## Open investigations

The following questions stay explicit where the evidence does not settle them. A bounded forced test does not establish an ordinary-play route.

- Find which entity type’s contact handler is `$7646`, the code that runs the hourglass backwards, and watch the hourglass in play: its seven pictures, the heart it costs, and the doubled count in a pool (`facts.md`, “The hourglass”).
- Check whether two-player play can start. The resident code clears the two-player flag at `$4DBC` (`$0378`) and no traced instruction sets it; the title code and the release’s trainer have not been ruled out. If it can start, the area setup at `$6C73` adds 8 to the first player’s meter while the first hourglass tick takes 8 from the selected player’s.
- Establish the natural routes to the forced loads, classify bytes after the two decoded streams in the extracted disk files and their transfer and determine ownership of repeated data across loads. The two decoded streams reproduce each recorded write range and its entry snapshot, including four post-load patches; `stream-boundaries.json` records the bounded result.
- Restore or attribute the four older resident annotations at $BE84, $FAC0, $FD30 and $FD50 only after checking the corresponding state. The prior map is saved under resident `work/`.
- Preserve the resident automatic labels when rebuilding its disassembler project: the reseeded project exports without losing tracked bytes only after those labels are carried into it. Establish whether the effect slot searches can run with fewer than four free slots and what follows if they do.
- Trace the remaining item callback effects, other entries to the purchase choice, the shop gate byte, the mode’s ordinary-play range, whether the controlled 13.16-second shop timeout applies in play, and the item indices reached in play. Determine the role of the triangular message glyph $60, find message records reached through other pointer patterns, and establish their ordinary-play contexts. Determine why the eight resident-entry bytes in reflected player masks differ between captures. The later loads’ pre-audit maps are in their `work/` folders. Their corrected maps include sound lists, row pointers, triggers, objects, observed sprite masks, partially recovered update code and the stage-16 dispatch, state handlers and shared routine and four relocated handler copies; retain the corrected project exports without replaying the rejected imported names and types.
- Determine the type-$0D state and alternate-index ranges and natural reachability in loads 8, 9 and 27. Determine the type-$0C state index and natural reachability in loads 8, 10, 26 and 29. Determine the type-$05 state and table index ranges and natural reachability in loads 2, 4, 6, 15 and 17. Determine the type-$01 state index and natural reachability in loads 2, 4, 12, 20 and 23. Determine the type-$04 state, table and alternate-index ranges and natural reachability in loads 2, 4 and 6. Determine the type-$09 dispatcher’s possible state-index range and natural reachability in loads 5, 7, 13, 21, 22 and 24. Establish the stage-16 entity callers’ complete state ranges and natural reachability. Establish the gate timing and natural reachability in loads 25–27. Reach the load 29–31 update entries in play; their bounded character-source probes did not execute them. The per-part `codemap.json` files cover only instruction starts inside the character-source range during the stated probes; load 16 includes two instructions with patched operands.
- Determine the type-$0E state-index range and ordinary-play reachability in loads 9, 11 and 20.
- Determine the type-$03 state and movement-table index ranges and ordinary-play reachability in loads 13, 14, 15, 17, 18, 24, 26 and 27, including whether the asymmetric horizontal arithmetic is encountered.
- Determine the type-$22 state and alternate-slot index ranges and ordinary-play reachability in loads 2, 4, 6, 14, 15, 17, 24 and 25.
- Determine the type-$01 state-index range and ordinary-play reachability in loads 3, 13, 14, 15, 17, 19 and 26.
- Determine the type-$02 state-index range and ordinary-play reachability in loads 13, 14, 15, 17 and 19.
- Determine the type-$2D/$2E state-index range and ordinary-play reachability in load 31, and identify the other uses of their working bytes.
- Determine the type-$2F state range and ordinary-play reachability in load 31, including whether the exact coordinate equality checks can be crossed.

