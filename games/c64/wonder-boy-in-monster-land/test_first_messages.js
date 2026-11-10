'use strict';
const assert=require('assert'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const root=__dirname,m=new Uint8Array(65536);for(const r of JSON.parse(fs.readFileSync(path.join(root,'parts/stage-01/listing.json'))).records)if(r.b)m.set(r.b,r.a);
function glyph(b){if(b===32)return ' ';if(b>=1&&b<=10)return String(b-1);if((b>=65&&b<=90)||(b>=97&&b<=122))return String.fromCharCode(b);const p={11:'(',12:')',13:'/',14:':',15:'&',16:'-',91:'.',92:"'",93:'!',94:',',95:'?'};assert(p[b],`unknown glyph ${b}`);return p[b];}
const records=JSON.parse(fs.readFileSync(path.join(root,'first-messages.json'))).records;
for(const r of records){let pos=r.address,fields=[];for(let i=0;i<3;i++){let field='';while(m[pos])field+=glyph(m[pos++]);pos++;fields.push(field);}assert.deepEqual(fields,r.fields);assert.equal(m[pos],r.control);assert.equal(pos+1-r.address,r.length);assert.equal(crypto.createHash('sha256').update(m.slice(r.address,pos+1)).digest('hex'),r.sha256);}
console.log(`OK - ${records.length} first-load message records decode from listing bytes`);
