# Broadway alternate disk

`work/entry.vsf` is the Jondi/Censor disk handover at `$8009`, reached from the forced second-story route in `../../orientation.md`. The decompressor output matches all 56,695 stable bytes in that snapshot. Compared with the Censor handover, the ranges `$2B00–$CEFF`, `$E000–$EF76` and `$F000–$F7FF` match exactly and are counted in the Broadway part. The alternate backdrop and coordinate data at `$0900–$2AFF` differ and are accounted for here.

After 32 neutral frames from entry, the machine was waiting for fire at `$CA03`. Two fire frames reached the game-loop wait at `$82A2`; that state is `work/play.vsf`. The `$0900–$1F7F` backdrop and `$2000–$2AFF` coordinate data are unchanged between these two snapshots. The Levels tab can show the alternate backdrop using the shared character set; the coordinate data still needs analysis.
