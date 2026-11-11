# Stop the Express — kit feedback

## Skill text that changed what I did

- `kit/skills/c16/tool-regen2000`: "Give the range back with": included the unpacked Plus/4 high RAM explicitly instead of accepting the C16 coverage defaults.
- `kit/skills/core/60-verify`: "Comments a program wrote": sampled generated tile/phrase comments separately from the handwritten comments so repetition did not dominate the measurement.
- `kit/skills/core/70-minisite`: "Sweep the whole input space": tested every round byte from 1 to 255 and found the carriage addition wrapping at 252.
- `kit/skills/core/60-verify`: "Prove reachability with inputs, not pokes": described round zero and the stage-two captures as forced probes instead of claiming an achieved playthrough.
- `kit/skills/core/70-minisite`: "The comparison that counts": compared all 64,000 rebuilt display pixels with the emulator picture; all matched.

## What was changed in the kit

- `kit/scripts/build.py`: a C16-platform game declaring `ram_kb: 64` gets a full Plus/4 memory footprint and correct caption; existing 16 KB games retain their span.
- `kit/scripts/test_build_plus4.py`: tests both spans, both captions, an unrelated platform, non-64-KB listing sizes, and high-RAM code classification with coverage restored.
- `kit/skills/c16/steps/SKILL.md`: the footprint instructions name the new metadata field instead of asking each Plus/4 run to widen a platform-wide constant.

## Candidates

None. The sampled mistakes fall under existing rules about tracing exact
addresses, exceptions, and loop conditions. They do not justify another
copy of those rules.

## Maintainer asks

- #874: preserve confirmed Plus/4 high-RAM instruction fetches in code-map exports.

## What cost the most time

An exporter that preserves instruction fetches known to come from Plus/4
RAM under the ROM addresses would have avoided the separate high-RAM
code-map exporter and repeated reconstruction.

## Environment and visible limitations

Linux x86_64, Python 3.12.3, plus4emu 1.2.11 (939e652), and
regenerator2000 0.9.20. Existing local tool binaries were copied under this
clone's tools directory. Both C16 and Plus/4 PAL instrument runs passed
46/46 checks; the game was analysed on the Plus/4. The tool-footprint check
reported no unexpected external writes. Catalogue screenshot requests
returned HTTP 465, so the pages use captures of the supplied program.

The base disassembler misreads undocumented opcode $BF. The canonical
listing uses the kit decoder; the native presenter uses LAX correctly.
The code-map high-address limitation is already documented in the platform
notes; the ask concerns removing the need for a per-game exporter.
