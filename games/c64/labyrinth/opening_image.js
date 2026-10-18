'use strict';
// Recreate the opening wheel state from its authored descriptor, then apply the
// recorded post-setup scratch values. Runtime arrays are excluded from coverage.
const {CPU}=require('../../../kit/cpu/cpu6502.js');
module.exports=function openingImage(g){
 const image=g.listing('parts/opening/listing.json');
 const c=new CPU(Uint8Array.from(image.ram));c.call(0x0d2d,{x:0x07,y:0xab,d:0});
 for(const [a,v] of [[0x665d,2],[0x665e,255],[0x665f,255],[0x6662,0x34],[0x6664,0x37],[0x6666,0],[0x6681,4],[0x6683,66],[0x6684,76],[0x6685,85],[0x6686,69],[0x668d,23],[0x6742,255],[0x6743,255],[0x6744,255],[0x6745,255],[0x6748,0x8d],[0x6749,255],[0x674a,255]])c.m[a]=v;
 image.ram=c.m;return image;
};
