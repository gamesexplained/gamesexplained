'use strict';
// A Z80 simulator for node, the execution core of the kit's ZX Spectrum platform. It models the
// processor itself, not the machine: the 64 KB of address space are all RAM (a Uint8Array(65536)
// used in place), and I/O goes through the caller's hooks. The Spectrum's own map (ROM at
// $0000-$3FFF, the ULA's port $FE and so on) is the machine model's to supply, exactly as the
// C64's map lives in kit/c64/cpu6502.js around a bare 6502 core. Checked by kit/spectrum/check_z80.js
// against SingleStepTests/z80 (github.com/SingleStepTests/z80, v1, MIT licence): one step per case,
// every register, internal and RAM byte compared, 1,604,000 cases in all.
//
// The processor
// - All documented instructions and the undocumented ones the test vectors exercise: the base
//   opcodes, CB, ED, DD/FD and the DD CB / FD CB indexed forms, including IXH/IXL/IYH/IYL, SLL,
//   the ED aliases of NEG/RETN/IM and the ED70/ED71 IN F,(C) / OUT (C),0. Decode follows the same
//   structure as the SingleStepTests generator (a port of Ares' Z80 core), so the DD/FD prefix is
//   just a register-page switch: a DD before an opcode that does not use HL changes nothing, and an
//   H/L/HL operand becomes IXH/IXL/IX. An instruction the decoder leaves undefined stops the run.
// - Flags exact, including the undocumented bits 5 and 3. f is the byte (S Z 5 H 3 P/V N C, bits
//   7..0). The internal register wz (MEMPTR) is kept; p is set by LD A,I / LD A,R (whose P/V comes
//   from iff2); q records the last instruction's flag byte when that instruction modifies flags,
//   and 0 otherwise, which is what SCF and CCF use for their bits 5 and 3. The EI delay is the ei
//   latch: EI sets it, and it is cleared after the next instruction's interrupt decision.
// - T-states counted as the processor takes them (cpu.tstates, and the per-instruction delta step() returns):
//   an M1 fetch is 4, a data read or write 3, an I/O transfer 4, an internal operation 1. That is
//   the real machine timing, not the length of the test vectors' bus-trace array (which this core
//   does not produce).
// - Interrupts are modelled but not generated here: im 0/1/2, iff1/iff2, RETN/RETI (IFF1 := IFF2)
//   and the ei latch. An interrupt or NMI is the caller's to raise, via the state and pc/sp.

const S = 0x80, Z = 0x40, Y = 0x20, H = 0x10, X = 0x08, PV = 0x04, N = 0x02, C = 0x01;
const HL = 0, IX = 1, IY = 2;
const s8 = v => ((v & 0xFF) < 0x80) ? (v & 0xFF) : ((v & 0xFF) - 0x100);
const hex2 = v => '$' + v.toString(16).toUpperCase().padStart(2, '0');
const hex4 = v => '$' + v.toString(16).toUpperCase().padStart(4, '0');
const MN = ['UKN','ADC_a_irr','ADC_a_n','ADC_a_r','ADC_hl_rr','ADD_a_irr','ADD_a_n','ADD_a_r','ADD_hl_rr','AND_a_irr','AND_a_n','AND_a_r','BIT_o_irr','BIT_o_irr_r','BIT_o_r','CALL_c_nn','CALL_nn','CCF','CP_a_irr','CP_a_n','CP_a_r','CPD','CPDR','CPI','CPIR','CPL','DAA','DEC_irr','DEC_r','DEC_rr','DI','DJNZ_e','EI','EX_irr_rr','EX_rr_rr','EXX','HALT','IM_o','IN_a_in','IN_r_ic','IN_ic','INC_irr','INC_r','INC_rr','IND','INDR','INI','INIR','JP_c_nn','JP_rr','JR_c_e','LD_a_inn','LD_a_irr','LD_inn_a','LD_inn_rr','LD_irr_a','LD_irr_n','LD_irr_r','LD_r_n','LD_r_irr','LD_r_r','LD_r_r1','LD_r_r2','LD_rr_inn','LD_rr_nn','LD_sp_rr','LDD','LDDR','LDI','LDIR','NEG','NOP','OR_a_irr','OR_a_n','OR_a_r','OTDR','OTIR','OUT_ic_r','OUT_ic','OUT_in_a','OUTD','OUTI','POP_rr','PUSH_rr','RES_o_irr','RES_o_irr_r','RES_o_r','RET','RET_c','RETI','RETN','RL_irr','RL_irr_r','RL_r','RLA','RLC_irr','RLC_irr_r','RLC_r','RLCA','RLD','RR_irr','RR_irr_r','RR_r','RRA','RRC_irr','RRC_irr_r','RRC_r','RRCA','RRD','RST_o','SBC_a_irr','SBC_a_n','SBC_a_r','SBC_hl_rr','SCF','SET_o_irr','SET_o_irr_r','SET_o_r','SLA_irr','SLA_irr_r','SLA_r','SLL_irr','SLL_irr_r','SLL_r','SRA_irr','SRA_irr_r','SRA_r','SRL_irr','SRL_irr_r','SRL_r','SUB_a_irr','SUB_a_n','SUB_a_r','XOR_a_irr','XOR_a_n','XOR_a_r'];
const BASE = [[71,null,null,null],[64,'BC',null,null],[55,'BC',null,null],[43,'BC',null,null],[42,'B',null,null],[28,'B',null,null],[58,'B',null,null],[98,null,null,null],[34,'AF','AF_',null],[8,'BC',null,null],[52,'BC',null,null],[29,'BC',null,null],[42,'C',null,null],[28,'C',null,null],[58,'C',null,null],[107,null,null,null],[31,null,null,null],[64,'DE',null,null],[55,'DE',null,null],[43,'DE',null,null],[42,'D',null,null],[28,'D',null,null],[58,'D',null,null],[94,null,null,null],[50,1,null,null],[8,'DE',null,null],[52,'DE',null,null],[29,'DE',null,null],[42,'E',null,null],[28,'E',null,null],[58,'E',null,null],[103,null,null,null],[50,'regs.F.Z === 0',null,null],[64,'HL',null,null],[54,'HL',null,null],[43,'HL',null,null],[42,'H',null,null],[28,'H',null,null],[58,'H',null,null],[26,null,null,null],[50,'regs.F.Z === 1',null,null],[8,'HL',null,null],[63,'HL',null,null],[29,'HL',null,null],[42,'L',null,null],[28,'L',null,null],[58,'L',null,null],[25,null,null,null],[50,'regs.F.C === 0',null,null],[64,'SP',null,null],[53,null,null,null],[43,'SP',null,null],[41,'HL',null,null],[27,'HL',null,null],[56,'HL',null,null],[114,null,null,null],[50,'regs.F.C === 1',null,null],[8,'SP',null,null],[51,null,null,null],[29,'SP',null,null],[42,'A',null,null],[28,'A',null,null],[58,'A',null,null],[17,null,null,null],[60,'B','B',null],[60,'B','C',null],[60,'B','D',null],[60,'B','E',null],[60,'B','H',null],[60,'B','L',null],[59,'B','HL',null],[60,'B','A',null],[60,'C','B',null],[60,'C','C',null],[60,'C','D',null],[60,'C','E',null],[60,'C','H',null],[60,'C','L',null],[59,'C','HL',null],[60,'C','A',null],[60,'D','B',null],[60,'D','C',null],[60,'D','D',null],[60,'D','E',null],[60,'D','H',null],[60,'D','L',null],[59,'D','HL',null],[60,'D','A',null],[60,'E','B',null],[60,'E','C',null],[60,'E','D',null],[60,'E','E',null],[60,'E','H',null],[60,'E','L',null],[59,'E','HL',null],[60,'E','A',null],[60,'H','B',null],[60,'H','C',null],[60,'H','D',null],[60,'H','E',null],[60,'H','H',null],[60,'H','L',null],[59,'_H','HL',null],[60,'H','A',null],[60,'L','B',null],[60,'L','C',null],[60,'L','D',null],[60,'L','E',null],[60,'L','H',null],[60,'L','L',null],[59,'_L','HL',null],[60,'L','A',null],[57,'HL','B',null],[57,'HL','C',null],[57,'HL','D',null],[57,'HL','E',null],[57,'HL','_H',null],[57,'HL','_L',null],[36,null,null,null],[57,'HL','A',null],[60,'A','B',null],[60,'A','C',null],[60,'A','D',null],[60,'A','E',null],[60,'A','H',null],[60,'A','L',null],[59,'A','HL',null],[60,'A','A',null],[7,'B',null,null],[7,'C',null,null],[7,'D',null,null],[7,'E',null,null],[7,'H',null,null],[7,'L',null,null],[5,'HL',null,null],[7,'A',null,null],[3,'B',null,null],[3,'C',null,null],[3,'D',null,null],[3,'E',null,null],[3,'H',null,null],[3,'L',null,null],[1,'HL',null,null],[3,'A',null,null],[132,'B',null,null],[132,'C',null,null],[132,'D',null,null],[132,'E',null,null],[132,'H',null,null],[132,'L',null,null],[130,'HL',null,null],[132,'A',null,null],[112,'B',null,null],[112,'C',null,null],[112,'D',null,null],[112,'E',null,null],[112,'H',null,null],[112,'L',null,null],[110,'HL',null,null],[112,'A',null,null],[11,'B',null,null],[11,'C',null,null],[11,'D',null,null],[11,'E',null,null],[11,'H',null,null],[11,'L',null,null],[9,'HL',null,null],[11,'A',null,null],[135,'B',null,null],[135,'C',null,null],[135,'D',null,null],[135,'E',null,null],[135,'H',null,null],[135,'L',null,null],[133,'HL',null,null],[135,'A',null,null],[74,'B',null,null],[74,'C',null,null],[74,'D',null,null],[74,'E',null,null],[74,'H',null,null],[74,'L',null,null],[72,'HL',null,null],[74,'A',null,null],[20,'B',null,null],[20,'C',null,null],[20,'D',null,null],[20,'E',null,null],[20,'H',null,null],[20,'L',null,null],[18,'HL',null,null],[20,'A',null,null],[88,'regs.F.Z === 0',null,null],[82,'BC',null,null],[48,'regs.F.Z === 0',null,null],[48,'1',null,null],[15,'regs.F.Z === 0',null,null],[83,'BC',null,null],[6,null,null,null],[109,'0',null,null],[88,'regs.F.Z === 1',null,null],[87,null,null,null],[48,'regs.F.Z === 1',null,null],-1,[15,'regs.F.Z === 1',null,null],[16,null,null,null],[2,null,null,null],[109,'1',null,null],[88,'regs.F.C === 0',null,null],[82,'DE',null,null],[48,'regs.F.C === 0',null,null],[79,null,null,null],[15,'regs.F.C === 0',null,null],[83,'DE',null,null],[131,null,null,null],[109,'2',null,null],[88,'regs.F.C === 1',null,null],[35,null,null,null],[48,'regs.F.C === 1',null,null],[38,null,null,null],[15,'regs.F.C === 1',null,null],-1,[111,null,null,null],[109,'3',null,null],[88,'regs.F.PV === 0',null,null],[82,'HL',null,null],[48,'regs.F.PV === 0',null,null],[33,'SP','HL',null],[15,'regs.F.PV === 0',null,null],[83,'HL',null,null],[10,null,null,null],[109,'4',null,null],[88,'regs.F.PV === 1',null,null],[49,'HL',null,null],[48,'regs.F.PV === 1',null,null],[34,'DE','_HL',null],[15,'regs.F.PV === 1',null,null],-1,[134,null,null,null],[109,'5',null,null],[88,'regs.F.S === 0',null,null],[82,'AF',null,null],[48,'regs.F.S === 0',null,null],[30,null,null,null],[15,'regs.F.S === 0',null,null],[83,'AF',null,null],[73,null,null,null],[109,'6',null,null],[88,'regs.F.S === 1',null,null],[65,'HL',null,null],[48,'regs.F.S === 1',null,null],[32,null,null,null],[15,'regs.F.S === 1',null,null],-1,[19,null,null,null],[109,'7',null,null]];
const CB = [[97,'B',null,null],[97,'C',null,null],[97,'D',null,null],[97,'E',null,null],[97,'H',null,null],[97,'L',null,null],[95,'_HL',null,null],[97,'A',null,null],[106,'B',null,null],[106,'C',null,null],[106,'D',null,null],[106,'E',null,null],[106,'H',null,null],[106,'L',null,null],[104,'_HL',null,null],[106,'A',null,null],[93,'B',null,null],[93,'C',null,null],[93,'D',null,null],[93,'E',null,null],[93,'H',null,null],[93,'L',null,null],[91,'_HL',null,null],[93,'A',null,null],[102,'B',null,null],[102,'C',null,null],[102,'D',null,null],[102,'E',null,null],[102,'H',null,null],[102,'L',null,null],[100,'_HL',null,null],[102,'A',null,null],[120,'B',null,null],[120,'C',null,null],[120,'D',null,null],[120,'E',null,null],[120,'H',null,null],[120,'L',null,null],[118,'_HL',null,null],[120,'A',null,null],[126,'B',null,null],[126,'C',null,null],[126,'D',null,null],[126,'E',null,null],[126,'H',null,null],[126,'L',null,null],[124,'_HL',null,null],[126,'A',null,null],[123,'B',null,null],[123,'C',null,null],[123,'D',null,null],[123,'E',null,null],[123,'H',null,null],[123,'L',null,null],[121,'_HL',null,null],[123,'A',null,null],[129,'B',null,null],[129,'C',null,null],[129,'D',null,null],[129,'E',null,null],[129,'H',null,null],[129,'L',null,null],[127,'_HL',null,null],[129,'A',null,null],[14,'0','B',null],[14,'0','C',null],[14,'0','D',null],[14,'0','E',null],[14,'0','H',null],[14,'0','L',null],[12,'0','_HL',null],[14,'0','A',null],[14,'1','B',null],[14,'1','C',null],[14,'1','D',null],[14,'1','E',null],[14,'1','H',null],[14,'1','L',null],[12,'1','_HL',null],[14,'1','A',null],[14,'2','B',null],[14,'2','C',null],[14,'2','D',null],[14,'2','E',null],[14,'2','H',null],[14,'2','L',null],[12,'2','_HL',null],[14,'2','A',null],[14,'3','B',null],[14,'3','C',null],[14,'3','D',null],[14,'3','E',null],[14,'3','H',null],[14,'3','L',null],[12,'3','_HL',null],[14,'3','A',null],[14,'4','B',null],[14,'4','C',null],[14,'4','D',null],[14,'4','E',null],[14,'4','H',null],[14,'4','L',null],[12,'4','_HL',null],[14,'4','A',null],[14,'5','B',null],[14,'5','C',null],[14,'5','D',null],[14,'5','E',null],[14,'5','H',null],[14,'5','L',null],[12,'5','_HL',null],[14,'5','A',null],[14,'6','B',null],[14,'6','C',null],[14,'6','D',null],[14,'6','E',null],[14,'6','H',null],[14,'6','L',null],[12,'6','_HL',null],[14,'6','A',null],[14,'7','B',null],[14,'7','C',null],[14,'7','D',null],[14,'7','E',null],[14,'7','H',null],[14,'7','L',null],[12,'7','_HL',null],[14,'7','A',null],[86,'0','B',null],[86,'0','C',null],[86,'0','D',null],[86,'0','E',null],[86,'0','H',null],[86,'0','L',null],[84,'0','_HL',null],[86,'0','A',null],[86,'1','B',null],[86,'1','C',null],[86,'1','D',null],[86,'1','E',null],[86,'1','H',null],[86,'1','L',null],[84,'1','_HL',null],[86,'1','A',null],[86,'2','B',null],[86,'2','C',null],[86,'2','D',null],[86,'2','E',null],[86,'2','H',null],[86,'2','L',null],[84,'2','_HL',null],[86,'2','A',null],[86,'3','B',null],[86,'3','C',null],[86,'3','D',null],[86,'3','E',null],[86,'3','H',null],[86,'3','L',null],[84,'3','_HL',null],[86,'3','A',null],[86,'4','B',null],[86,'4','C',null],[86,'4','D',null],[86,'4','E',null],[86,'4','H',null],[86,'4','L',null],[84,'4','_HL',null],[86,'4','A',null],[86,'5','B',null],[86,'5','C',null],[86,'5','D',null],[86,'5','E',null],[86,'5','H',null],[86,'5','L',null],[84,'5','_HL',null],[86,'5','A',null],[86,'6','B',null],[86,'6','C',null],[86,'6','D',null],[86,'6','E',null],[86,'6','H',null],[86,'6','L',null],[84,'6','_HL',null],[86,'6','A',null],[86,'7','B',null],[86,'7','C',null],[86,'7','D',null],[86,'7','E',null],[86,'7','H',null],[86,'7','L',null],[84,'7','_HL',null],[86,'7','A',null],[117,'0','B',null],[117,'0','C',null],[117,'0','D',null],[117,'0','E',null],[117,'0','H',null],[117,'0','L',null],[115,'0','_HL',null],[117,'0','A',null],[117,'1','B',null],[117,'1','C',null],[117,'1','D',null],[117,'1','E',null],[117,'1','H',null],[117,'1','L',null],[115,'1','_HL',null],[117,'1','A',null],[117,'2','B',null],[117,'2','C',null],[117,'2','D',null],[117,'2','E',null],[117,'2','H',null],[117,'2','L',null],[115,'2','_HL',null],[117,'2','A',null],[117,'3','B',null],[117,'3','C',null],[117,'3','D',null],[117,'3','E',null],[117,'3','H',null],[117,'3','L',null],[115,'3','_HL',null],[117,'3','A',null],[117,'4','B',null],[117,'4','C',null],[117,'4','D',null],[117,'4','E',null],[117,'4','H',null],[117,'4','L',null],[115,'4','_HL',null],[117,'4','A',null],[117,'5','B',null],[117,'5','C',null],[117,'5','D',null],[117,'5','E',null],[117,'5','H',null],[117,'5','L',null],[115,'5','_HL',null],[117,'5','A',null],[117,'6','B',null],[117,'6','C',null],[117,'6','D',null],[117,'6','E',null],[117,'6','H',null],[117,'6','L',null],[115,'6','_HL',null],[117,'6','A',null],[117,'7','B',null],[117,'7','C',null],[117,'7','D',null],[117,'7','E',null],[117,'7','H',null],[117,'7','L',null],[115,'7','_HL',null],[117,'7','A',null]];
const CBD = [[96,'addr','B',null],[96,'addr','C',null],[96,'addr','D',null],[96,'addr','E',null],[96,'addr','H',null],[96,'addr','L',null],[96,'addr','_',null],[96,'addr','A',null],[105,'addr','B',null],[105,'addr','C',null],[105,'addr','D',null],[105,'addr','E',null],[105,'addr','H',null],[105,'addr','L',null],[105,'addr','_',null],[105,'addr','A',null],[92,'addr','B',null],[92,'addr','C',null],[92,'addr','D',null],[92,'addr','E',null],[92,'addr','H',null],[92,'addr','L',null],[92,'addr','_',null],[92,'addr','A',null],[101,'addr','B',null],[101,'addr','C',null],[101,'addr','D',null],[101,'addr','E',null],[101,'addr','H',null],[101,'addr','L',null],[101,'addr','_',null],[101,'addr','A',null],[119,'addr','B',null],[119,'addr','C',null],[119,'addr','D',null],[119,'addr','E',null],[119,'addr','H',null],[119,'addr','L',null],[119,'addr','_',null],[119,'addr','A',null],[125,'addr','B',null],[125,'addr','C',null],[125,'addr','D',null],[125,'addr','E',null],[125,'addr','H',null],[125,'addr','L',null],[125,'addr','_',null],[125,'addr','A',null],[122,'addr','B',null],[122,'addr','C',null],[122,'addr','D',null],[122,'addr','E',null],[122,'addr','H',null],[122,'addr','L',null],[122,'addr','_',null],[122,'addr','A',null],[128,'addr','B',null],[128,'addr','C',null],[128,'addr','D',null],[128,'addr','E',null],[128,'addr','H',null],[128,'addr','L',null],[128,'addr','_',null],[128,'addr','A',null],[13,'0','addr','B'],[13,'0','addr','C'],[13,'0','addr','D'],[13,'0','addr','E'],[13,'0','addr','H'],[13,'0','addr','L'],[13,'0','addr','_'],[13,'0','addr','A'],[13,'1','addr','B'],[13,'1','addr','C'],[13,'1','addr','D'],[13,'1','addr','E'],[13,'1','addr','H'],[13,'1','addr','L'],[13,'1','addr','_'],[13,'1','addr','A'],[13,'2','addr','B'],[13,'2','addr','C'],[13,'2','addr','D'],[13,'2','addr','E'],[13,'2','addr','H'],[13,'2','addr','L'],[13,'2','addr','_'],[13,'2','addr','A'],[13,'3','addr','B'],[13,'3','addr','C'],[13,'3','addr','D'],[13,'3','addr','E'],[13,'3','addr','H'],[13,'3','addr','L'],[13,'3','addr','_'],[13,'3','addr','A'],[13,'4','addr','B'],[13,'4','addr','C'],[13,'4','addr','D'],[13,'4','addr','E'],[13,'4','addr','H'],[13,'4','addr','L'],[13,'4','addr','_'],[13,'4','addr','A'],[13,'5','addr','B'],[13,'5','addr','C'],[13,'5','addr','D'],[13,'5','addr','E'],[13,'5','addr','H'],[13,'5','addr','L'],[13,'5','addr','_'],[13,'5','addr','A'],[13,'6','addr','B'],[13,'6','addr','C'],[13,'6','addr','D'],[13,'6','addr','E'],[13,'6','addr','H'],[13,'6','addr','L'],[13,'6','addr','_'],[13,'6','addr','A'],[13,'7','addr','B'],[13,'7','addr','C'],[13,'7','addr','D'],[13,'7','addr','E'],[13,'7','addr','H'],[13,'7','addr','L'],[13,'7','addr','_'],[13,'7','addr','A'],[85,'0','addr','B'],[85,'0','addr','C'],[85,'0','addr','D'],[85,'0','addr','E'],[85,'0','addr','H'],[85,'0','addr','L'],[85,'0','addr','_'],[85,'0','addr','A'],[85,'1','addr','B'],[85,'1','addr','C'],[85,'1','addr','D'],[85,'1','addr','E'],[85,'1','addr','H'],[85,'1','addr','L'],[85,'1','addr','_'],[85,'1','addr','A'],[85,'2','addr','B'],[85,'2','addr','C'],[85,'2','addr','D'],[85,'2','addr','E'],[85,'2','addr','H'],[85,'2','addr','L'],[85,'2','addr','_'],[85,'2','addr','A'],[85,'3','addr','B'],[85,'3','addr','C'],[85,'3','addr','D'],[85,'3','addr','E'],[85,'3','addr','H'],[85,'3','addr','L'],[85,'3','addr','_'],[85,'3','addr','A'],[85,'4','addr','B'],[85,'4','addr','C'],[85,'4','addr','D'],[85,'4','addr','E'],[85,'4','addr','H'],[85,'4','addr','L'],[85,'4','addr','_'],[85,'4','addr','A'],[85,'5','addr','B'],[85,'5','addr','C'],[85,'5','addr','D'],[85,'5','addr','E'],[85,'5','addr','H'],[85,'5','addr','L'],[85,'5','addr','_'],[85,'5','addr','A'],[85,'6','addr','B'],[85,'6','addr','C'],[85,'6','addr','D'],[85,'6','addr','E'],[85,'6','addr','H'],[85,'6','addr','L'],[85,'6','addr','_'],[85,'6','addr','A'],[85,'7','addr','B'],[85,'7','addr','C'],[85,'7','addr','D'],[85,'7','addr','E'],[85,'7','addr','H'],[85,'7','addr','L'],[85,'7','addr','_'],[85,'7','addr','A'],[116,'0','addr','B'],[116,'0','addr','C'],[116,'0','addr','D'],[116,'0','addr','E'],[116,'0','addr','H'],[116,'0','addr','L'],[116,'0','addr','_'],[116,'0','addr','A'],[116,'1','addr','B'],[116,'1','addr','C'],[116,'1','addr','D'],[116,'1','addr','E'],[116,'1','addr','H'],[116,'1','addr','L'],[116,'1','addr','_'],[116,'1','addr','A'],[116,'2','addr','B'],[116,'2','addr','C'],[116,'2','addr','D'],[116,'2','addr','E'],[116,'2','addr','H'],[116,'2','addr','L'],[116,'2','addr','_'],[116,'2','addr','A'],[116,'3','addr','B'],[116,'3','addr','C'],[116,'3','addr','D'],[116,'3','addr','E'],[116,'3','addr','H'],[116,'3','addr','L'],[116,'3','addr','_'],[116,'3','addr','A'],[116,'4','addr','B'],[116,'4','addr','C'],[116,'4','addr','D'],[116,'4','addr','E'],[116,'4','addr','H'],[116,'4','addr','L'],[116,'4','addr','_'],[116,'4','addr','A'],[116,'5','addr','B'],[116,'5','addr','C'],[116,'5','addr','D'],[116,'5','addr','E'],[116,'5','addr','H'],[116,'5','addr','L'],[116,'5','addr','_'],[116,'5','addr','A'],[116,'6','addr','B'],[116,'6','addr','C'],[116,'6','addr','D'],[116,'6','addr','E'],[116,'6','addr','H'],[116,'6','addr','L'],[116,'6','addr','_'],[116,'6','addr','A'],[116,'7','addr','B'],[116,'7','addr','C'],[116,'7','addr','D'],[116,'7','addr','E'],[116,'7','addr','H'],[116,'7','addr','L'],[116,'7','addr','_'],[116,'7','addr','A']];
const ED = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,[39,'B',null,null],[77,'B',null,null],[113,'BC',null,null],[54,'BC',null,null],[70,null,null,null],[90,null,null,null],[37,'0',null,null],[61,'I','A',null],[39,'C',null,null],[77,'C',null,null],[4,'BC',null,null],[63,'BC',null,null],[70,null,null,null],[89,null,null,null],[37,'0',null,null],[61,'R','A',null],[39,'D',null,null],[77,'D',null,null],[113,'DE',null,null],[54,'DE',null,null],[70,null,null,null],[90,null,null,null],[37,'1',null,null],[62,'A','I',null],[39,'E',null,null],[77,'E',null,null],[4,'DE',null,null],[63,'DE',null,null],[70,null,null,null],[89,null,null,null],[37,'2',null,null],[62,'A','R',null],[39,'H',null,null],[77,'H',null,null],[113,'HL',null,null],[54,'HL',null,null],[70,null,null,null],[90,null,null,null],[37,'0',null,null],[108,'HL',null,null],[39,'L',null,null],[77,'L',null,null],[4,'HL',null,null],[63,'HL',null,null],[70,null,null,null],[89,null,null,null],[37,'0',null,null],[99,'HL',null,null],[40,null,null,null],[78,null,null,null],[113,'SP',null,null],[54,'SP',null,null],[70,null,null,null],[90,null,null,null],[37,'1',null,null],[71,null,null,null],[39,'A',null,null],[77,'A',null,null],[4,'SP',null,null],[63,'SP',null,null],[70,null,null,null],[89,null,null,null],[37,'2',null,null],[71,null,null,null],-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,[68,null,null,null],[23,null,null,null],[46,null,null,null],[81,null,null,null],-1,-1,-1,-1,[66,null,null,null],[21,null,null,null],[44,null,null,null],[80,null,null,null],-1,-1,-1,-1,[69,null,null,null],[24,null,null,null],[47,null,null,null],[76,null,null,null],-1,-1,-1,-1,[67,null,null,null],[22,null,null,null],[45,null,null,null],[75,null,null,null],-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];
// --- the processor ------------------------------------------------------------------------------
class CPU {
  constructor(mem, opts = {}) {
    this.m = mem;
    this.io = opts.io || null;
    this.a = this.b = this.c = this.d = this.e = this.f = this.h = this.l = 0;
    this.a_ = this.b_ = this.c_ = this.d_ = this.e_ = this.f_ = this.h_ = this.l_ = 0;
    this.ix = this.iy = this.sp = this.pc = this.i = this.r = 0;
    this.wz = 0;
    this.im = 0; this.iff1 = 0; this.iff2 = 0;
    this.ei = 0; this.p = 0; this.q = 0; this.sq = 0;
    this.halted = 0;
    this.steps = 0; this.tstates = 0;
    this.junk = 0; this.data = 0;
    this.rprefix = HL; this.prefix = 0; this.opc = 0;
  }

  // The shadow register pairs, as the test vectors name them, backed by the individual bytes.
  get af_() { return (this.a_ << 8) | this.f_; }
  set af_(v) { this.a_ = (v >>> 8) & 0xFF; this.f_ = v & 0xFF; }
  get bc_() { return (this.b_ << 8) | this.c_; }
  set bc_(v) { this.b_ = (v >>> 8) & 0xFF; this.c_ = v & 0xFF; }
  get de_() { return (this.d_ << 8) | this.e_; }
  set de_(v) { this.d_ = (v >>> 8) & 0xFF; this.e_ = v & 0xFF; }
  get hl_() { return (this.h_ << 8) | this.l_; }
  set hl_(v) { this.h_ = (v >>> 8) & 0xFF; this.l_ = v & 0xFF; }

  setRegs(r) {
    if (r.pc !== undefined) this.pc = r.pc & 0xFFFF;
    if (r.sp !== undefined) this.sp = r.sp & 0xFFFF;
    if (r.a !== undefined) this.a = r.a & 0xFF;
    if (r.b !== undefined) this.b = r.b & 0xFF;
    if (r.c !== undefined) this.c = r.c & 0xFF;
    if (r.d !== undefined) this.d = r.d & 0xFF;
    if (r.e !== undefined) this.e = r.e & 0xFF;
    if (r.f !== undefined) this.f = r.f & 0xFF;
    if (r.h !== undefined) this.h = r.h & 0xFF;
    if (r.l !== undefined) this.l = r.l & 0xFF;
    if (r.i !== undefined) this.i = r.i & 0xFF;
    if (r.r !== undefined) this.r = r.r & 0xFF;
    if (r.ix !== undefined) this.ix = r.ix & 0xFFFF;
    if (r.iy !== undefined) this.iy = r.iy & 0xFFFF;
    if (r.wz !== undefined) this.wz = r.wz & 0xFFFF;
    if (r.af_ !== undefined) this.af_ = r.af_ & 0xFFFF;
    if (r.bc_ !== undefined) this.bc_ = r.bc_ & 0xFFFF;
    if (r.de_ !== undefined) this.de_ = r.de_ & 0xFFFF;
    if (r.hl_ !== undefined) this.hl_ = r.hl_ & 0xFFFF;
    if (r.im !== undefined) this.im = r.im & 3;
    if (r.iff1 !== undefined) this.iff1 = r.iff1 ? 1 : 0;
    if (r.iff2 !== undefined) this.iff2 = r.iff2 ? 1 : 0;
    if (r.ei !== undefined) this.ei = r.ei ? 1 : 0;
    if (r.p !== undefined) this.p = r.p ? 1 : 0;
    if (r.q !== undefined) this.q = r.q & 0xFF;
    if (r.halted !== undefined) this.halted = r.halted ? 1 : 0;
  }

  fail(msg, props) { throw Object.assign(new Error(msg), { pc: this.opc }, props); }

  // --- flags (f: S Z 5 H 3 P/V N C) ---
  parityBit(v) { v ^= v >>> 4; v ^= v >>> 2; v ^= v >>> 1; return (v & 1) ^ 1; }
  parity(v) { this.f = (this.f & ~PV) | (this.parityBit(v) ? PV : 0); }
  setXY(z) { this.f = (this.f & ~(X | Y)) | (z & (X | Y)); }
  setZ(z) { this.f = (this.f & ~Z) | (z === 0 ? Z : 0); }
  setS(z) { this.f = (this.f & ~S) | (z & S); }
  setSZ(z) { this.f = (this.f & ~(Z | S)) | (z === 0 ? Z : 0) | (z & S); }
  setXYSZ(z) { this.f = (this.f & ~(X | Y | Z | S)) | (z & (X | Y)) | (z === 0 ? Z : 0) | (z & S); }

  // --- memory and I/O ---
  resolve(a) { return typeof a === 'number' ? a & 0xFFFF : this.readreg(a) & 0xFFFF; }
  rd(a) { const n = this.resolve(a); this.tstates += 3; return this.m[n]; }
  wr(a, v) { const n = this.resolve(a); this.tstates += 3; this.m[n] = v & 0xFF; }
  fetch() { const a = this.pc; this.pc = (this.pc + 1) & 0xFFFF; this.tstates += 4; return this.m[a]; }
  in(port) {
    this.tstates += 4;
    if (this.io && this.io.in) return this.io.in(port & 0xFFFF, this) & 0xFF;
    return 0xFF;
  }
  out(port, v) {
    this.tstates += 4;
    if (this.io && this.io.out) this.io.out(port & 0xFFFF, v & 0xFF, this);
  }
  wait(n) { this.tstates += n; }

  incR() { this.r = (this.r & 0x80) | ((this.r + 1) & 0x7F); }

  operand() { const v = this.rd(this.pc); this.pc = (this.pc + 1) & 0xFFFF; return v; }
  operands() { const lo = this.operand(); return lo | (this.operand() << 8); }

  address(x) { return typeof x === 'number' ? x & 0xFFFF : this.readreg(x) & 0xFFFF; }

  displace(x, wclocks = 5) {
    if (this.rprefix !== HL) {
      if (x !== 'HL' && x !== 'IX' && x !== 'IY' && x !== 'addr') return this.readreg(x);
      const d = this.operand();
      this.wait(wclocks);
      this.wz = (this.readreg(x) + s8(d)) & 0xFFFF;
      return this.wz;
    }
    return this.readreg(x);
  }

  push(v) {
    this.sp = (this.sp - 1) & 0xFFFF;
    this.wr(this.sp, (v >>> 8) & 0xFF);
    this.sp = (this.sp - 1) & 0xFFFF;
    this.wr(this.sp, v & 0xFF);
  }
  pop() {
    const lo = this.rd(this.sp); this.sp = (this.sp + 1) & 0xFFFF;
    const hi = this.rd(this.sp); this.sp = (this.sp + 1) & 0xFFFF;
    return lo | (hi << 8);
  }
  pushWord(v) { this.push(v); }
  popWord() { return this.pop(); }
  readWord(a) { const n = a & 0xFFFF; return this.rd(n) | (this.rd((n + 1) & 0xFFFF) << 8); }
  writeWord(a, v) { const n = a & 0xFFFF; this.wr(n, v & 0xFF); this.wr((n + 1) & 0xFFFF, (v >>> 8) & 0xFF); }

  readreg(what) {
    switch (what) {
      case 'A': return this.a;
      case 'B': return this.b;
      case 'C': return this.c;
      case 'D': return this.d;
      case 'E': return this.e;
      case 'F': return this.f;
      case '_H': return this.h;
      case '_L': return this.l;
      case 'H': return this.rprefix === HL ? this.h : this.rprefix === IX ? (this.ix >>> 8) & 0xFF : (this.iy >>> 8) & 0xFF;
      case 'L': return this.rprefix === HL ? this.l : this.rprefix === IX ? this.ix & 0xFF : this.iy & 0xFF;
      case 'SP': return this.sp;
      case 'AF': return (this.a << 8) | this.f;
      case 'BC': return (this.b << 8) | this.c;
      case 'DE': return (this.d << 8) | this.e;
      case '_HL': return (this.h << 8) | this.l;
      case 'HL': return this.rprefix === HL ? (this.h << 8) | this.l : this.rprefix === IX ? this.ix : this.iy;
      case 'WZ': return this.wz;
      case 'WZH': return (this.wz >>> 8) & 0xFF;
      case 'WZL': return this.wz & 0xFF;
      case 'I': return this.i;
      case 'R': return this.r;
      case 'AF_': return this.af_;
      case '_': return this.junk;
      default: return 0;
    }
  }

  writereg(what, val) {
    switch (what) {
      case '_': this.junk = val & 0xFF; break;
      case 'A': this.a = val & 0xFF; break;
      case 'B': this.b = val & 0xFF; break;
      case 'C': this.c = val & 0xFF; break;
      case 'D': this.d = val & 0xFF; break;
      case 'E': this.e = val & 0xFF; break;
      case 'F': this.f = val & 0xFF; break;
      case '_H': this.h = val & 0xFF; break;
      case '_L': this.l = val & 0xFF; break;
      case 'H':
        if (this.rprefix === HL) this.h = val & 0xFF;
        else if (this.rprefix === IX) this.ix = ((val & 0xFF) << 8) | (this.ix & 0xFF);
        else this.iy = ((val & 0xFF) << 8) | (this.iy & 0xFF);
        break;
      case 'L':
        if (this.rprefix === HL) this.l = val & 0xFF;
        else if (this.rprefix === IX) this.ix = (this.ix & 0xFF00) | (val & 0xFF);
        else this.iy = (this.iy & 0xFF00) | (val & 0xFF);
        break;
      case 'SP': this.sp = val & 0xFFFF; break;
      case 'AF': this.a = (val >>> 8) & 0xFF; this.f = val & 0xFF; break;
      case 'BC': this.b = (val >>> 8) & 0xFF; this.c = val & 0xFF; break;
      case 'DE': this.d = (val >>> 8) & 0xFF; this.e = val & 0xFF; break;
      case '_HL': this.h = (val >>> 8) & 0xFF; this.l = val & 0xFF; break;
      case 'HL':
        if (this.rprefix === HL) { this.h = (val >>> 8) & 0xFF; this.l = val & 0xFF; }
        else if (this.rprefix === IX) this.ix = val & 0xFFFF;
        else this.iy = val & 0xFFFF;
        break;
      case 'WZ': this.wz = val & 0xFFFF; break;
      case 'WZH': this.wz = ((val & 0xFF) << 8) | (this.wz & 0xFF); break;
      case 'WZL': this.wz = (this.wz & 0xFF00) | (val & 0xFF); break;
      case 'I': this.i = val & 0xFF; break;
      case 'R': this.r = val & 0xFF; break;
      case 'AF_': this.af_ = val & 0xFFFF; break;
    }
  }

  cond(c) {
    if (c === 1 || c === '1') return true;
    switch (c) {
      case 'regs.F.Z === 0': return !(this.f & Z);
      case 'regs.F.Z === 1': return !!(this.f & Z);
      case 'regs.F.C === 0': return !(this.f & C);
      case 'regs.F.C === 1': return !!(this.f & C);
      case 'regs.F.PV === 0': return !(this.f & PV);
      case 'regs.F.PV === 1': return !!(this.f & PV);
      case 'regs.F.S === 0': return !(this.f & S);
      case 'regs.F.S === 1': return !!(this.f & S);
      default: return false;
    }
  }

  Q(w) { this.sq = w; }

  // --- the algorithms ---
  ADD(x, y, c = 0) {
    let z = x + y + c;
    let f = this.f & ~(C | N | H | PV);
    if (z > 0xFF) f |= C;
    z &= 0xFF;
    if ((((x ^ y) ^ 0xFF) & (x ^ z)) & 0x80) f |= PV;
    if ((x ^ y ^ z) & 0x10) f |= H;
    this.f = f;
    this.setXYSZ(z);
    return z;
  }
  AND(x, y) {
    const z = x & y;
    this.f = this.f & ~(C | N | H | PV);
    this.parity(z);
    this.f |= H;
    this.setXYSZ(z);
    return z;
  }
  BIT(bit, x) {
    const z = x & (1 << bit);
    this.f = (this.f & ~(N | H | PV)) | H;
    this.parity(z);
    this.setXY(x);
    this.setSZ(z);
    return x;
  }
  CP(x, y) {
    let z = (x - y) & 0x1FF;
    let f = this.f & ~(C | N | H | PV);
    if (z > 0xFF) f |= C;
    z &= 0xFF;
    f |= N;
    this.f = f;
    this.setXY(y);
    this.setSZ(z);
    if (((x ^ y) & (x ^ z)) & 0x80) this.f |= PV;
    if ((x ^ y ^ z) & 0x10) this.f |= H;
  }
  DEC(x) {
    const z = (x - 1) & 0xFF;
    this.f = (this.f & ~(N | H | PV)) | N | (z === 0x7F ? PV : 0);
    this.setXYSZ(z);
    if ((z & 0x0F) === 0x0F) this.f |= H;
    return z;
  }
  IN(x) {
    this.f = this.f & ~(N | H | PV);
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  INC(x) {
    const z = (x + 1) & 0xFF;
    this.f = (this.f & ~(N | H | PV)) | (z === 0x80 ? PV : 0);
    this.setXYSZ(z);
    if ((z & 0x0F) === 0) this.f |= H;
    return z;
  }
  OR(x, y) {
    const z = x | y;
    this.f = this.f & ~(C | N | H | PV);
    this.parity(z);
    this.setXYSZ(z);
    return z;
  }
  RES(bit, x) { return x & (~(1 << bit) & 0xFF); }
  RL(x) {
    const c = (x & 0x80) ? 1 : 0;
    x = ((x << 1) | (this.f & C)) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  RLC(x) {
    x = ((x << 1) | (x >>> 7)) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | (x & C);
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  RR(x) {
    const c = x & 1;
    x = ((x >>> 1) | ((this.f & C) << 7)) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  RRC(x) {
    x = ((x >>> 1) | (x << 7)) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | (x & 0x80 ? C : 0);
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  SET(bit, x) { return x | (1 << bit); }
  SLA(x) {
    const c = (x & 0x80) ? 1 : 0;
    x = (x << 1) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  SLL(x) {
    const c = (x & 0x80) ? 1 : 0;
    x = ((x << 1) | 1) & 0xFF;
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  SRA(x) {
    const c = x & 1;
    x = (x & 0x80) | (x >> 1);
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  SRL(x) {
    const c = x & 1;
    x = x >>> 1;
    this.f = (this.f & ~(C | N | H | PV)) | c;
    this.parity(x);
    this.setXYSZ(x);
    return x;
  }
  SUB(x, y, c = 0) {
    let z = (x - y - c) & 0x1FF;
    let f = this.f & ~(C | N | H | PV);
    if (z > 0xFF) f |= C;
    z &= 0xFF;
    f |= N;
    this.f = f;
    if (((x ^ y) & (x ^ z)) & 0x80) this.f |= PV;
    if ((x ^ y ^ z) & 0x10) this.f |= H;
    this.setXYSZ(z);
    return z;
  }
  XOR(x, y) {
    const z = x ^ y;
    this.f = this.f & ~(C | N | H | PV);
    this.parity(z);
    this.setXYSZ(z);
    return z;
  }

  // --- the instructions (names in MN, index 1..135) ---
  ADC_a_irr(x) { this.Q(1); this.a = this.ADD(this.a, this.rd(this.displace(x)), this.f & C); }
  ADC_a_n() { this.Q(1); this.a = this.ADD(this.a, this.operand(), this.f & C); }
  ADC_a_r(x) { this.Q(1); this.a = this.ADD(this.a, this.readreg(x), this.f & C); }
  ADC_hl_rr(x) {
    this.Q(1);
    this.wz = (this.readreg('HL') + 1) & 0xFFFF;
    this.wait(4);
    const lo = this.ADD(this.readreg('L'), this.readreg(x) & 0xFF, this.f & C);
    this.wait(3);
    const hi = this.ADD(this.readreg('H'), (this.readreg(x) >>> 8) & 0xFF, this.f & C);
    this.writereg('HL', (hi << 8) | lo);
    this.f = (this.f & ~Z) | (this.readreg('HL') === 0 ? Z : 0);
  }
  ADD_a_irr(x) { this.Q(1); this.a = this.ADD(this.a, this.rd(this.displace(x))); }
  ADD_a_n() { this.Q(1); this.a = this.ADD(this.a, this.operand()); }
  ADD_a_r(x) { this.Q(1); this.a = this.ADD(this.a, this.readreg(x)); }
  ADD_hl_rr(x) {
    this.Q(1);
    this.wz = (this.readreg('HL') + 1) & 0xFFFF;
    const pvf = this.f & PV, zf = this.f & Z, sf = this.f & S;
    const xx = this.readreg(x);
    this.wait(4);
    const lo = this.ADD(this.readreg('L'), xx & 0xFF);
    this.wait(3);
    const hi = this.ADD(this.readreg('H'), (xx & 0xFF00) >>> 8, this.f & C);
    this.writereg('HL', (hi << 8) | lo);
    this.f = (this.f & ~(PV | Z | S)) | pvf | zf | sf;
  }
  AND_a_irr(x) { this.Q(1); this.a = this.AND(this.a, this.rd(this.displace(x))); }
  AND_a_n() { this.Q(1); this.a = this.AND(this.a, this.operand()); }
  AND_a_r(x) { this.Q(1); this.a = this.AND(this.a, this.readreg(x)); }
  BIT_o_irr(bit, addr) {
    this.Q(1);
    this.BIT(bit, this.rd(this.address(addr)));
    this.wait(1);
    this.setXY(this.readreg('WZH'));
  }
  BIT_o_irr_r(bit, addr, x) {
    this.Q(1);
    this.wait(2);
    this.BIT(bit, this.rd(this.address(addr)));
    this.wait(1);
    this.setXY(this.readreg('WZH'));
  }
  BIT_o_r(bit, x) { this.Q(1); this.BIT(bit, this.readreg(x)); }
  CALL_c_nn(c) { this.Q(0); this.wz = this.operands(); if (!this.cond(c)) return; this.wait(1); this.push(this.pc); this.pc = this.wz; }
  CALL_nn() { this.Q(0); this.wz = this.operands(); this.wait(1); this.push(this.pc); this.pc = this.wz; }
  CCF() {
    if (this.q !== 0 && this.prefix !== 0xDD && this.prefix !== 0xFD) {
      this.f = this.f & ~(X | Y);
    }
    const h = this.f & C;
    this.f = (this.f & ~(C | N | H)) | (h ? H : 0) | (h ? 0 : C);
    this.f = (this.f & ~(X | Y)) | ((this.f | this.a) & (X | Y));
    this.Q(1);
  }
  CP_a_irr(x) { this.Q(1); this.CP(this.a, this.rd(this.displace(x))); }
  CP_a_n() { this.Q(1); this.CP(this.a, this.operand()); }
  CP_a_r(x) { this.Q(1); this.CP(this.a, this.readreg(x)); }
  CPD() {
    this.Q(1);
    this.wz = (this.wz - 1) & 0xFFFF;
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    ta = (ta - 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.wait(5);
    const n = (this.a - data) & 0xFF;
    this.f = (this.f & ~(N | H | PV)) | N;
    ta = (this.readreg('BC') - 1) & 0xFFFF;
    this.writereg('BC', ta);
    if (ta !== 0) this.f |= PV;
    const hf = ((this.a ^ data ^ n) & 0x10) ? 1 : 0;
    if (hf) this.f |= H;
    const m = (n - hf) & 0xFF;
    this.f = (this.f & ~(X | Y)) | (m & X) | ((m & 0x02) ? Y : 0);
    this.setSZ(n);
  }
  CPDR() {
    this.Q(1);
    this.CPD();
    if ((this.b === 0 && this.c === 0) || (this.f & Z)) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.f = (this.f & ~(X | Y)) | (((this.pc >>> 11) & 1) ? X : 0) | (((this.pc >>> 13) & 1) ? Y : 0);
  }
  CPI() {
    this.Q(1);
    this.wz = (this.wz + 1) & 0xFFFF;
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    ta = (ta + 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.wait(5);
    const n = (this.a - data) & 0xFF;
    this.f = (this.f & ~(N | H | PV)) | N;
    ta = (this.readreg('BC') - 1) & 0xFFFF;
    this.writereg('BC', ta);
    if (ta !== 0) this.f |= PV;
    const hf = ((this.a ^ data ^ n) & 0x10) ? 1 : 0;
    if (hf) this.f |= H;
    const m = (n - hf) & 0xFF;
    this.f = (this.f & ~(X | Y)) | (m & X) | ((m & 0x02) ? Y : 0);
    this.setSZ(n);
  }
  CPIR() {
    this.Q(1);
    this.CPI();
    if ((this.b === 0 && this.c === 0) || (this.f & Z)) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.f = (this.f & ~(X | Y)) | (((this.pc >>> 11) & 1) ? X : 0) | (((this.pc >>> 13) & 1) ? Y : 0);
  }
  CPL() { this.Q(1); this.a ^= 0xFF; this.f = (this.f & ~(N | H)) | N | H; this.setXY(this.a); }
  DAA() {
    this.Q(1);
    const a = this.a;
    if ((this.f & C) || (this.a > 0x99)) { this.a = (this.a + ((this.f & N) ? -0x60 : 0x60)) & 0xFF; this.f |= C; }
    if ((this.f & H) || ((this.a & 0x0F) > 0x09)) { this.a = (this.a + ((this.f & N) ? -0x06 : 0x06)) & 0xFF; }
    this.parity(this.a);
    this.setXYSZ(this.a);
    this.f = (this.f & ~H) | (((this.a ^ a) & 0x10) ? H : 0);
  }
  DEC_irr(x) { this.Q(1); const a = this.displace(x); const d = this.rd(a); this.wait(1); this.wr(a, this.DEC(d)); }
  DEC_r(x) { this.Q(1); this.writereg(x, this.DEC(this.readreg(x))); }
  DEC_rr(x) { this.Q(0); this.wait(2); this.writereg(x, (this.readreg(x) - 1) & 0xFFFF); }
  DI() { this.Q(0); this.iff1 = this.iff2 = 0; }
  DJNZ_e() {
    this.Q(0);
    this.wait(1);
    const displacement = s8(this.operand());
    this.b = (this.b - 1) & 0xFF;
    if (this.b === 0) return;
    this.wait(5);
    this.wz = (this.pc + displacement) & 0xFFFF;
    this.pc = this.wz;
  }
  EI() { this.Q(0); this.iff1 = this.iff2 = 1; this.ei = 1; }
  EX_irr_rr(x, y) {
    this.Q(0);
    const xa = this.readreg(x);
    const wzl = this.rd(xa);
    const wzh = this.rd((xa + 1) & 0xFFFF);
    this.wz = (wzh << 8) | wzl;
    this.wait(1);
    this.wr((xa + 1) & 0xFFFF, (this.readreg(y) >>> 8) & 0xFF);
    this.wr(xa, this.readreg(y) & 0xFF);
    this.wait(2);
    this.writereg(y, this.wz);
  }
  EX_rr_rr(x, y) { this.Q(0); const tmp = this.readreg(x); this.writereg(x, this.readreg(y)); this.writereg(y, tmp); }
  EXX() {
    this.Q(0);
    let t;
    t = this.b; this.b = this.b_; this.b_ = t;
    t = this.c; this.c = this.c_; this.c_ = t;
    t = this.d; this.d = this.d_; this.d_ = t;
    t = this.e; this.e = this.e_; this.e_ = t;
    t = this.h; this.h = this.h_; this.h_ = t;
    t = this.l; this.l = this.l_; this.l_ = t;
  }
  HALT() { this.Q(0); this.halted = 1; }
  IM_o(code) { this.Q(0); this.im = parseInt(code, 10); }
  IN_a_in() {
    this.Q(0);
    const wzl = this.operand();
    this.wz = (this.a << 8) | wzl;
    this.a = this.in(this.wz);
    this.wz = (this.wz + 1) & 0xFFFF;
  }
  IN_r_ic(x) { this.Q(1); this.wz = (this.readreg('BC') + 1) & 0xFFFF; this.writereg(x, this.IN(this.in(this.readreg('BC')))); }
  IN_ic() { this.Q(1); this.IN(this.in(this.readreg('BC'))); this.wz = (this.readreg('BC') + 1) & 0xFFFF; }
  INC_irr(x) { this.Q(1); const a = this.displace(x); const d = this.rd(a); this.wait(1); this.wr(a, this.INC(d)); }
  INC_r(x) { this.Q(1); this.writereg(x, this.INC(this.readreg(x))); }
  INC_rr(x) { this.Q(0); this.wait(2); this.writereg(x, (this.readreg(x) + 1) & 0xFFFF); }
  IND() {
    this.Q(1);
    this.wz = (this.readreg('BC') - 1) & 0xFFFF;
    this.wait(1);
    const data = this.in((this.wz + 1) & 0xFFFF);
    this.data = data;
    this.b = (this.b - 1) & 0xFF;
    let ta = this.readreg('_HL');
    this.wr(ta, data);
    ta = (ta - 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.f = (this.f & ~(C | N | H | PV));
    if ((((this.c - 1) & 0xFF) + data) & 0x100) this.f |= C;
    if (data & 0x80) this.f |= N;
    this.parity((((((this.c - 1) & 0xFF) + data) & 7) ^ this.b) & 0xFF);
    this.setXYSZ(this.b);
    if (this.f & C) this.f |= H;
  }
  INDR() {
    this.Q(1);
    this.IND();
    if (this.b === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.post_IN_O_R();
  }
  INI() {
    this.Q(1);
    this.wz = (this.readreg('BC') + 1) & 0xFFFF;
    this.wait(1);
    const data = this.in((this.wz - 1) & 0xFFFF);
    this.data = data;
    this.b = (this.b - 1) & 0xFF;
    let ta = this.readreg('_HL');
    this.wr(ta, data);
    ta = (ta + 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.f = (this.f & ~(C | N | H | PV));
    if ((((this.c + 1) & 0xFF) + data) > 0xFF) this.f |= C;
    if (data & 0x80) this.f |= N;
    this.parity((((((this.c + 1) & 0xFF) + data) & 7) ^ this.b) & 0xFF);
    this.setXYSZ(this.b);
    if (this.f & C) this.f |= H;
  }
  INIR() {
    this.Q(1);
    this.INI();
    if (this.b === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.post_IN_O_R();
  }
  post_IN_O_R() {
    this.f = (this.f & ~(X | Y)) | (((this.pc >>> 11) & 1) ? X : 0) | (((this.pc >>> 13) & 1) ? Y : 0);
    if (this.f & C) {
      if (this.data & 0x80) {
        this.f ^= (this.parityBit((this.b - 1) & 7) ^ 1) ? PV : 0;
        this.f = (this.f & ~H) | (((this.b & 0x0F) === 0) ? H : 0);
      } else {
        this.f ^= (this.parityBit((this.b + 1) & 7) ^ 1) ? PV : 0;
        this.f = (this.f & ~H) | (((this.b & 0x0F) === 0x0F) ? H : 0);
      }
    } else {
      this.f ^= (this.parityBit(this.b & 7) ^ 1) ? PV : 0;
    }
  }
  JP_c_nn(c) { this.Q(0); this.wz = this.operands(); if (this.cond(c)) this.pc = this.wz; }
  JP_rr(x) { this.Q(0); this.pc = this.readreg(x); }
  JR_c_e(c) {
    this.Q(0);
    const displacement = s8(this.operand());
    if (!this.cond(c)) return;
    this.wait(5);
    this.wz = (this.pc + displacement) & 0xFFFF;
    this.pc = this.wz;
  }
  LD_a_inn() { this.Q(0); this.wz = this.operands(); this.a = this.rd(this.wz); this.wz = (this.wz + 1) & 0xFFFF; }
  LD_a_irr(x) { this.Q(0); this.wz = this.readreg(x); this.a = this.rd(this.wz); this.wz = (this.wz + 1) & 0xFFFF; }
  LD_inn_a() { this.Q(0); this.wz = this.operands(); this.wr(this.wz, this.a); this.wz = (this.a << 8) | ((this.wz + 1) & 0xFF); }
  LD_inn_rr(x) {
    this.Q(0);
    this.wz = this.operands();
    const xx = this.readreg(x);
    this.wr(this.wz, xx & 0xFF);
    this.wz = (this.wz + 1) & 0xFFFF;
    this.wr(this.wz, (xx & 0xFF00) >>> 8);
  }
  LD_irr_a(x) { this.Q(0); this.wz = this.readreg(x); this.wr(this.wz, this.a); this.wz = (this.a << 8) | ((this.wz + 1) & 0xFF); }
  LD_irr_n(x) {
    this.Q(0);
    if (this.rprefix === HL) {
      const addr = this.displace(x, 2);
      this.wr(addr, this.operand());
    } else {
      const addr = this.displace(x, 0);
      const n = this.operand();
      this.wait(2);
      this.wr(addr, n);
    }
  }
  LD_irr_r(x, y) { this.Q(0); this.wr(this.displace(x), this.readreg(y)); }
  LD_r_n(x) { this.Q(0); this.writereg(x, this.operand()); }
  LD_r_irr(x, y) { this.Q(0); this.writereg(x, this.rd(this.displace(y))); }
  LD_r_r(x, y) { this.Q(0); this.writereg(x, this.readreg(y)); }
  LD_r_r1(x, y) { this.Q(0); this.wait(1); this.writereg(x, this.readreg(y)); }
  LD_r_r2(x, y) {
    this.Q(1);
    this.wait(1);
    this.writereg(x, this.readreg(y));
    const v = this.readreg(x);
    this.f = (this.f & ~(N | H | PV)) | (this.iff2 ? PV : 0);
    this.setXYSZ(v);
    this.p = 1;
  }
  LD_rr_inn(x) {
    this.Q(0);
    let addr = this.operands();
    let d = this.rd(addr);
    addr = (addr + 1) & 0xFFFF;
    d |= this.rd(addr) << 8;
    this.writereg(x, d);
    this.wz = addr;
  }
  LD_rr_nn(x) { this.Q(0); this.writereg(x, this.operands()); }
  LD_sp_rr(x) { this.Q(0); this.wait(2); this.sp = this.readreg(x); }
  LDD() {
    this.Q(1);
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    ta = (ta - 1) & 0xFFFF;
    this.writereg('_HL', ta);
    ta = this.readreg('DE');
    this.wr(ta, data);
    ta = (ta - 1) & 0xFFFF;
    this.writereg('DE', ta);
    this.wait(2);
    this.f = this.f & ~(N | H | PV);
    ta = (this.readreg('BC') - 1) & 0xFFFF;
    if (ta !== 0) this.f |= PV;
    this.writereg('BC', ta);
    const s = (this.a + data) & 0xFF;
    this.f = (this.f & ~(X | Y)) | (s & X) | ((s & 0x02) ? Y : 0);
  }
  LDDR() {
    this.Q(1);
    this.LDD();
    if (this.b === 0 && this.c === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.f = (this.f & ~(X | Y)) | (((this.pc >>> 11) & 1) ? X : 0) | (((this.pc >>> 13) & 1) ? Y : 0);
  }
  LDI() {
    this.Q(1);
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    ta = (ta + 1) & 0xFFFF;
    this.writereg('_HL', ta);
    ta = this.readreg('DE');
    this.wr(ta, data);
    ta = (ta + 1) & 0xFFFF;
    this.writereg('DE', ta);
    this.wait(2);
    this.f = this.f & ~(N | H | PV);
    ta = (this.readreg('BC') - 1) & 0xFFFF;
    if (ta !== 0) this.f |= PV;
    this.writereg('BC', ta);
    const s = (this.a + data) & 0xFF;
    this.f = (this.f & ~(X | Y)) | (s & X) | ((s & 0x02) ? Y : 0);
  }
  LDIR() {
    this.Q(1);
    this.LDI();
    if (this.b === 0 && this.c === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.f = (this.f & ~(X | Y)) | (((this.pc >>> 11) & 1) ? X : 0) | (((this.pc >>> 13) & 1) ? Y : 0);
  }
  NEG() { this.Q(1); this.a = this.SUB(0, this.a); }
  NOP() { this.Q(0); }
  OR_a_irr(x) { this.Q(1); this.a = this.OR(this.a, this.rd(this.displace(x))); }
  OR_a_n() { this.Q(1); this.a = this.OR(this.a, this.operand()); }
  OR_a_r(x) { this.Q(1); this.a = this.OR(this.a, this.readreg(x)); }
  OTDR() {
    this.Q(1);
    this.OUTD();
    if (this.b === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.post_IN_O_R();
  }
  OTIR() {
    this.Q(1);
    this.OUTI();
    if (this.b === 0) return;
    this.wait(5);
    this.pc = (this.pc - 2) & 0xFFFF;
    this.wz = (this.pc + 1) & 0xFFFF;
    this.post_IN_O_R();
  }
  OUT_ic_r(x) { this.Q(0); const ta = this.readreg('BC'); this.out(ta, this.readreg(x)); this.wz = (ta + 1) & 0xFFFF; }
  OUT_ic() { this.Q(0); const ta = this.readreg('BC'); this.wz = (ta + 1) & 0xFFFF; this.out(ta, 0x00); }
  OUT_in_a() {
    this.Q(0);
    const wzl = this.operand();
    this.wz = (this.a << 8) | wzl;
    this.out(this.wz, this.a);
    this.wz = (this.wz & 0xFF00) | ((this.wz + 1) & 0xFF);
  }
  OUTD() {
    this.Q(1);
    this.wait(1);
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    this.data = data;
    ta = (ta - 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.b = (this.b - 1) & 0xFF;
    ta = this.readreg('BC');
    this.out(ta, data);
    this.wz = (ta - 1) & 0xFFFF;
    this.f = (this.f & ~(C | N | H | PV));
    if ((this.l + data) & 0x100) this.f |= C;
    if (data & 0x80) this.f |= N;
    this.parity((((this.l + data) & 7) ^ this.b) & 0xFF);
    this.setXYSZ(this.b);
    if (this.f & C) this.f |= H;
  }
  OUTI() {
    this.Q(1);
    this.wait(1);
    let ta = this.readreg('_HL');
    const data = this.rd(ta);
    ta = (ta + 1) & 0xFFFF;
    this.writereg('_HL', ta);
    this.b = (this.b - 1) & 0xFF;
    ta = this.readreg('BC');
    this.out(ta, data);
    this.data = data;
    this.wz = (ta + 1) & 0xFFFF;
    this.f = (this.f & ~(C | N | H | PV));
    if ((this.l + data) & 0x100) this.f |= C;
    if (data & 0x80) this.f |= N;
    this.parity((((this.l + data) & 7) ^ this.b) & 0xFF);
    this.setXYSZ(this.b);
    if (this.f & C) this.f |= H;
  }
  POP_rr(x) { this.Q(0); this.writereg(x, this.pop()); }
  PUSH_rr(x) { this.Q(0); this.wait(1); this.push(this.readreg(x)); }
  RES_o_irr(bit, addr) { this.Q(0); const a = this.address(addr); const v = this.RES(bit, this.rd(a)); this.wait(1); this.wr(a, v); }
  RES_o_irr_r(bit, addr, x) {
    this.Q(0);
    this.wait(2);
    const tv = this.RES(bit, this.rd(this.address(addr)));
    this.wait(1);
    this.writereg(x, tv);
    this.wr(this.address(addr), tv);
  }
  RES_o_r(bit, x) { this.Q(0); this.writereg(x, this.RES(bit, this.readreg(x))); }
  RET() { this.Q(0); this.wz = this.pop(); this.pc = this.wz; }
  RET_c(c) { this.Q(0); this.wait(1); if (!this.cond(c)) return; this.wz = this.pop(); this.pc = this.wz; }
  RETI() { this.Q(0); this.wz = this.pop(); this.pc = this.wz; this.iff1 = this.iff2; }
  RETN() { this.Q(0); this.wz = this.pop(); this.pc = this.wz; this.iff1 = this.iff2; }
  RL_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.RL(this.rd(a)); this.wait(1); this.wr(a, v); }
  RL_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.RL(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  RL_r(x) { this.Q(1); this.writereg(x, this.RL(this.readreg(x))); }
  RLA() {
    this.Q(1);
    const c = (this.a & 0x80) ? 1 : 0;
    this.a = ((this.a << 1) | (this.f & C)) & 0xFF;
    this.f = (this.f & ~(C | N | H)) | c;
    this.setXY(this.a);
  }
  RLC_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.RLC(this.rd(a)); this.wait(1); this.wr(a, v); }
  RLC_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.RLC(this.rd(this.address(addr)));
    this.wait(1);
    this.writereg(x, tv);
    this.wr(this.address(addr), tv);
  }
  RLC_r(x) { this.Q(1); this.writereg(x, this.RLC(this.readreg(x))); }
  RLCA() {
    this.Q(1);
    const c = (this.a & 0x80) ? 1 : 0;
    this.a = ((this.a << 1) | c) & 0xFF;
    this.f = (this.f & ~(C | N | H)) | c;
    this.setXY(this.a);
  }
  RLD() {
    this.Q(1);
    const ta = this.readreg('HL');
    this.wz = (ta + 1) & 0xFFFF;
    const data = this.rd(ta);
    this.wait(4);
    this.wr(ta, ((data << 4) | (this.a & 0x0F)) & 0xFF);
    this.a = (this.a & 0xF0) | (data >>> 4);
    this.f = this.f & ~(N | H | PV);
    this.parity(this.a);
    this.setXYSZ(this.a);
  }
  RR_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.RR(this.rd(a)); this.wait(1); this.wr(a, v); }
  RR_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.RR(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  RR_r(x) { this.Q(1); this.writereg(x, this.RR(this.readreg(x))); }
  RRA() {
    this.Q(1);
    const c = this.a & 1;
    this.a = ((this.f & C) << 7) | (this.a >>> 1);
    this.f = (this.f & ~(C | N | H)) | c;
    this.setXY(this.a);
  }
  RRC_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.RRC(this.rd(a)); this.wait(1); this.wr(a, v); }
  RRC_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.RRC(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  RRC_r(x) { this.Q(1); this.writereg(x, this.RRC(this.readreg(x))); }
  RRCA() {
    this.Q(1);
    const c = this.a & 1;
    this.a = (c << 7) | (this.a >>> 1);
    this.f = (this.f & ~(C | N | H)) | c;
    this.setXY(this.a);
  }
  RRD() {
    this.Q(1);
    const ta = this.readreg('HL');
    this.wz = (ta + 1) & 0xFFFF;
    const data = this.rd(ta);
    this.wait(4);
    this.wr(ta, ((data >>> 4) | (this.a << 4)) & 0xFF);
    this.a = (this.a & 0xF0) | (data & 0x0F);
    this.f = this.f & ~(N | H | PV);
    this.parity(this.a);
    this.setXYSZ(this.a);
  }
  RST_o(vector) { this.Q(0); this.wait(1); this.push(this.pc); this.wz = parseInt(vector, 10) << 3; this.pc = this.wz; }
  SBC_a_irr(x) { this.Q(1); this.a = this.SUB(this.a, this.rd(this.displace(x)), this.f & C); }
  SBC_a_n() { this.Q(1); this.a = this.SUB(this.a, this.operand(), this.f & C); }
  SBC_a_r(x) { this.Q(1); this.a = this.SUB(this.a, this.readreg(x), this.f & C); }
  SBC_hl_rr(x) {
    this.Q(1);
    this.wz = (this.readreg('HL') + 1) & 0xFFFF;
    this.wait(4);
    const lo = this.SUB(this.readreg('L'), this.readreg(x) & 0xFF, this.f & C);
    this.wait(3);
    const hi = this.SUB(this.readreg('H'), (this.readreg(x) >>> 8) & 0xFF, this.f & C);
    this.writereg('HL', (hi << 8) | lo);
    this.f = (this.f & ~Z) | ((hi === 0 && lo === 0) ? Z : 0);
  }
  SCF() {
    if (this.q !== 0 && this.prefix !== 0xDD && this.prefix !== 0xFD) {
      this.f = this.f & ~(X | Y);
    }
    this.f = (this.f & ~(C | N | H)) | C;
    this.f = (this.f & ~(X | Y)) | ((this.f | this.a) & (X | Y));
    this.Q(1);
  }
  SET_o_irr(bit, addr) { this.Q(0); const a = this.address(addr); const v = this.SET(bit, this.rd(a)); this.wait(1); this.wr(a, v); }
  SET_o_irr_r(bit, addr, x) {
    this.Q(0);
    this.wait(2);
    const tv = this.SET(bit, this.rd(this.address(addr)));
    this.wait(1);
    this.writereg(x, tv);
    this.wr(this.address(addr), tv);
  }
  SET_o_r(bit, x) { this.Q(0); this.writereg(x, this.SET(bit, this.readreg(x))); }
  SLA_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.SLA(this.rd(a)); this.wait(1); this.wr(a, v); }
  SLA_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.SLA(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  SLA_r(x) { this.Q(1); this.writereg(x, this.SLA(this.readreg(x))); }
  SLL_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.SLL(this.rd(a)); this.wait(1); this.wr(a, v); }
  SLL_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.SLL(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  SLL_r(x) { this.Q(1); this.writereg(x, this.SLL(this.readreg(x))); }
  SRA_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.SRA(this.rd(a)); this.wait(1); this.wr(a, v); }
  SRA_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.SRA(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  SRA_r(x) { this.Q(1); this.writereg(x, this.SRA(this.readreg(x))); }
  SRL_irr(addr) { this.Q(1); const a = this.address(addr); const v = this.SRL(this.rd(a)); this.wait(1); this.wr(a, v); }
  SRL_irr_r(addr, x) {
    this.Q(1);
    this.wait(2);
    const tv = this.SRL(this.rd(this.address(addr)));
    this.writereg(x, tv);
    this.wait(1);
    this.wr(this.address(addr), tv);
  }
  SRL_r(x) { this.Q(1); this.writereg(x, this.SRL(this.readreg(x))); }
  SUB_a_irr(x) { this.Q(1); this.a = this.SUB(this.a, this.rd(this.displace(x))); }
  SUB_a_n() { this.Q(1); this.a = this.SUB(this.a, this.operand()); }
  SUB_a_r(x) { this.Q(1); this.a = this.SUB(this.a, this.readreg(x)); }
  XOR_a_irr(x) { this.Q(1); this.a = this.XOR(this.a, this.rd(this.displace(x))); }
  XOR_a_n() { this.Q(1); this.a = this.XOR(this.a, this.operand()); }
  XOR_a_r(x) { this.Q(1); this.a = this.XOR(this.a, this.readreg(x)); }

  // --- dispatch and the step loop ---
  execBase(op) {
    const e = BASE[op];
    if (e === -1) this.fail('undefined opcode ' + hex2(op));
    this[MN[e[0]]](e[1], e[2], e[3]);
  }
  execCB(op) {
    const e = CB[op];
    if (e === -1) this.fail('undefined CB opcode ' + hex2(op));
    this[MN[e[0]]](e[1], e[2], e[3]);
  }
  execED(op) {
    const e = ED[op];
    if (e === -1) this.fail('undefined ED opcode ' + hex2(op));
    this[MN[e[0]]](e[1], e[2], e[3]);
  }
  execCBd(addr, op) {
    const e = CBD[op];
    if (e === -1) this.fail('undefined DD/FD CB opcode ' + hex2(op));
    const a1 = e[1] === 'addr' ? addr : e[1];
    const a2 = e[2] === 'addr' ? addr : e[2];
    const a3 = e[3] === 'addr' ? addr : e[3];
    this[MN[e[0]]](a1, a2, a3);
  }

  step() {
    this.steps++;
    const t0 = this.tstates;
    this.opc = this.pc;
    this.rprefix = HL; this.prefix = 0;
    let op = this.fetch(); this.incR();
    while (op === 0xDD || op === 0xFD) {
      this.prefix = op;
      this.rprefix = op === 0xDD ? IX : IY;
      op = this.fetch(); this.incR();
    }
    if (op === 0xCB && this.rprefix !== HL) {
      this.prefix = ((this.prefix << 8) | 0xCB) & 0xFFFF;
      const base = this.rprefix === IX ? this.ix : this.iy;
      const d = this.operand();
      this.wz = (base + s8(d)) & 0xFFFF;
      this.rprefix = HL;
      const cb = this.rd(this.pc); this.pc = (this.pc + 1) & 0xFFFF;
      this.execCBd(this.wz, cb);
    } else if (op === 0xCB) {
      const cb = this.fetch(); this.incR();
      this.prefix = 0xCB;
      this.execCB(cb);
    } else if (op === 0xED) {
      this.rprefix = HL;
      const ed = this.fetch(); this.incR();
      this.prefix = 0xED;
      this.execED(ed);
    } else {
      this.execBase(op);
    }
    this.q = this.sq ? this.f : 0;
    return this.tstates - t0;
  }
}

module.exports = { CPU };
if (typeof globalThis !== 'undefined') globalThis.Z80 = { CPU };
