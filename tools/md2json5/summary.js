require("ts-node").register({transpileOnly:true, compilerOptions:{module:"commonjs",moduleResolution:"node"}});
const fs=require("fs");
const path=require("path");
const {parseMd, buildJson5}=require("./generator.ts");
const dir="combate-personajes";
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".md")).sort();
let bad=0, ok=0;
const issues=[];
for(const f of files){
  try{
    const p=parseMd(fs.readFileSync(path.join(dir,f),"utf8"));
    const skills=p.skills.length;
    const actions=(()=>{ try{ const s=buildJson5(p, f.replace(/-combate\.md$/,'')); return (s.match(/type: "/g)||[]).length; }catch(e){ return -1; }})();
    const asc=p.ascension.length;
    const realTotal=p.skills.reduce((a,s)=>a+(s.real?1:0),0);
    const flag=[];
    if(asc<8) flag.push("ascension:"+asc);
    if(realTotal===0) flag.push("NO-REAL-LEVELS");
    if(skills===0) flag.push("NO-SKILLS");
    if(actions<=0) flag.push("NO-ACTIONS");
    if(flag.length) issues.push(`${f}\t${p.name}\t[${flag.join(",")}]\tactions=${actions}`), bad++; else ok++;
  }catch(e){ issues.push(`${f}\tERR ${e.message}`); bad++; }
}
console.log("TOTAL:", files.length, "OK:", ok, "ISSUES:", bad);
console.log("--- issues ---");
issues.forEach(i=>console.log(i));
