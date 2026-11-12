# Resident story and loader stash

The snapshot `work/copied.vsf` stops at `$1000` immediately after the forced airshaft-success route copies RAM beneath I/O into lower memory. At that stop `$D000–$DBFF` matches `$1000–$1BFF` byte for byte and `$DC00–$DFFF` matches `$0400–$07FF` byte for byte. The source `$D000–$DFFF` is identical in all seven scene snapshots. The three gameplay-load write maps in `orientation.md` record no RAM writes to that range. The other parts exclude those captured bytes from their own coverage so the stash is counted here once.

The source’s other consumers, its origin at boot, and the ranges loaded over it in each scene remain open. The entry and call sequences copied to `$1000–$117E`, and two display-setup paths copied to `$117F–$11F6`, are described in the stash listing. The byte at `$11DD` and the purpose of most called routines remain open.

The copied code at `$11F7` and `$1216` calls KERNAL SETLFS, SETNAM and LOAD for the nine-byte filename `SIDE FLAG`, then reads `$2000`. Two identical 120-byte messages at `$125F` and `$12D7` ask the player to turn the disk over and press fire. The routines at `$11A2` and `$11DE` can display the messages and repeat the reads according to the returned value, but the setup paths at `$119F` and `$11DA` jump past those checks. This describes the captured Censor code; other entry paths and other releases remain open.
