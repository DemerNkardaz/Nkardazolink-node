const fs=require("fs"),chokidar=require("chokidar"),ini={parse(t){const e=fs.readFileSync(t,"utf-8").split("\n");let i=null;const s={};return e.forEach((t=>{if(!(t=t.trim()).startsWith(";")&&""!==t)if(t.startsWith("[")&&t.endsWith("]"))i=t.substring(1,t.length-1),s[i]={};else{const e=t.split("="),r=e[0].trim();let n=e[1].trim();n="true"===n.toLowerCase()||"false"!==n.toLowerCase()&&n.split(",").map((t=>t.trim())),s[i][r]=n}})),s},watch(t,e){chokidar.watch(t).on("change",(()=>{const i=ini.parse(t);global[e]=i,console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟧 > [INI] :: Configuration file ${t.split("/").pop()} has been changed[39m`)}))}};module.exports={ini:ini};