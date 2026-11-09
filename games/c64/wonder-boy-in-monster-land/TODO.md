# Super Wonder Boy in Monster Land — TODO

The run is in progress and has no published tier. The requested Silver needs every part explained and verified; the imported listing was produced by an unproven model and needs the maintainer check described in `kit/CHECKING.md` before Silver can be recorded.

- Reconcile the forced load ranges with the unpacker stream ends and natural play. Determine whether each load contains shared data or overshoot, and count each owned byte correctly.
- Restore or attribute the four older resident annotations at $BE84, $FAC0, $FD30 and $FD50 only after checking the corresponding state. The prior map is saved under resident `work/`.
- Carry the resident character-set range $C800–$CFFF, and sprite ranges $D800–$D83E, $D840–$D87E, $D8C0–$D8FE, into the disassembler export settings. Filter automatic I/O aliases inside the counted sprite bitmaps.
- Carry the resident comments at $4250, $60D7, $61D8–$67E6, $6A3A, $6EA9, $7B2A, $CB08 and the 25 sound-pattern comments at $2619–$291E into the disassembler project; carry the first-load map row blocks and comments at $8671–$8C10 and comments at $ACC7–$AFC7, sound-pattern comments at $B03D–$B159 and character-source labels and comments at $9011 and $B9C4 into its project.
- Classify the adjacent title bytes $D4C0–$D4FF, sprite bytes $D87F–$D8BF and $D8FF, and the remaining resident RAM under I/O. Work through each part’s coverage queue and verify its imported annotations. The later loads’ pre-audit maps are in their `work/` folders; rebuild their disassembler projects from corrected `symbols.json` without replaying the rejected imported names and types.
- Complete the feature and text investigations, independent listing sample, facts, minisite, retrospective and metadata. Build and run the required checks before committing.
- Push through the contributor fork and open the pull request when the work is ready.
