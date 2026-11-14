# Story intro — technical facts

The boot program unpacks to `$0800-$C377`, jumps to the drive-code uploader at `$C000`, and reaches the story entry at `$7B3D`. A stopping execution checkpoint captured that entry as `work/entry.vsf`. This part is independent of the resident gameplay engine, which has not been loaded at this point. Its authored story, music and picture sources occupy `$0800-$A817`. The host-loader source at `$A818-$AB17` and uploader/drive code at `$C000-$C377` are loader material; later picture and display buffers are generated workspaces.

## Pictures and text

Sixteen compressed pictures occupy `$0810-$7B3C`. Split low/high directories at `$90AC/$90BC` choose the source; `$90CC/$90DC` choose its endpoint after copying to `$C000`. The final ten bytes initialize `$F6-$FF` for the backwards literal/back-reference decoder at `$8E54`. Its writer is `$8F70`. A VICE store watchpoint on `$D8BF` stopped immediately after that instruction; a subsequent execution checkpoint at `$8FE2` allowed comparison of all 6336 output bytes at `$C000-$D8BF` against the CPU decoder, with exact equality. The sixteen decoded sources supply the Graphics tab.

The drawing loop at `$7E2D` copies each picture into rows 320 bytes apart, using width, height, position and colour directories at `$90EC-$919B`. Pictures seven and eight omit the border. The other pictures use eight frame glyphs at `$9484-$94C3`. Attribute staging occupies `$BB00-$BEFF`; the fade routine at `$8DE7` traverses the 1024 screen bytes at `$DC00` with an odd step selected from a CIA timer. Nonzero A selects fade-out; zero selects the staged attributes.

The story source `$94C4-$A243` uses rolling keys. Reader `$7FD0` computes `((source XOR $0277) - $0801) XOR $1B`, with byte wrapping and an explicit SEC. It then XORs the third key into `$1B`, adds the new `$1B` into `$0801`, and XORs that sum into `$0277`. Initial keys are `$79/$13/$D3`. A read watchpoint on `$94C4` and instruction stepping through the reader confirmed the first decoded character is space `$20`.

The stream contains sixteen `$FF` picture markers and the narrative of the Avalon 1, Bren McGuire and the Machine. A final byte decodes as `$01` after the last picture marker; it is outside the completed story display. The source pointer would stay fixed on a decoded zero, but this stream contains no such hold read. Ninety-one eight-byte font glyphs begin at `$91AC`. The IRQ folds lowercase letters to uppercase and shifts generated text through eight sprites at `$0400-$05FF`, inserting a character every eight scroll calls. Joystick-left invokes the scroll routine a second time. Fire on either joystick port leaves the story.

## Loading display

On exit, `$7C3E` hides I/O and copies eight 64-byte sprite shapes from `$A29B-$A49A` to RAM `$D800-$D9FF`. These writes reach bitmap RAM under the I/O area, rather than colour RAM. It installs the loading IRQ at `$CC00` from source `$8FE5` and copies the host loader to `$6900-$6BFF`. The loading main source at `$905D` runs at `$CC78`: it loads resident file `..`, fades the intro music, loads title file `9%`, then requests one raw score block at track 18, sector 18 into `$67FF`. The loading IRQ continues the intro music while its flag permits and animates the eight sprites.

## Music

The intro uses the ROMUZAK driver, with entries `$8000` initialize, `$8003` update and `$8006` stop. Its own credit at `$8208` names Oliver Blasnik and Digital Marketing. Six-byte headers at `$8A46-$8A75` hold three voice-order pointers each. Selector zero has the populated introduction composition. The seven other headers point to zero/`$FF` order pairs. All eight stored selectors are represented by the music viewer, with the empty ones labelled explicitly.

Sixty-four pattern pointers at `$8A76` select ten multi-byte patterns and 54 single-byte `$FF` endings. Eighteen eight-byte instruments start at `$8AF6`. Eight waveform/pitch sequence pointers start at `$8160`. The driver has separate order transpose, repeat, instrument-offset, duration, gate, portamento, pulse, filter and vibrato logic. Its checksum lookup at `$89EE` can read driver bytes through base `$8188`; the music payload therefore preserves that region. A gameplay or protection interpretation of that checksum remains open.

No whole intro replay or optional mechanics proof was performed. The checks above stop at the individual reader or writer needed to settle its behaviour.
