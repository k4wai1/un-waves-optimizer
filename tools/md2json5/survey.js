const j5loc=require("child_process").execSync("find node_modules/.pnpm/json5@2.2.3 -name index.js").toString().trim();
const j5=require('/home/luis/deepcode/un-waves-optimizer/node_modules/.pnpm/json5@2.2.3/node_modules/json5/lib/index.js');
const fs=require("fs"),path=require("path");
const dir="libs/ww/stats/src/resonators";
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".json5") && f!=="CharacterTemplate.json5");
const out={};
for(const f of files){
  const o=j5.parse(fs.readFileSync(path.join(dir,f),"utf8"));
  const acts=o.actions||[];
  const stats=o.stats||{};
  // acciones por stat de escalado
  const statCount={};
  acts.forEach(a=>((a.scaling||[]).forEach(s=>{statCount[s.stat]=(statCount[s.stat]||0)+1;})));
  // hits totales estimados
  const totalHits=acts.reduce((acc,a)=>{let h=0;((a.scaling||[]).forEach(s=>h+=s.hits||1));return acc+h;},0);
  out[f]={nAct:acts.length, nEff:(o.effects||[]).length, statCount, totalHits,
    hpKeys:Object.keys(stats.hp||{}).length, elem:o.metadata?.element, weapon:o.metadata?.weaponType};
}
console.log("=== PORCENTAJE de acciones por stat de escalado ===");
const agg={};
Object.entries(out).forEach(([f,d])=>{Object.entries(d.statCount).forEach(([k,v])=>{agg[k]=(agg[k]||0)+v;});});
console.log(agg);
console.log("\n=== Personajes con acciones HP/DEF/FLAT (scaling no-ATK) ===");
Object.entries(out).forEach(([f,d])=>{const non=Object.entries(d.statCount).filter(([k])=>k!=="ATK"); if(non.length) console.log(f.padEnd(20), JSON.stringify(non));});
console.log("\n=== count total hits vs acciones ===");
Object.entries(out).sort((a,b)=>b[1].totalHits-a[1].totalHits).slice(0,8).forEach(([f,d])=>console.log(f.padEnd(20),"act="+d.nAct,"hits="+d.totalHits));
console.log("\n=== con hpKeys != 8 (breakpoints incompletos) y sin elemento/arma ===");
Object.entries(out).forEach(([f,d])=>{
  const flags=[];
  if(d.hpKeys!==8) flags.push("hpKeys="+d.hpKeys);
  if(!d.elem) flags.push("sin elemento");
  if(!d.weapon) flags.push("sin arma");
  if(flags.length) console.log(f.padEnd(20), flags.join(","), "| elem="+d.elem,"wp="+d.weapon);
});
