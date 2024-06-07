const{loadComponent:loadComponent}=require("./src/serverside/scripts/ComponentHandling.js");async function writeRobots_x_SiteMap(){try{const e=`${await readFileAsync("./fun/ascii.txt","utf8")}\nUser-agent: *\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`;await fs.writeFileSync("./static/site.maps/robots.txt",e,"utf-8"),console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟪 > [SERVER] :: Write robots.txt completed[39m`);const t=[{url:`http://${process.env.HOST}:${process.env.PORT}/`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"1.0"},{url:`http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"},{url:`http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"},{url:`http://${process.env.HOST}:${process.env.PORT}/wiki/`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.4"}];VALID_MODES.forEach((e=>{"cv"===e?VALID_SELECTED.forEach((s=>{t.push({url:`http://${process.env.HOST}:${process.env.PORT}/?mode=${e}&selected=${s}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})})):t.push({url:`http://${process.env.HOST}:${process.env.PORT}/?mode=${e}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})}));const s=(e=>{const t=new Set;return e.forEach((e=>{const s=e.match(/\.([^.\/\?]+)(?:\?|$)/);s&&t.add(s[1])})),Array.from(t)})(t.map((e=>e.url)));__NK__.langs.supported.forEach((e=>{t.forEach((a=>{if(!a.url.includes("lang")&&!s.some((e=>a.url.endsWith(e)))){const s=a.url.includes("/?")?"&":"?";t.push({url:`${a.url}${s}lang=${e}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})}}))}));const a=[],o=xmlbuilder.create("urlset",{version:"1.0",encoding:"UTF-8"}).att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9");t.forEach((e=>{o.ele("url").ele("loc",e.url).up().ele("lastmod",e.lastmod).up().ele("changefreq",e.changefreq).up().ele("priority",e.priority)})),a.push({url:"sitemap_headlinks.xml",lastmod:(new Date).toISOString(),content:o.end({pretty:!1})});const n=xmlbuilder.create("sitemapindex",{version:"1.0",encoding:"UTF-8"}).att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9");a.forEach((e=>{n.ele("sitemap").ele("loc",`http://${process.env.HOST}:${process.env.PORT}/${e.url}.gz`).up().ele("lastmod",e.lastmod).up(),n.ele("sitemap").ele("loc",`http://${process.env.HOST}:${process.env.PORT}/${e.url}`).up().ele("lastmod",e.lastmod).up()})),a.push({url:"sitemap.index.xml",lastmod:(new Date).toISOString(),content:n.end({pretty:!1})}),a.forEach((e=>{fs.writeFileSync(`./static/site.maps/${e.url}`,e.content,"utf-8"),console.log(`[34m[${(new Date).toLocaleString().replace(",","")}] :: 🔵 > [SITEMAP] :: [${e.url}] created[39m`),zlib.gzip(e.content,((t,s)=>{t?console.error(t):(fs.writeFileSync(`./static/site.maps/${e.url}.gz`,s,"binary"),console.log(`[34m[${(new Date).toLocaleString().replace(",","")}] :: 🔵 > [SITEMAP] :: [${e.url}] compressed with GZIP[39m`))}))}))}catch(e){console.error(e)}}require("dotenv").config(),require("./nk.config.js").config().init(),console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟪 > [SERVER] :: Server started[39m`),app.use(compression()),app.use(express.static(path.join(__PROJECT_DIR__,"static/assets"))),app.use(express.static(path.join(__PROJECT_DIR__,"static/public"))),app.use(express.static(path.join(__PROJECT_DIR__,"static/site.maps"))),app.use(express.urlencoded({extended:!1})),app.use(cookieParser()),app.use(express.json()),app.set("view engine","ejs"),app.set("views",path.join(__PROJECT_DIR__,"app")),markdown.core.ruler.enable(["abbr"]),markdown.inline.ruler.enable(["ins","mark","footnote_inline","sub","sup"]),markdown.block.ruler.enable(["footnote","deflist"]),markdown.renderFile=async function(e,t){const s=(await readFileAsync(e,"utf8")).replace(/```js\s\%([\s\S]*?)```/g,((e,s)=>{try{return new Function("data",s).bind(null,t)()}catch(t){return console.log(t),e}})).replace(/\${((?!{[^{]*}).*?)}/g,((e,s)=>{const a=s.match(/\.[\s\S]*?\)/g)?s.replace(/\.[\s\S]*?\)/g,"").split(".").map((e=>`["${e}"]`)).join(""):s.includes("(")?s:s.split(".").map((e=>`["${e}"]`)).join(""),o=s.match(/(\.\w+\(.*?\))/g)?s.match(/(\.\w+\(.*?\))/g).join(""):"";try{return new Function("data",`return data${a}${o}`)(t)}catch(a){try{return new Function("data",`return ${s}`)(t)}catch(t){return console.log(t),`<span title="${t}" style="cursor: help">${e}</span>`}}}));return await markdown.render(s)},(async()=>{await writeRobots_x_SiteMap()})(),app.use(((e,t,s)=>{if(e.url.endsWith(".css")){t.setHeader("Content-Type","text/css");const a=path.join(__dirname,"app","styles",e.url.replace(".css",".scss"));if(fs.existsSync(a)){const e=sass.compile(a,{style:"compressed"}),s=new Readable;s._read=()=>{},s.push(e.css),s.push(null),s.pipe(t)}else{const a=path.join(__dirname,"app","styles","skins",e.url.replace(".css",".scss"));if(fs.existsSync(a)){const e=spawn("node",["-e",`\n                    const sass = require('sass');\n                    const fs = require('fs');\n                    const scssFilePath = '${a}';\n                    const result = sass.compile(scssFilePath, { style: 'compressed' });\n                    process.stdout.write(result.css);\n                `]);e.stdout.on("data",(e=>{t.write(e)})),e.on("close",(e=>{t.end()})),e.stderr.on("data",(e=>{console.error(`Ошибка: ${e}`),t.status(500).send("Ошибка компиляции SCSS")}))}else s()}}else s()}));const dataArray=[];function generateUserId(e){const t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let s="";for(let a=0;a<e;a++){const e=Math.floor(62*Math.random());s+=t.charAt(e)}return s}async function getLastModifiedInFolders(){try{const e=["./","./app","./static"],t=await Promise.all(e.map((async e=>{const t=await fs.promises.readdir(e),s=await Promise.all(t.map((async t=>{const s=path.join(e,t);return(await fs.promises.stat(s)).mtime})));return Math.max(...s)})));return Math.max(...t)}catch(e){throw console.error("Ошибка при получении даты последнего обновления:",e),e}}__NK__.langs.supported.forEach((e=>{dataArray.push({source:`./static/assets/locale/common/main.${e}.yaml`,as:`locale.${e}`})})),dataArray.push({source:"./static/assets/locale/common/asset.common.yaml",as:"locale.common"}),dataArray.push({source:"./static/assets/locale/common/asset.templates.yaml",as:"locale.templates"}),DataExtend(dataArray,__PROJECT_DIR__).then((()=>console.log(`[32m[${(new Date).toLocaleString().replace(",","")}] :: 🟩 > [DATA-EXTEND] :: Extension of data completed[39m`))).catch((e=>console.error(`[${(new Date).toLocaleString().replace(",","")}] :: 🟥 > [DATA-EXTEND] :: Error extending data: ${e.message}`))),app.use(((e,t,s)=>{t.setHeader("X-Content-Type-Options","nosniff"),t.setHeader("Content-Type","text/html; charset=utf-8"),s()})),app.get("/",(async(e,t)=>{try{console.log(`[32m[${(new Date).toLocaleString().replace(",","")}] :: 💠 > [SERVER] :: Latest modify date is [${new Date(await getLastModifiedInFolders()).toLocaleString()}][39m`);const s={};for(const t in e.cookies)for(const a of VALID_COOKIES)if(t.startsWith(a)){const a=t.split(".")[0],o=e.cookies[t];s[a]=s[a]||{},s[a][t.substring(a.length+1)]=o}const a={...s,request:e,userURL:e.url,fullURL:`${e.protocol}://${e.get("host")}${e.url}`,domainURL:`${e.protocol}://${e.get("host")}`,userDevice:os.platform(),navigatorLanguage:e.headers["accept-language"],urlModes:await async function parseUrl(){try{const t=e.protocol,s=`${t}://${e.get("host")}${e.url}`,a=new URL(s).searchParams,o={};for(const[e,t]of a.entries())o[e]=t;return 0===Object.keys(o).length?null:o}catch(e){return console.error(e),null}}()};if(null!==a.urlModes&&(a.urlModes.mode&&!VALID_MODES.includes(a.urlModes.mode)||a.urlModes.select&&!VALID_SELECTED.includes(a.urlModes.select)))return void t.redirect("/");a.navigatorLanguage=a.urlModes&&a.urlModes.lang?a.urlModes.lang:__NK__.langs.supported.includes(a.navigatorLanguage.substring(0,2))?a.navigatorLanguage.substring(0,2):"en";const o=new Map([["lang",a.navigatorLanguage]]);let n=await readFileAsync(path.join(`${__PROJECT_DIR__}/static/public/manifest/manifest.${a.navigatorLanguage}.webmanifest`),"utf8");n=JSON.parse(n);const r={__META__:a,__SETTING_CONFIG__:o,__MANIFEST__:n};let c={},l={};for(let e of["HEADER"]){let[t,s]=e.includes("=")?e.split("="):[e,e.toLowerCase()];l[t]=await loadComponent(s.includes("components")?s:`components/${s}`,{...r})}for(let e of["TEST=test.pug","TEST2=test.md","HEAD=document/head","BODY=document/body"]){let[t,s]=e.split("=");c[t]=await loadComponent(s,{...l,...r})}const i=await loadComponent("layout",{...c,...r}).PostProcessor({...c,...r});t.send(i)}catch(s){console.error(s);const a=s.stack.replace(/\n/g,"<br>");t.status(500).send(await loadComponent("500.pug",{errorText:a,navigatorLanguage:e.headers["accept-language"],currentURL:`${e.protocol}://${e.get("host")}${e.url}`}))}})),app.get("/wiki",(async(e,t)=>{try{t.send("Future WIKI Section")}catch(s){console.error(s),t.status(500).send(await loadComponent("500.pug",{errorText:errorText,navigatorLanguage:e.headers["accept-language"],currentURL:`${e.protocol}://${e.get("host")}${e.url}`}))}})),app.use((async(e,t,s)=>{const a=await loadComponent("404.pug",{navigatorLanguage:e.headers["accept-language"],currentURL:`${e.protocol}://${e.get("host")}${e.url}`});await t.status(404).send(a),s()}));const server=app.listen(process.env.PORT,(()=>{console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟪 > [SERVER] :: Runned server at [http://${process.env.HOST}:${process.env.PORT}][39m`)}));