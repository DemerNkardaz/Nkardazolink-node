require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readFileAsync = require('util').promisify(fs.readFile);
const xmlbuilder = require('xmlbuilder');
const zlib = require('zlib');
async function generateSiteMaps(sourcePath) {
  try {
    if (!fs.existsSync(path.join(sourcePath, 'static/site.maps'))) {
      fs.mkdirSync(path.join(sourcePath, 'static/site.maps'), { recursive: true });
    }

    const asciiArt = await readFileAsync(path.join(sourcePath, 'static/fun_ascii.txt'), 'utf8');
    const content = `${asciiArt}\nUser-agent: *\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`;
    await fs.writeFileSync(path.join(sourcePath, 'static/site.maps/robots.txt'), content, 'utf-8');
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Write robots.txt completed\x1b[39m`);

    const locations = [
      { url: `http://${process.env.HOST}:${process.env.PORT}/`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '1.0' },
      { url: `http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml.gz`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' },
      { url: `http://${process.env.HOST}:${process.env.PORT}/sitemap.index.xml`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' },
      { url: `http://${process.env.HOST}:${process.env.PORT}/wiki/`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.4' },
    ];
    VALID_MODES.forEach(mode => {
      if (mode === 'cv') {
        VALID_SELECTED.forEach(selected => {
          locations.push({ url: `http://${process.env.HOST}:${process.env.PORT}/?mode=${mode}&selected=${selected}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' });
        });
      } else {
        locations.push({ url: `http://${process.env.HOST}:${process.env.PORT}/?mode=${mode}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' });
      }
    });
    const getFileExtensions = (urls) => {
      const extensions = new Set();
      urls.forEach(url => {
        const match = url.match(/\.([^.\/\?]+)(?:\?|$)/);
        if (match) {
          extensions.add(match[1]);
        }
      });
      return Array.from(extensions);
    };

    const fileExtensions = getFileExtensions(locations.map(url => url.url));

    __NK__.langs.supported.forEach(lang => {
      locations.forEach(url => {
        if (!url.url.includes('lang') && !fileExtensions.some(ext => url.url.endsWith(ext))) {
          const prefix = url.url.includes('/?') ? '&' : '?';
          locations.push({ url: `${url.url}${prefix}lang=${lang}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' });
        }
      });
    });
    const sitemaps = [];

    const sitemapXMLHeaderLinks = xmlbuilder.create('urlset', { version: '1.0', encoding: 'UTF-8' })
      .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    locations.forEach(location => {
      const url = sitemapXMLHeaderLinks.ele('url')
        .ele('loc', location.url).up()
        .ele('lastmod', location.lastmod).up()
        .ele('changefreq', location.changefreq).up()
        .ele('priority', location.priority);
    });

    sitemaps.push({ url: 'sitemap_headlinks.xml', lastmod: new Date().toISOString(), content: sitemapXMLHeaderLinks.end({ pretty: false }) });
    
    const sitemapXMLIndex = xmlbuilder.create('sitemapindex', { version: '1.0', encoding: 'UTF-8' })
      .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    sitemaps.forEach(sitemap => {
      sitemapXMLIndex.ele('sitemap')
        .ele('loc', `http://${process.env.HOST}:${process.env.PORT}/${sitemap.url}.gz`).up()
        .ele('lastmod', sitemap.lastmod).up();
      sitemapXMLIndex.ele('sitemap')
        .ele('loc', `http://${process.env.HOST}:${process.env.PORT}/${sitemap.url}`).up()
        .ele('lastmod', sitemap.lastmod).up();
    });
    sitemaps.push({ url: 'sitemap.index.xml', lastmod: new Date().toISOString(), content: sitemapXMLIndex.end({ pretty: false }) });
    sitemaps.forEach(sitemap => {
      fs.writeFileSync(path.join(sourcePath, `static/site.maps/${sitemap.url}`), sitemap.content, 'utf-8');
      console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔵 > [SITEMAP] :: [${sitemap.url}] created\x1b[39m`);
      zlib.gzip(sitemap.content, (err, zipped) => {
        if (err) console.error(err);
        else
          fs.writeFileSync(path.join(sourcePath, `static/site.maps/${sitemap.url}.gz`), zipped, 'binary'),
          console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔵 > [SITEMAP] :: [${sitemap.url}] compressed with GZIP\x1b[39m`);
      });
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = { generateSiteMaps };