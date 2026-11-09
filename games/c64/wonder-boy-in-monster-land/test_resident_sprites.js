'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=path.join(__dirname,'parts/resident'),mem=new Uint8Array(65536),seen=new Uint8Array(65536);
for(const r of JSON.parse(fs.readFileSync(path.join(dir,'listing.json'))).records)if(r.b){mem.set(r.b,r.a);seen.fill(1,r.a,r.a+r.b.length);}
for(const [address,hash] of [[0xd800,'c0986d49c1354de390cd9bf75c89b7a36392bffdaf0045e1a54afc8b3c29e263'],[0xd840,'6c0763c1ef6dd7fa8aeff11d1aa8d72fc40f5f0b628c3f9b4c1e9127389e414a'],[0xd8c0,'e56bd8a759f5b4775b048310daca73a3af6ac36c0f6331f3e33e6d1ecc6acfac']]){
 assert(seen.slice(address,address+63).every(Boolean),`slot ${address.toString(16)} is listed`);
 assert.equal(crypto.createHash('sha256').update(mem.slice(address,address+63)).digest('hex'),hash,`slot ${address.toString(16)} matches observed entry`);
}
const html=fs.readFileSync(path.join(__dirname,'graphics.html'),'utf8');
const match=html.match(/<script id="hud-sprite-data" type="application\/json">([^<]+)<\/script>/);assert(match,'HUD graphics data');
for(const sprite of JSON.parse(match[1]))assert.deepEqual(sprite.pixels,[...mem.slice(0xc000+sprite.slot*64,0xc000+sprite.slot*64+63)]);
const source=html.match(/<script id="player-source-data" type="application\/json">([^<]+)<\/script>/);assert(source,'player source data');
const stage=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(__dirname,'parts/stage-01/listing.json'))).records)if(r.b)stage.set(r.b,r.a);
assert.deepEqual(JSON.parse(source[1]),[[...stage.slice(0xacc7,0xad06)],[...stage.slice(0xad07,0xad46)]]);
console.log('OK - observed resident sprite bitmaps and their viewers match captured bytes');
