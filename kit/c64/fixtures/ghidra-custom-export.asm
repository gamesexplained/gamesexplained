;==============================================================================
; synthetic-import-fixture
;------------------------------------------------------------------------------
; language:      6502:LE:16:default
; compiler:      default
; image base:    0000
; sha256:        8e67c81a6146b2c82c5c1b12a9b166e69b778732676256cab1e7301bd7eb3bd7
; md5:           6464452a6ac34f7e44e3b291e81f90a2
; range:         0000 - 01ff
; range:         1000 - 1010
; range:         2000 - 2001
;------------------------------------------------------------------------------
; block ZERO_PAGE           0000 - 00ff  rw-  uninitialized
; block STACK               0100 - 01ff  rw-  uninitialized
; block RAM                 1000 - 1010  rwx  initialized
; block scratch             2000 - 2001  r--  uninitialized
;==============================================================================

0000                                      ??        ?? uninitialized
0010                                      ??        ?? uninitialized
0020                                      ??        ?? uninitialized
0030                                      ??        ?? uninitialized
0040                                      ??        ?? uninitialized
0050                                      ??        ?? uninitialized
0060                                      ??        ?? uninitialized
0070                                      ??        ?? uninitialized
0080                                      ??        ?? uninitialized
0090                                      ??        ?? uninitialized
00a0                                      ??        ?? uninitialized
00b0                                      ??        ?? uninitialized
00c0                                      ??        ?? uninitialized
00d0                                      ??        ?? uninitialized
00e0                                      ??        ?? uninitialized
00f0                                      ??        ?? uninitialized
0100                                      ??        ?? uninitialized
0110                                      ??        ?? uninitialized
0120                                      ??        ?? uninitialized
0130                                      ??        ?? uninitialized
0140                                      ??        ?? uninitialized
0150                                      ??        ?? uninitialized
0160                                      ??        ?? uninitialized
0170                                      ??        ?? uninitialized
0180                                      ??        ?? uninitialized
0190                                      ??        ?? uninitialized
01a0                                      ??        ?? uninitialized
01b0                                      ??        ?? uninitialized
01c0                                      ??        ?? uninitialized
01d0                                      ??        ?? uninitialized
01e0                                      ??        ?? uninitialized
01f0                                      ??        ?? uninitialized
                ;**********************************************************************
                ; Load the synthetic counter.
                ;**********************************************************************
entry:
load_operand:  ; offcut at 1001
                ; XREF[1]: 1006(j)
                ; XREF from[1]: 1000(R)
1000            ad0e10                    LDA       counter  ; Synthetic side comment.
                ; XREF from[1]: 1003(c)
1003            200910                    JSR       SUB_1009
                ; XREF from[1]: 1006(j)
1006            d0f8                      BNE       entry
1008            60                        RTS
SUB_1009:
                ; XREF[1]: 1003(c)
                ; XREF from[1]: 1009(RW)
1009            ee0e10                    INC       counter
100c            60                        RTS
100d            00                        ??        undefined
counter:
                ; XREF[2]: 1000(R), 1009(RW)
100e            07                        byte      7h
                ; One-byte synthetic counter.
                ;**********************************************************************
                ; A two-byte synthetic value.
                ;**********************************************************************
table:
100f            0123                      word      2301h
2000                                      ??        ?? uninitialized

;==============================================================================
; symbol index
;==============================================================================
; SUB_1009                                1009
; counter                                 100e
; entry                                   1000
; load_operand                            1001
; table                                   100f
