const fs=require("fs"),{promisify:promisify}=require("util"),readFile=promisify(fs.readFile),chokidar=require("chokidar"),path=require("path");let isProcessing=!1;const parseSize=e=>(e=e.toUpperCase()).endsWith("K")?1024*parseInt(e.slice(0,-1)):e.endsWith("M")?1024*parseInt(e.slice(0,-1))*1024:e.endsWith("G")?1024*parseInt(e.slice(0,-1))*1024*1024:e.endsWith("T")?1024*parseInt(e.slice(0,-1))*1024*1024*1024:parseInt(e),parseLines=e=>{const t=e.split("\n");let s=null,i=",",r=!1;const n={};t.forEach((e=>{e.startsWith("splitBy")&&(i=e.split("=")[1].trim()),e.startsWith("bracketCommands")&&(r="true"===e.split("=")[1].trim())}));try{t.forEach((e=>{if(!(e=e.trim()).startsWith(";")&&""!==e)if(e.startsWith("[")&&e.endsWith("]"))s=e.substring(1,e.length-1),n[s]={};else{const t=e.split("="),a=t[0].trim();let o=t[1].trim();if(o.startsWith("{this}")){let e=o.split("{this}/")[1];const t=path.join(__dirname,"..","..");o=path.join(t,e)}else if(o.startsWith("{math}:")){o.split("{math}:")[1].trim()}if(/^\d+(K|M|G|T)$/i.test(o)?o=parseSize(o):"true"===o.toLowerCase()?o=!0:"false"===o.toLowerCase()?o=!1:r&&o.startsWith("${")&&o.endsWith("}")?o=new Function(`return ${o.slice(2,-1)}`)():o.includes(i)&&o.length>1&&(o=o.split(i).map((e=>e.trim()))),a.includes(".")){const e=a.split(".");let t=n[s];for(let s=0;s<e.length-1;s++){const i=e[s];t.hasOwnProperty(i)||(t[i]={}),t=t[i]}t[e[e.length-1]]=o}else n[s][a]=o}}))}catch(e){console.error(e)}return n},ini={async reInit(e){try{const t=await readFile(e,"utf-8");return parseLines(t)}catch(t){console.error(`Error reading file ${e}: ${t.message}`)}},parse(e,t){const s=fs.readFileSync(e,"utf-8"),i=parseLines(s);if(!t)return i;global[t]=i},watch:(e,t)=>{chokidar.watch(e).on("change",(async()=>{isProcessing||(isProcessing=!0,await new Promise((async(t,s)=>{let i;setTimeout((async()=>{try{i=await ini.reInit(e)}catch(e){s(e)}finally{t(i)}}),1e3)})).then((s=>{try{s?(global[t]=s,console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟧 > [INI] :: Configuration file ${e.split("\\").pop()} has been changed[39m`)):console.error(`[31m[${(new Date).toLocaleString().replace(",","")}] :: 🟥 > [INI] :: Parsed data is undefined for file ${e.split("\\").pop()}[39m`)}catch(t){console.error(`[31m[${(new Date).toLocaleString().replace(",","")}] :: 🟥 > [INI] :: Error reading file ${e.split("\\").pop()}: ${t.message}[39m`)}finally{isProcessing=!1}})))}))}};module.exports={ini:ini};