const fs=require("fs"), path=require("path");
const dir="libs/ww/stats/src/resonators";
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".json5") && !dir.includes("old"));
let total=0, bad=0;
const row=files.map(f=>{
  const full=path.join(dir,f);
  const content=fs.readFileSync(full,"utf8");
  total++;
  // json5->json heurístico
  const j5=content.replace(/\/\/[^\n]*/g,"").replace(/,\s*([}\]])/g,"$1").replace(/([{\[,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g,'$1"$2":');
  try{
    const o=JSON.parse(j5);
    const nAct=(o.actions||[]).length, nEff=(o.effects||[]).length;
    const firstLv=(o.actions||[])[0]?.scaling?.[0]?.multiplier?.length??0;
    const elem=o.metadata?.element, wp=o.metadata?.weaponType;
    return {f, ok:true, nAct, nEff, firstLv, elem, wp};
  }catch(e){ bad++; return {f, ok:false, err:e.message}; }
});
const badRows=row.filter(r=>!r.ok);
console.log("generados:", row.length, "validos:", row.length-bad, "malos:", bad);
console.log("--- nivel de skill (multipliers) por personaje ---");
const byLvl={};
row.filter(r=>r.ok).forEach(r=>{ const k=r.firstLv||'0'; byLvl[k]=(byLvl[k]||0)+1; });
console.log(byLvl);
console.log("--- distribucion tipos de arma ---");
const byWp={}; row.filter(r=>r.ok).forEach(r=>{byWp[r.wp]=(byWp[r.wp]||0)+1;}); console.log(byWp);
console.log("--- sin actions (nAct=0) ---");
row.filter(r=>r.ok&&r.nAct===0).forEach(r=>console.log(r.f));
if(bad) { console.log("--- ERRORES JSON ---"); badRows.forEach(r=>console.log(r.f, r.err)); }
