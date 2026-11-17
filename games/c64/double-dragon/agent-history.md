# Agent history

## 17 November 2026 — both disk versions, fresh worktree

Goal: a single Silver entry for the AD and TO variants. The checkout had unrelated work, so this branch started at upstream main in a separate worktree. No prior Double Dragon game folder or matching branch was found on the configured remotes.

The sandboxed VICE launch crashed during GTK/OpenGL startup and sandboxed clients could not connect to loopback. The installed GUI and kit client worked when launched with the local tool permission. The fully qualified build passed all 57 checks. Regenerator2000 answered on a three-byte test PRG (load header and RTS), then on both game snapshots through the part sessions. No tool installation or downloads were needed.

TO made its title through the first disk entry with warp. AD showed LOADING without reaching the title in the first attempt, so VICE selected the unmodified disk's second directory entry. Both disks then reached gameplay using the real key 1. Both were driven through each of the six level resources and the ending, first from an initial fixture and then in order, with the requested index and game flag changed but all loading and setup left to the game. The second run caught a real ownership distinction: L2 onward inherited the alternate tiles from L1.

The file ledger deduplicates the eight common resources and tracks TO's extra allocated sector. The title and game-over differences were visible, and the snapshots support separate TO/AD loader notes around the shared gameplay engine. The map test checked 69,120 cell/colour pairs, and the bounded sound test matched 29,760 SID writes between builds. Listing coverage is incomplete.

An opening-state input matrix checked nine directions with fire at each facing against both original disks. The live stops on the action byte agreed all 36 times. The written manual and the contemporary review identify additional cases to reproduce. The disk ledger accounts for the six level files and both titles. TO track 35 sector 9 contains the same repeated-byte sector as AD, despite the allocation difference.
