require('dotenv').config();
require('./nk.config.js').config().init();
console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Server started\x1b[39m`);
const readFileAsync = promisify(fs.readFile);
app.use(compression());
app.use(express.static(path.join(__PROJECT_DIR__, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));



async function writeRobots_x_SiteMap() {
  try {
    const content = `User-agent: *\nSitemap: http://${process.env.HOST}:${process.env.PORT}/sitemap.xml`;
    fs.writeFileSync('./robots.txt', content, 'utf-8');

    const locations = [
      { url: `http://${process.env.HOST}:${process.env.PORT}/`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.8' },
      { url: `http://${process.env.HOST}:${process.env.PORT}/sitemap.xml`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.6' },
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
                locations.push({ url: `${url.url}${prefix}lang=${lang}`, lastmod: new Date().toISOString(), changefreq: 'daily', priority: '0.    6' });
            }
        });
    });

    const xml = xmlbuilder.create('urlset', { version: '1.0', encoding: 'UTF-8' })
      .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    locations.forEach(location => {
      const url = xml.ele('url')
        .ele('loc', location.url).up()
        .ele('lastmod', location.lastmod).up()
        .ele('changefreq', location.changefreq).up()
        .ele('priority', location.priority);
    });

    const xmlContent = xml.end({ pretty: false });
    fs.writeFileSync('./sitemap.xml', xmlContent, 'utf-8');
  } catch (error) {
    console.error(error);
  }
};
(async () => { await writeRobots_x_SiteMap(); })();

(async () => {
    const db = dbHandle('./data_base/index.db');

    try {
        // Устанавливаем значение
        const setResult = await db.set('TestingTable', 'TestingKey', 'TestingValue');
        console.log(setResult); // "Value set for key 'TestingKey' in table 'TestingTable'"

        // Получаем значение
        const getResult = await db.get('TestingTable', 'TestingKey');
        console.log(getResult); // "TestingValue"

        // Удаляем ключ
        const removeResult = await db.remove('TestingTable', 'TestingKey');
        console.log(removeResult); // "Key 'TestingKey' removed from table 'TestingTable'"

        // Пытаемся получить значение снова после удаления
        const getResultAfterRemove = await db.get('TestingTable', 'TestingKey');
        console.log(getResultAfterRemove); // "Key 'TestingKey' not found in table 'TestingTable'"
    } catch (error) {
        console.error(error);
    }
})();




app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        const scssFilePath = path.join(__dirname, 'app', 'styles', req.url.replace('.css', '.scss'));

        if (fs.existsSync(scssFilePath)) {
            const result = sass.compile(scssFilePath, { style: 'compressed' });

            const stream = new Readable();
            stream._read = () => {};
            stream.push(result.css);
            stream.push(null);

            stream.pipe(res);
        } else {
            const scssSkinFilePath = path.join(__dirname, 'app', 'styles', 'skins', req.url.replace('.css', '.scss'));
            if (fs.existsSync(scssSkinFilePath)) {
                const child = spawn('node', ['-e', `
                    const sass = require('sass');
                    const fs = require('fs');
                    const scssFilePath = '${scssSkinFilePath}';
                    const result = sass.compile(scssFilePath, { style: 'compressed' });
                    process.stdout.write(result.css);
                `]);

                child.stdout.on('data', (data) => {
                    res.write(data);
                });

                child.on('close', (code) => {
                    res.end();
                });

                child.stderr.on('data', (data) => {
                    console.error(`Ошибка: ${data}`);
                    res.status(500).send('Ошибка компиляции SCSS');
                });
            } else {
                next();
            }
        }
    } else {
        next();
    }
});


const dataArray = [];
__NK__.langs.supported.forEach(lang => { dataArray.push({ source: `./public/data/locale/common/main.${lang}.yaml`, as: `locale.${lang}` }) });
dataArray.push({ source: `./public/data/locale/common/asset.common.yaml`, as: `locale.common` });
dataArray.push({ source: `./public/data/locale/common/asset.templates.yaml`, as: `locale.templates` });

DataExtend(dataArray, __PROJECT_DIR__)
    .then(() => console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [DATA-EXTEND] :: Extension of data completed\x1b[39m`))
    .catch(err => console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [DATA-EXTEND] :: Error extending data: ${err.message}`));


app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

function generateUserId(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let userId = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        userId += characters.charAt(randomIndex);
    }
    return userId;
}




async function getLastModifiedInFolders() {
    try {
        const paths = ['./', './app', './public'];
        const lastModifiedDates = await Promise.all(paths.map(async folderPath => {
            const files = await fs.promises.readdir(folderPath);
            const lastModifiedDates = await Promise.all(files.map(async file => {
                const filePath = path.join(folderPath, file);
                const stats = await fs.promises.stat(filePath);
                return stats.mtime;
            }));
            return Math.max(...lastModifiedDates);
        }));
        return Math.max(...lastModifiedDates);
    } catch (error) {
        console.error('Ошибка при получении даты последнего обновления:', error);
        throw error;
    }
}


app.get('/', async (request, response) => {
  try {
    console.log(new Date(await getLastModifiedInFolders()).toLocaleString());
    const cookies = {};
    for (const cookieName in request.cookies) {
      for (const validCookie of VALID_COOKIES) {
        if (cookieName.startsWith(validCookie)) {
          const cookieKey = cookieName.split('.')[0];
          const cookieValue = request.cookies[cookieName];
          cookies[cookieKey] = cookies[cookieKey] || {};
          cookies[cookieKey][cookieName.substring(cookieKey.length + 1)] = cookieValue;
        }
      }
    }
    console.log(cookies);

    async function parseUrl() {
      try {
        const protocol = request.protocol;
        const host = request.get('host');
        const urlPath = `${protocol}://${host}${request.url}`;
        const urlObject = new URL(urlPath);
        const urlSearchParams = urlObject.searchParams;

        const urlParamsObject = {};
        for (const [key, value] of urlSearchParams.entries()) {
          urlParamsObject[key] = value;
        }

        if (Object.keys(urlParamsObject).length === 0) {
          return null;
        }

        return urlParamsObject;
      } catch (error) {
        console.error(error);
        return null;
      }
    }
    console.log(request.headers['accept-language']);
    const __META__ = {
      ...cookies,
      request: request,
      userURL: request.url,
      fullURL: `${request.protocol}://${request.get('host')}${request.url}`,
      domainURL: `${request.protocol}://${request.get('host')}`,
      userDevice: os.platform(),
      navigatorLanguage: request.headers['accept-language'],
      urlModes: await parseUrl(),
    };
console.log(`\x1b[31mThis is a red log\x1b[39m`);
console.log(`\x1b[32mThis is a green log\x1b[39m`);
console.log(`\x1b[34mThis is a blue log\x1b[39m`);
    console.log(__META__.userDevice);
    if (__META__.urlModes !== null) {
      if (
        __META__.urlModes.mode && !VALID_MODES.includes(__META__.urlModes.mode) ||
        __META__.urlModes.select && !VALID_SELECTED.includes(__META__.urlModes.select)
      ) {
        response.redirect('/');
        return;
      }
    }
    
    __META__.navigatorLanguage =
      __META__.urlModes && __META__.urlModes.lang ?
        __META__.urlModes.lang :
        (
          __NK__.langs.supported.includes(__META__.navigatorLanguage.substring(0, 2)) ?
            __META__.navigatorLanguage.substring(0, 2) :
            'en'
        );
    console.log(__META__.navigatorLanguage);
    const __SETTING_CONFIG__ = new Map([
      ['lang', __META__.navigatorLanguage],
    ]);
    let __MANIFEST__ = await readFileAsync(path.join(`${__PROJECT_DIR__}/public/manifest/manifest.${__META__.navigatorLanguage}.webmanifest`), 'utf8');
    __MANIFEST__ = JSON.parse(__MANIFEST__);
    const __COMPILED_DATA = { __META__, __SETTING_CONFIG__, __MANIFEST__ };

    const COMPONENT = {
      HEADER: await loadComponent('components/header', { ...__COMPILED_DATA }),
    }

    const DOCUMENT = {
      HEAD: await loadComponent('document/head', { ...COMPONENT, ...__COMPILED_DATA }),
      BODY: await loadComponent('document/body', { ...COMPONENT, ...__COMPILED_DATA }),
      TEST: await loadComponent('test', { ...COMPONENT, ...__COMPILED_DATA }, 'pug'),
    }

    const Builded = await PagePrerender('layout', { ...DOCUMENT, ...__COMPILED_DATA });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    response.status(500).send(error.message);
  }
});


app.get('/wiki', async (request, response) => {
  try {

    response.send('Future WIKI Section')
  } catch (error) {
    console.error(error);
    response.status(500).send(error.message);
  }
});

const server = app.listen(process.env.PORT, () => { 
  console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Runned server at [http://${process.env.HOST}:${process.env.PORT}]\x1b[39m`);
});
