# The NeverEnding Story — kit feedback

## Lessons and changes

The imported CPU-view listing omitted the authored font beneath KERNAL and the parked loader beneath I/O. Fresh physical-memory snapshots and an entry capture found them. Cold-boot watches identified a retained hidden page as decompressor repair pointers plus a copied tail; watching play alone could not identify its owner. Native checks corrected pointer-field offsets and distinguished previous title-player calls from the installed loader’s instruction operands.

This branch adds a retained-phase producer check and positive bank-conditioned read/store controls to `60-verify`. The VICE workaround notes describe native memory conditions and reattaching disks after snapshots saved without embedded media. The shared imported-label and uncovered-project-block fixes are in kit PR #125.

## Scope and validation

One declared Part-1 command-prompt image, with its boot provenance. Tracked coverage is 49,311/49,311 bytes and the entry/play audit reports no untracked ranges. All 21 captured picture records passed the native blitter comparison; all browser pictures matched independent pixels. The full raster frame matched 104,448/104,448 emulator pixels. Parser outcomes, disabled SAVE/LOAD dispatch, and controlled TAKE/DROP state and overlays were checked live. Later parts and the boot trailer’s meaning remain explicitly open; no later chapter is inferred from a Part-1 slot. The imported models are unknown, so the required maintainer check remains before Silver.

## Timings

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 8 | gpt-6.1-sol | 1 | Booted disk into Part 1 command input; fresh code and word bytes match the import. Identified the missing high-RAM text font through the raster split and ROM comparison; rebuilt canonical symbols/listing. |
| 50-coverage | 77 | gpt-6.1-sol | 3 | Single agent; dictionary and operand annotations, loader relocation and hidden-font tracing. Elapsed interval includes user-requested pause, discussion and work on another game; unsuitable as an active-work benchmark. |
| 60-verify | 49 | gpt-6.1-sol | 3 | Bank-conditioned read/store watchpoints with positive controls; title snapshot disk reattachment; Part-1 entry capture and graphic-record pointer correction; Cold boot hidden-page producer and eight repair targets; parked loader and retained music tail; live parser outcomes; positive disabled SAVE/LOAD dispatch |
| 70-minisite | 17 | gpt-6.1-sol | 3 | Restore verified 21-picture browser; native blitter and final pointer checks; independent Firefox pixels; explicit image extents and font-tail comments |
| 80-retro | 5 | gpt-6.1-sol | 2 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run.; Retained boot data and bank-watch controls; snapshot disk attachment notes; complete metadata and verification limits |
| total | 156 | gpt-6.1-sol | | 2.6 h of work, over 25.8 h |

The first coverage interval includes a requested pause, discussion and another game’s work; its 77-minute sum is unsuitable as an active-work benchmark. A cold-boot producer watch with verified bank conditions would have saved the most time in this verification pass.

## Maintainer asks

Existing discussions #113 (imports) and #124 (multiple states); no new rule or delivery change is requested. The PR requests the maintainer check required by `kit/CHECKING.md`.
