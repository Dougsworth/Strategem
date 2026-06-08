import { Chess } from "chess.js";
import { readFileSync } from "node:fs";
const src = readFileSync("src/data/puzzlePool.data.ts","utf8");
const start = src.indexOf('[{"id"');
const json = src.slice(start, src.lastIndexOf("}]")+2);
const POOL = JSON.parse(json);
let ok=0, bad=0; const badIds=[];
for (const e of POOL) {
  try {
    const c = new Chess(e.f);
    let good=true;
    for (const m of e.s.split(" ")) {
      const r = c.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});
      if(!r){good=false;break;}
    }
    if(good) ok++; else {bad++; if(badIds.length<8)badIds.push(e.id);}
  } catch { bad++; if(badIds.length<8)badIds.push(e.id); }
}
console.log("total",POOL.length,"| ok",ok,"| bad",bad, badIds);
const bands={};
for(const e of POOL){const b=Math.floor(e.r/200)*200;bands[b]=(bands[b]||0)+1;}
console.log("rating spread:",bands);
const themes={};
for(const e of POOL)for(const t of e.t.split(" "))themes[t]=(themes[t]||0)+1;
const top=Object.entries(themes).sort((a,b)=>b[1]-a[1]).slice(0,15);
console.log("top themes:",top);
