# Super Wonder Boy in Monster Land — TODO

The run is in progress and has no published tier. The requested Silver needs every part explained and verified; the imported listing was produced by an unproven model and needs the maintainer check described in `kit/CHECKING.md` before Silver can be recorded.

- Reconcile the forced load ranges with the unpacker stream ends and natural play. Determine whether each load contains shared data or overshoot, and count each owned byte correctly.
- Restore or attribute the four older resident annotations at $BE84, $FAC0, $FD30 and $FD50 only after checking the corresponding state. The prior map is saved under resident `work/`.
- Carry the resident title character-set ledger range $C800–$CFFF and the scroll-copy comments at $61D8–$67E6 and the motion-reader comment at $6A3A and the terrain-sample comment at $60D7 and the view-grid comment at $6EA9 into the disassembler project and export settings. Classify the uncounted resident data under I/O; work through each part's coverage queue and verify its imported annotations. The later loads' pre-audit maps are in their `work/` folders; their disassembler projects must be rebuilt from the corrected `symbols.json`, without replaying the rejected imported names and types.
- Complete the feature and text investigations, independent listing sample, facts, minisite, retrospective and metadata. Build and run the required checks before committing.
- Push through the contributor fork and open the pull request when the work is ready.
