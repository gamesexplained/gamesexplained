'use strict';
const assert=require('assert'),path=require('path');
const {game}=require(path.resolve(__dirname,'../../../kit/scripts/port_check.js'));
const {CPU}=require(path.resolve(__dirname,'../../../kit/cpu/cpu6502.js'));
const g=game(__dirname),{ram}=require('./opening_image.js')(g);
const {labyrinthChangeStart:start,labyrinthChangeStep:step}=g.run('levels.html','labyrinth-change','labyrinthChangeStart','labyrinthChangeStep');
const {labyrinthChangeReplies:counterReplies}=g.run('levels.html','labyrinth-change-text','labyrinthChangeReplies');
const fields={quarterByte:0x673a,nickelByte:0x6735,phase:0x968c,changeByte:0x968d,pickup:0xaab3,nickelTaken:0x968a,nickelReturned:0x9689,karma:0x575};
const plain=x=>JSON.parse(JSON.stringify(x));
function original(s,action){
 const c=new CPU(Uint8Array.from(ram));for(const [key,a] of Object.entries(fields))c.m[a]=s[key];c.m[0xaa97]=s.description>>8;c.m[0xaaa5]=s.description&255;c.m[0x8c80]=7;c.m[0x666f]=12;
 const replies=[];c.call({take:0x927c,complain:0x954a,return:0x9327}[action],{d:0},{hooks:{0x8cda:c=>{replies.push(c.y+256*c.x);c.rts();},0x8ce3:c=>{replies.push(c.m[0x10]+256*c.m[0x11]);c.rts();},0x5fbd:c=>c.rts()}});
 const state={};for(const [key,a] of Object.entries(fields))state[key]=c.m[a];state.description=c.m[0xaaa5]+256*c.m[0xaa97];return {state,reply:replies.at(-1)};
}
let checks=0;
function check(s,action){const actual=original(s,action),expected=plain(step(s,action));assert.deepStrictEqual(expected,actual,JSON.stringify({s,action}));assert.equal(typeof counterReplies[actual.reply],'string','missing displayed counter reply '+actual.reply);checks++;return expected.state;}
// All states reachable by these counter actions after this purchased state.
const todo=[plain(start())],seen=new Set();
while(todo.length){const s=todo.shift(),key=JSON.stringify(s);if(seen.has(key))continue;seen.add(key);for(const action of ['take','complain','return'])todo.push(check(s,action));}
// Every possible phase, quantity and flag byte, plus interactions of edge values.
for(const field of Object.keys(fields))for(let value=0;value<256;value++)for(const action of ['take','complain','return'])check({...plain(start()),[field]:field==='pickup'?[0,12,17][value%3]:value},action);
let seed=0x5417c64;
const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
for(let i=0;i<600;i++){
 const s=plain(start());for(const field of Object.keys(fields))s[field]=field==='pickup'?[0,12,17][random()%3]:random()&255;
 for(const action of ['take','complain','return'])check(s,action);
}
for(const karma of [0,1,255])for(const conversation of [0,1,127]){
 const c=new CPU(Uint8Array.from(ram));c.m[0x8c80]=9;c.m[0x666f]=16;c.m[0x6739]=0;c.m[0x575]=karma;c.m[0x8c81]=conversation;
 let reply;c.call(0x9327,{d:0},{hooks:{0x8cda:c=>{reply=c.y+256*c.x;c.rts();},0x5fbd:c=>c.rts()}});
 assert.equal(reply,karma===1?0x80a7:0x80f6);assert.equal(c.m[0x6739],karma===1?255:0);
}
let live=0;for(const scenario of g.json('change-observations.json').scenarios){let s=plain(start());assert.deepStrictEqual(s,scenario.after_purchase);for(const observation of scenario.steps){s=plain(step(s,observation.action).state);assert.deepStrictEqual(s,observation.state,scenario.id);live++;}}
console.log(`OK - ${seen.size} reachable counter states, ${checks} original-code transitions and nine later popcorn offers; ${live} live transitions agree`);
