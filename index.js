require("dotenv").config(),require("./nk.config.js").config().init(),console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟪 > [SERVER] :: Server started[39m`);const readFileAsync=promisify(fs.readFile);async function writeRobots_x_SiteMap(){try{const e=`User-agent: *n\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`;fs.writeFileSync("./site.maps/robots.txt",e,"utf-8");const s=[{url:`http://${process.env.HOST}:${process.env.PORT}/`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"1.0"},{url:`http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"},{url:`http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"},{url:`http://${process.env.HOST}:${process.env.PORT}/wiki/`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.4"}];VALID_MODES.forEach((e=>{"cv"===e?VALID_SELECTED.forEach((t=>{s.push({url:`http://${process.env.HOST}:${process.env.PORT}/?mode=${e}&selected=${t}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})})):s.push({url:`http://${process.env.HOST}:${process.env.PORT}/?mode=${e}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})}));const t=(e=>{const s=new Set;return e.forEach((e=>{const t=e.match(/\.([^.\/\?]+)(?:\?|$)/);t&&s.add(t[1])})),Array.from(s)})(s.map((e=>e.url)));__NK__.langs.supported.forEach((e=>{s.forEach((o=>{if(!o.url.includes("lang")&&!t.some((e=>o.url.endsWith(e)))){const t=o.url.includes("/?")?"&":"?";s.push({url:`${o.url}${t}lang=${e}`,lastmod:(new Date).toISOString(),changefreq:"daily",priority:"0.6"})}}))}));const o=[],a=xmlbuilder.create("urlset",{version:"1.0",encoding:"UTF-8"}).att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9");s.forEach((e=>{a.ele("url").ele("loc",e.url).up().ele("lastmod",e.lastmod).up().ele("changefreq",e.changefreq).up().ele("priority",e.priority)})),o.push({url:"sitemap_headlinks.xml",lastmod:(new Date).toISOString(),content:a.end({pretty:!1})});const n=xmlbuilder.create("sitemapindex",{version:"1.0",encoding:"UTF-8"}).att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9");o.forEach((e=>{n.ele("sitemap").ele("loc",`http://${process.env.HOST}:${process.env.PORT}/${e.url}.gz`).up().ele("lastmod",e.lastmod).up(),n.ele("sitemap").ele("loc",`http://${process.env.HOST}:${process.env.PORT}/${e.url}`).up().ele("lastmod",e.lastmod).up()})),o.push({url:"sitemap.index.xml",lastmod:(new Date).toISOString(),content:n.end({pretty:!1})}),console.log(n.end({pretty:!1})),o.forEach((e=>{fs.writeFileSync(`./site.maps/${e.url}`,e.content,"utf-8"),zlib.gzip(e.content,((s,t)=>{s?console.error(s):fs.writeFileSync(`./site.maps/${e.url}.gz`,t,"binary")}))}))}catch(e){console.error(e)}}app.use(compression()),app.use(express.static(path.join(__PROJECT_DIR__,"public"))),app.use(express.static(path.join(__PROJECT_DIR__,"site.maps"))),app.use(express.urlencoded({extended:!1})),app.use(cookieParser()),app.use(express.json()),app.set("view engine","ejs"),app.set("views",path.join(__PROJECT_DIR__,"app")),(async()=>{await writeRobots_x_SiteMap()})(),(async()=>{const e=dbHandle("./data_base/index.db");try{const s=await e.set("TestingTable","TestingKey","TestingValue");console.log(s);const t=await e.get("TestingTable","TestingKey");console.log(t);const o=await e.remove("TestingTable","TestingKey");console.log(o);const a=await e.get("TestingTable","TestingKey");console.log(a)}catch(e){console.error(e)}})(),app.use(((e,s,t)=>{if(e.url.endsWith(".css")){s.setHeader("Content-Type","text/css");const o=path.join(__dirname,"app","styles",e.url.replace(".css",".scss"));if(fs.existsSync(o)){const e=sass.compile(o,{style:"compressed"}),t=new Readable;t._read=()=>{},t.push(e.css),t.push(null),t.pipe(s)}else{const o=path.join(__dirname,"app","styles","skins",e.url.replace(".css",".scss"));if(fs.existsSync(o)){const e=spawn("node",["-e",`\n                    const sass = require('sass');\n                    const fs = require('fs');\n                    const scssFilePath = '${o}';\n                    const result = sass.compile(scssFilePath, { style: 'compressed' });\n                    process.stdout.write(result.css);\n                `]);e.stdout.on("data",(e=>{s.write(e)})),e.on("close",(e=>{s.end()})),e.stderr.on("data",(e=>{console.error(`Ошибка: ${e}`),s.status(500).send("Ошибка компиляции SCSS")}))}else t()}}else t()}));const dataArray=[];function generateUserId(e){const s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";let t="";for(let o=0;o<e;o++){const e=Math.floor(62*Math.random());t+=s.charAt(e)}return t}async function getLastModifiedInFolders(){try{const e=["./","./app","./public"],s=await Promise.all(e.map((async e=>{const s=await fs.promises.readdir(e),t=await Promise.all(s.map((async s=>{const t=path.join(e,s);return(await fs.promises.stat(t)).mtime})));return Math.max(...t)})));return Math.max(...s)}catch(e){throw console.error("Ошибка при получении даты последнего обновления:",e),e}}__NK__.langs.supported.forEach((e=>{dataArray.push({source:`./public/data/locale/common/main.${e}.yaml`,as:`locale.${e}`})})),dataArray.push({source:"./public/data/locale/common/asset.common.yaml",as:"locale.common"}),dataArray.push({source:"./public/data/locale/common/asset.templates.yaml",as:"locale.templates"}),DataExtend(dataArray,__PROJECT_DIR__).then((()=>console.log(`[32m[${(new Date).toLocaleString().replace(",","")}] :: 🟩 > [DATA-EXTEND] :: Extension of data completed[39m`))).catch((e=>console.error(`[${(new Date).toLocaleString().replace(",","")}] :: 🟥 > [DATA-EXTEND] :: Error extending data: ${e.message}`))),app.use(((e,s,t)=>{s.setHeader("X-Content-Type-Options","nosniff"),s.setHeader("Content-Type","text/html; charset=utf-8"),t()})),app.get("/",(async(e,s)=>{try{console.log(new Date(await getLastModifiedInFolders()).toLocaleString());const t={};for(const s in e.cookies)for(const o of VALID_COOKIES)if(s.startsWith(o)){const o=s.split(".")[0],a=e.cookies[s];t[o]=t[o]||{},t[o][s.substring(o.length+1)]=a}console.log(t),console.log(e.headers["accept-language"]);const o={...t,request:e,userURL:e.url,fullURL:`${e.protocol}://${e.get("host")}${e.url}`,domainURL:`${e.protocol}://${e.get("host")}`,userDevice:os.platform(),navigatorLanguage:e.headers["accept-language"],urlModes:await async function parseUrl(){try{const s=e.protocol,t=`${s}://${e.get("host")}${e.url}`,o=new URL(t).searchParams,a={};for(const[e,s]of o.entries())a[e]=s;return 0===Object.keys(a).length?null:a}catch(e){return console.error(e),null}}()};if(console.log("[31mThis is a red log[39m"),console.log("[32mThis is a green log[39m"),console.log("[34mThis is a blue log[39m"),console.log(o.userDevice),null!==o.urlModes&&(o.urlModes.mode&&!VALID_MODES.includes(o.urlModes.mode)||o.urlModes.select&&!VALID_SELECTED.includes(o.urlModes.select)))return void s.redirect("/");o.navigatorLanguage=o.urlModes&&o.urlModes.lang?o.urlModes.lang:__NK__.langs.supported.includes(o.navigatorLanguage.substring(0,2))?o.navigatorLanguage.substring(0,2):"en",console.log(o.navigatorLanguage);const a=new Map([["lang",o.navigatorLanguage]]);let n=await readFileAsync(path.join(`${__PROJECT_DIR__}/public/manifest/manifest.${o.navigatorLanguage}.webmanifest`),"utf8");n=JSON.parse(n);const r={__META__:o,__SETTING_CONFIG__:a,__MANIFEST__:n},l={HEADER:await loadComponent("components/header",{...r})},c={HEAD:await loadComponent("document/head",{...l,...r}),BODY:await loadComponent("document/body",{...l,...r}),TEST:await loadComponent("test",{...l,...r},"pug")},i=await PagePrerender("layout",{...c,...r});s.send(i)}catch(e){console.error(e),s.status(500).send(e.message)}})),app.get("/wiki",(async(e,s)=>{try{s.send("Future WIKI Section")}catch(e){console.error(e),s.status(500).send(e.message)}}));const server=app.listen(process.env.PORT,(()=>{console.log(`[35m[${(new Date).toLocaleString().replace(",","")}] :: 🟪 > [SERVER] :: Runned server at [http://${process.env.HOST}:${process.env.PORT}][39m`)}));