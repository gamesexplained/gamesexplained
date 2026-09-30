# Alter Ego — facts

## Scope and evidence

The stopped male-edition physical RAM image and the two analysed replacement gameplay spaces. Machine-ROM and crack-introduction overlays are excluded. The complete disk narrative corpus is not embedded in this article.

Technical statements below are traced from the contributor’s accurate disassembly and retained evidence ledger. The validation paragraph identifies checks repeated for publication. A traced claim is not labelled as a new live test.

## Record framing

The live disk record at $8045 has 256 bytes: status, identifier, leading $3A, 252 payload bytes, trailing $3A. The retained host REL record omits the first two bytes and has 254 bytes. $5C3D maps a logical offset to floor(offset/252) and cursor offset%252+3; $5EAD performs the inverse.

## Virtual machine

The resident program uses a virtual machine with native gateways. $6FF4 consumes an inline native target. $7059 instead consumes a workspace count and signed 16-bit stack adjustment, then enters the native body after that header. The root annotations retain the procedure and native routine contracts.

## Compressed scenes

The grouped LZW routines include $A45D, $A4E1, $A4F7, $A850 and $A974. The prefix dictionary is $B57B–$BD7A (2,048 bytes), the suffix dictionary $BD7B–$C17A (1,024 bytes). Generated entries occupy indices 256–1023; entries 0–255 represent literal bytes.

## Save layout

The payload is 380 bytes distributed over seven regions: state $7F40 (128), stage choices $81C5 (48), Life Map $81F7 (180), name $82CB (16), stage $82BD (2), acquisition $82AB (2), and family-episode mask $7FC0 (4).

## Phase replacement

The male gameplay overlay changes $8466–$9991; the female gameplay overlay spans $8466–$CC69. Each is exported in its own address space. Copying either into the first-prompt listing would destroy the provenance of the original occupant.

## Validation

All 65,536 physical RAM bytes were compared with the supplied capture. Overlay bytes and annotations were exported independently from their named Ghidra spaces. The offset calculator was checked around each record boundary and against the inverse mapping. Save region lengths sum to 380. No full-life input replay or new disk save round trip is claimed.

## Import provenance

Source: `alter_ego_full_listing.txt`. SHA-256: `569f63e5e7ac084df3f63ed4863d17fe73b8fb43234d3ea8d37b017ea0a246c6`. Imported 65,536 initialized bytes. The [annotated text export](reference/annotated-listing.txt) retains original labels, references and comments for the selected game spaces. `symbols.json` is the native symbol map; `listing.json` is its searchable Source representation.

## Publication checks

The native Source rows reproduce every initialized byte of the selected physical listing. The browser pass exercised all article controls and the Source tab in Firefox 157.0, with no script errors and no horizontal overflow at a 390-pixel viewport. These checks do not establish a full-game input route.
