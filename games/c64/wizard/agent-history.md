# Wizard — agent history

## Setup and orientation, 2 October 2026

The contributor chose Silver, authorised web research, the pull request and maintainer issues, and approved the official vice-mcp v3.13.2 download. They supplied Wizard for C64 as `wizard.g64` and `wizard.nbz`, and identified the session model as GPT-6 Astra Extra High (`gpt-6-astra`). Commits use the verified GitHub noreply identity for jankfoundry.

Ports 6510 and 3000 already served other sessions. Added clone-local ports in the ignored `tools/mcp-ports.json`, using 6511 and 3001 here. VICE accepts a configurable port; regenerator2000 0.9.20 has a fixed HTTP port but supports stdio. A small loopback HTTP adapter runs its stdio server on a project generated from the same snapshot RAM and schema as `symbols_import.py`. Copied the contributor's existing crates.io installation of regenerator2000 locally; no Rust installation was needed.

`verify-footprint` first reported a file changed by another simultaneous game session; a second complete launch/use/exit passed with no unexpected outside files. The launcher and dispatcher tests passed. The first emulator test stopped after 33 and then 12 passes per host second, incorrectly saying the program never ran. The startup check now tests positive progress, leaving the existing frame checks to measure exact progress. The complete run passed 54 of 57 checks. The three failures were host-throughput thresholds: watch-store and watch-load each counted 39; warp counted 71 passes/s versus 46/s normal. Exact stops, all frame checks, instruction-safe pauses, and snapshot determinism including restart passed. Use controlled emulated-time probes for game claims.

Original manual downloaded to ignored work storage and read before game code. External title and high-score references saved from C64-Wiki. No game binaries downloaded.

The original image passed the illustrated introductions, then repeated the protection loop at $1947–$1961. $19A3 reads 128 bytes from track 3, sector 3 and XORs them into $7000; the loader waits for $7000 to become $4C. True-drive reads had left one half (first byte $44) there; the emulator's direct sector decoder exposed the other half (first byte $08). Their XOR is a table of forty-one JMP instructions followed by engine code, with targets in the loaded machine-code image. To avoid spending the run on protection, stopped at $195C, applied precisely that XOR from the supplied disk, and resumed with the stack and loader flow unchanged. This is an emulator-memory loader assist, not a changed disk. Saved the two inputs and result privately in work/loader-assist.json and the stopped loader snapshot in work/loader-protection-complete.vsf.


## Coverage, overlays and verification

The apparently large data tail was compiled bytecode. Decoding all runtime handlers yielded 4,068 GAME operations, plus 3,830 in the separately loaded BLDR overlay. The editor DATA established monster names and limits. The canonical resident ledger reached 45,560/45,560 bytes; disk overlays are documented separately rather than substituted into that snapshot.

Tracing all forty level files found twenty active treasure callbacks, including routines that extend into unused patch/header space. A twenty-first nontrivial prefix in L35T starts with RTS and is retained as an open dormant fragment. The interpreter literal-dispatch vectors, self-modified operand labels and ROM-call aliases under sprite RAM required separate ownership comments. A filename-offset hypothesis was corrected: LnnT occupies $8AB7–$8ABA without a zero terminator.

A first pickup experiment wrote the foot-support cell rather than the lower-side collectible probe and did not collect anything. Breaking at the collection routine located the correct sampled cell $C693; matched snapshot tests then verified key, reward and life-threshold behavior. Freeze and six-player menu tests passed. Pause screenshots were retaken after allowing recoloring to finish.

Frame capture exposed a phase-inference bug when a frame has no video writes: two equal line numbers can be a whole frame apart. The kit now uses elapsed cycles to unwrap those samples, with five regression cases. The rebuilt Playground frame matches all 104,448 visible pixels. Separate original-code tests passed 158 score, movement and sound comparisons.

The article and forty-map atlas were built before a distinct copy rewrite pass. Browser checks exercised controls, all forty maps and five effect buttons at desktop and mobile sizes. The only first-pass console failures were missing favicons; explicit icons were added to the authored pages.
