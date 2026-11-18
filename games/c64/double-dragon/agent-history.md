# Agent history

## 17 November 2026 — both disk versions, fresh worktree

Goal: a single Silver entry for the AD and TO variants. The checkout had unrelated work, so this branch started at upstream main in a separate worktree. No prior Double Dragon game folder or matching branch was found on the configured remotes.

The sandboxed VICE launch crashed during GTK/OpenGL startup and sandboxed clients could not connect to loopback. The installed GUI and kit client worked when launched with the local tool permission. The fully qualified build passed all 57 checks. Regenerator2000 answered on a three-byte test PRG (load header and RTS), then on both game snapshots through the part sessions. No tool installation or downloads were needed.

TO made its title through the first disk entry with warp. AD showed LOADING without reaching the title in the first attempt, so VICE selected the unmodified disk's second directory entry. Both disks then reached gameplay using the real key 1. Both were driven through each of the six level resources and the ending, first from an initial fixture and then in order, with the requested index and game flag changed but all loading and setup left to the game. The second run caught a real ownership distinction: L2 onward inherited the alternate tiles from L1.

The file ledger deduplicates the eight common resources and tracks TO's extra allocated sector. The title credit difference was visible, and the snapshots support separate TO/AD loader notes around the shared gameplay engine. The map test checked 69,120 cell/colour pairs, and the bounded sound test matched 29,760 SID writes between builds. Listing coverage is incomplete.

An opening-state input matrix checked nine directions with fire at each facing against both original disks. The live stops on the action byte agreed all 36 times. The written manual and the contemporary review identify additional cases to reproduce. The disk ledger accounts for the six level files and both titles. TO track 35 sector 9 contains the same repeated-byte sector as AD, despite the allocation difference.

The stored scenery was rendered across all 240 columns and 51 complete rows. The level file's cell format, colour table and tile definitions are kept beside the renderer, with a test that checks 80,640 character and colour cells through the original rendering routine. The graphics viewer follows the pointer and colour convention from the opening scene and includes the three replacement banks at $D000. The SID player matches register writes and timings from both native game images run on the kit's 6502. The first two-player contact sweep used the original right-side attack branch with positions varied independently.

The first game-over test checked only TO's drawing address on the other edition. Reading the AD loader exposed a separate text copy at $1540. The second live test stopped in its delay and proved that AD draws the same message as TO. The two screenshots have identical pixels.

## 18 November 2026 — coverage, sample and reader review

The temporary worktree was cleared. The two existing commits and VICE's retained capture cache recovered all 13 exact listing snapshot hashes. I restored the disassembler annotation batches into the ignored tools worktree and saved an intermediate commit. The finished ledger tracks 152,247 bytes across 13 parts. Runtime exclusions are recorded with the code that initializes them. The TO-only staging storage belongs to the TO loader.

Independent listing checker gpt-6.1-sol returned 77 right, two wrong details and one unsupported comparison. I compared the three findings with the code and captures, corrected all three and recorded the sample in facts and game metadata. The sampled listing had no full audit.

Independent reader gpt-6.1-sol reviewed all six generated tabs and compared the article with the source notes. The browser backend was unavailable in that session. I replaced the findings' test narration with worked examples, linked the two facing-dependent routines, clarified the clear cue and the ending input, and gave the camera and animation viewers comparisons the reader can try. I added the status font and scenery replacement to the explanations and kept bank selection stable for the same pair. The clipped-waist detail remains in the layer demonstration, with the switch timing described beside it. The map-based fire exception and co-op camera limit were kept as follow-up leads because their live effect was not replayed.

I tested Play, Pause and Next pose in both animation players in the browser. At 390 pixels wide I checked the stage bank and enemy slot comparisons, player move step, outline toggle, retained sprite pair, map position and grid, Source search, and About. Both pose viewers remained within the viewport width.
