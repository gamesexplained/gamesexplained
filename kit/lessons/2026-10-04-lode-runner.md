## 0.0.113 · 4 October 2026 · Lode Runner · jankfoundry with Codex

An indexed table's declared length does not bound what the engine reads.
Enumerate the caller's whole normal range, including sums and pitch
transpositions, before describing the lookup or porting it. The Black
Label engine adds difficulty to guard count before indexing an eleven-byte
directory. Ordinary play can reach five adjacent threshold bytes. Its
music player also transposes pitches beyond a 37-entry frequency table,
reading six neighboring bytes from each frequency page. A port that clamps
either index makes a more regular system than the original game.

Caller ranges and adjacent reads belong in the port comparison, with
player reachability kept separate for inputs that were only forced.
The proposed verify-skill addition stays under Candidates in this game's
kit-feedback.md until a second game establishes its broader applicability.

A resource browser also needs the loader's alignment. Comparing with an
earlier cartridge analysis exposed a two-cell shift in the disk maps:
the disk reader discards one byte before filling its packed-room buffer.
The page had decoded raw sector offset zero rather than one. The native
room-one buffer established the alignment; executing the original reader
and decoder for every room in all three disks checked the complete set.
The existing minisite rule about drawing from runtime memory prompted
that check. Its proposed transfer-boundary addition also stays under
Candidates until a second game establishes its broader applicability.
A page-specific regression rejects offset zero and compares the actual
embedded board data with the original decoder, rather than checking only
the dimensions of a reconstructed map.
