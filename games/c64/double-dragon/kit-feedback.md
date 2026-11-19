# Double Dragon — kit feedback

## Skill text that changed what I did

- `12-media`: "every run of sectors the disk's map marks as used that no file holds": the ledger kept TO track 35 sector 9 visible after the named files had been listed.
- `15-parts`: "The game's own loader puts the part in memory": the recorded scenes preserve the earlier level's alternate character set through later loads.

## What was changed in the kit

None.

## Candidates

Loading one overlay from the opening snapshot can leave bytes from the opening level where a natural route would retain bytes from an intermediate overlay. The ordered capture caught this at `$8600–$8DFF`, which stays loaded after L1. Compare the payload ranges along both routes before using a direct jump as a reference for other levels.

A checkpoint from one build can give a false negative on another. The TO Game Over drawing address never ran in AD, whose loader uses a different address to draw a pixel-identical screen. Compare the visible result and look for the corresponding writer in each build before calling a feature absent.

## Maintainer asks

None.

## What cost the most time

A before-and-after report of pages changed by a native disk load would have made persistent data easier to distinguish from the new payload. The overnight cleanup also removed the temporary checkout. VICE retained the exact snapshots in the installed tools folder, but the pending analysis had to be restored. A checkout under the ignored tools folder keeps the work alongside its captures.
