# Count Duckula — orientation

## Image and tools

The analysed image is the ICS release linked at https://csdb.dk/release/?id=245597, downloaded with the contributor's permission. It is a 174,848-byte D64 sector image. Its directory contains one PRG named DUCKOLA, loading at $0801, 46,392 bytes including the load address. There are no allocated sectors outside its file and directory.

VICE runs headless with Sound=1 and SoundDeviceName="dummy" in the repository-local configuration. The installed vice-mcp build identifies through its source checkout as github.com/64kramsystem/gamesexplained, branch game/c64/fantasy-world-dizzy, commit cfc184e9; the executable is the local headless v3.14.0 build. The emulator health check passed 56 checks and failed host-key delivery and its final quirk-probe exception. Matrix keys, exact stops, watchpoints and deterministic snapshot restore passed. The frame recorder crashes this build during its instruction-stepping phase; the game's targeted store watches work. regenerator2000 0.9.20 answers on port 3000.

## From power-on to play

1. Hard-reset VICE, autostart DUCKOLA from the D64, and let the load finish. If Space was held during loading and BASIC returns READY, release it and type RUN followed by Return.
2. At the first ICS logo hold Space through several frames, release, and allow the next intro to finish unpacking. At the illustrated ICS intro hold Space again and release. No trainer options were selected.
3. This packed release restores a running title state. A stopping execute checkpoint covering $2480-$24E9 first reaches $24D2, the title idle loop. Set the processor DDR to $2F, port to $35, SP to $FF and PC to the game's own start at $2480 to rebuild its setup. Save this as work/entry.vsf before executing the start. It contains the complete resident game before its own setup runs.
4. Run 300 PAL frames. Hold port-2 fire for 300 more, then release. The opening scene shows Duckula outside the pyramid, beside the castle. Save work/clean-play.vsf. The canonical listing snapshot work/play.vsf is the earlier equivalent opening-room capture. Title state is retained as work/title.vsf.

## Steady state

The processor runs with port $35: RAM under both ROMs, with I/O visible. The interrupt chain uses the hardware vector at $FFFE, including gameplay $24F1 and the actor multiplexer $29BE. Title uses $5B23; start transition uses $5884 then $5A77; endings use $374F. Register restoration is shared at $24EA. The main code idles at $24D2 while interrupts do the work.

The engine is one resident part. Forty-eight 200-byte room maps occupy pages $70-$9F, and the 78-position directory is at $FF40. Tile and object data are already present; room changes redraw from RAM. The sole disk file is packed and does not match the expanded game in contiguous file chunks, so its media answer is packed resident part rather than a direct file-to-RAM copy.

## Loader

The single file passes through two cracker intros and unpacking stages, then restores the title's machine state rather than entering $2480. Restarting at the retained game start rebuilds its interrupts and display. The listing comes from the resident image after the intros. The intros and packer are outside the explanation's scope; their code is not attributed to the game. Reference screenshots distinguish the intros from the game title.
