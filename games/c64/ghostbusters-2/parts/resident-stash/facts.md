# Resident story and loader stash

The snapshot `work/copied.vsf` stops at `$1000` immediately after the forced airshaft-success route copies RAM beneath I/O into lower memory. At that stop `$D000–$DBFF` matches `$1000–$1BFF` byte for byte and `$DC00–$DFFF` matches `$0400–$07FF` byte for byte. The source `$D000–$DFFF` is identical in all seven scene snapshots. The three gameplay-load write maps in `orientation.md` record no RAM writes to that range. The other parts exclude those captured bytes from their own coverage so the stash is counted here once.

The source’s other consumers, its origin at boot, and the ranges loaded over it in each scene remain open. The entry and call sequences copied to `$1000–$117E`, and two display-setup paths copied to `$117F–$11F6`, are described in the stash listing. The byte at `$11DD` and the purpose of most called routines remain open.

The copied code at `$11F7` and `$1216` calls KERNAL SETLFS, SETNAM and LOAD for the nine-byte filename `SIDE FLAG`, then reads `$2000`. Two identical 120-byte messages at `$125F` and `$12D7` ask the player to turn the disk over and press fire. The routines at `$11A2` and `$11DE` can display the messages and repeat the reads according to the returned value, but the setup paths at `$119F` and `$11DA` jump past those checks. This describes the captured Censor code; other entry paths and other releases remain open.

The routine copied to `$134F` selects RAM under I/O with `$01=$34`, copies `$DC00–$DFFF` to `$0400–$07FF`, then writes `$36` to `$01`. This is a second copy path visible in the stored code; the separately observed transition in `orientation.md` copies the same source pages at `$02A7`.

The routine copied to `$13B4` clears `$4000–$53FF`, initializes screen and colour bytes, sets sprite positions, and fills the eight sprite pointers and colours. It writes `$01=$35` before accessing the video registers, so the store at `$13EA` reaches the VIC at `$D000` rather than the hidden-RAM stash at that address.
