'use strict';
// A part that lies over the resident engine holds only its own bytes. The routines the
// tests run live in the engine, so listing() fills what the part does not own from the
// part beneath, the way the machine had them in memory.
module.exports=function layered(g){
 const own=g.listing.bind(g);
 g.listing=function(file='listing.json'){
  const L=own(file),part=file.match(/parts\/([^/]+)\//);
  if(!part||part[1]==='resident')return L;
  const P=g.json(`parts/${part[1]}/part.json`);
  if(!P.over)return L;
  const B=g.listing(`parts/${P.over}/listing.json`);
  for(let a=0;a<0x10000;a++)if(!L.has[a]&&B.has[a]){L.ram[a]=B.ram[a];L.has[a]=1;}
  for(const[n,a]of B.byName)if(!L.byName.has(n)&&!L.names.has(a)){L.byName.set(n,a);L.names.set(a,n);}
  return L;
 };
 return g;
};
