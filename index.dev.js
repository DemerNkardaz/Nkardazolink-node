const { loadComponent } = require('./src/serverside/scripts/ComponentHandling.js');
const crypto = require('crypto');
require('dotenv').config();
require('./nk.config.js').config().init();
console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Server started\x1b[39m`);
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/assets')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/public')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/site.maps')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(useragent.express());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));
app.set('trust proxy', 1) // trust first proxy
app.use(sessions({
  secret: 'session-rscrt',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

const imageCacheCleaner = new ImageCacheCleaner();


const usersDataBase = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/users.db'));
usersDataBase.run(`CREATE TABLE IF NOT EXISTS users (rowID INTEGER PRIMARY KEY, userID TEXT, userName TEXT, userLink TEXT, login TEXT, password TEXT, email TEXT, sessionID TEXT, settings JSON, authorize JSON)`);
usersDataBase.run(`CREATE TABLE IF NOT EXISTS anonymousSessions (sessionID TEXT, settings JSON)`);
const sessionManager = new SessionManager(usersDataBase);


const wikiDataBase = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/wikipages.db'));
wikiDataBase.run(`CREATE TABLE IF NOT EXISTS articles (rowID INTEGER PRIMARY KEY, articleTitle TEXT, articleContent TEXT)`);
//wikiDataBase.run(`CREATE TABLE IF NOT EXISTS sharedImages (rowID INTEGER PRIMARY KEY, imageTitle TEXT, imageFileName TEXT, mimeType TEXT, imageFile BLOB)`);
wikiDataBase.run(`CREATE TABLE IF NOT EXISTS sharedImages (rowID INTEGER PRIMARY KEY, imageTitle TEXT, imageTitleLocales JSON, imageDescriptionLocales JSON, imageFileName TEXT, imageFile TEXT)`);

const sharedAssetsDB = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/sharedAssets.db'));
sharedAssetsDB.run(`CREATE TABLE IF NOT EXISTS sharedFiles (rowID INTEGER PRIMARY KEY, FileType TEXT, Title TEXT, TitleLocales JSON, DescriptionLocales JSON, FileName TEXT, FileLink TEXT, FileEmbedded BLOB, FileStat JSON)`);

/*(async () => {
    try {
        // Чтение содержимого изображения из файла
        const testImage = await fs.readFileSync(path.join(__PROJECT_DIR__, 'static/public/resource/images/seo/kamon_glyph.png'));
        // Выполнение запроса INSERT с использованием промиса
        await new Promise((resolve, reject) => {
            wikiDataBase.run(`INSERT INTO sharedImages (imageTitle, imageFileName, mimeType, imageFile) VALUES (?, ?, ?, ?)`, ['Nkardaz kamon glyph', 'kamon_glyph.png', 'image/png', testImage], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log('Test image inserted successfully');
    } catch (error) {
        console.error('Error inserting test image:', error);
    }
})();
(async () => {
  try {
    // Чтение содержимого изображения из файла
    const testImage = 'static/public/resource/images/seo/kamon_glyph.png';
    const pathTo = path.join(__PROJECT_DIR__, testImage);
    const getStat = await fileStat(pathTo);
    const statStringify = JSON.stringify(getStat);
    // Выполнение запроса INSERT с использованием промиса
    await new Promise((resolve, reject) => {
      sharedAssetsDB.run(`INSERT INTO sharedFiles (FileType, Title, FileName, FileLink, FileStat) VALUES (?, ?, ?, ?, ?)`, ['Image', 'Nkardaz kamon glyph', 'kamon_glyph.png', testImage, statStringify], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('Test image inserted successfully');
  } catch (error) {
    console.error('Error inserting test image:', error);
  }
})();*/

markdown.core.ruler.enable(['abbr']);
markdown.inline.ruler.enable(['ins', 'mark','footnote_inline', 'sub', 'sup']);
markdown.block.ruler.enable(['footnote', 'deflist']);

markdown.renderFile = async function (filePath, data) {
  const fileContent = await readFileAsync(filePath, 'utf8');
  const parsedContent = fileContent
    .replace(/```js\s\%([\s\S]*?)```/g, (match, code) => {
      try {
        const boundFunction = new Function('data', code).bind(null, data);
        return boundFunction();
      } catch (err) {
        console.log(err);
        return match;
      }
    })
    .replace(/\${((?!{[^{]*}).*?)}/g, (match, code) => {
      const varLink = code.match(/\.[\s\S]*?\)/g) ?
        code.replace(/\.[\s\S]*?\)/g, '').split('.').map(key => `[\"${key}\"]`).join('')
        : !code.includes('(') ? code.split('.').map(key => `[\"${key}\"]`).join('') : code;
      const varMethods = code.match(/(\.\w+\(.*?\))/g) ? code.match(/(\.\w+\(.*?\))/g).join('') : '';
      try {
        return new Function('data', `return data${varLink}${varMethods}`)(data);
      } catch (err) {
        try {
          return new Function('data', `return ${code}`)(data)
          } catch (err) {
          console.log(err);
          return `<span title="${err}" style="cursor: help">${match}</span>`;
        }
      }
    });
  return await markdown.render(parsedContent);
};



app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://www.example.org/secret',
    changeOrigin: true,
  }),
);


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
__NK__.langs.supported.forEach(lang => { dataArray.push({ source: `./static/assets/locale/common/main.${lang}.yaml`, as: `locale.${lang}` }) });
dataArray.push({ source: `./static/assets/locale/common/asset.common.yaml`, as: `locale.common` });
dataArray.push({ source: `./static/assets/locale/common/asset.templates.yaml`, as: `locale.templates` });

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
        const paths = ['./', './app', './static'];
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

async function parseUrl(request) {
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

const booleanOptions = ['true', 'false'];
async function jsonDBStessTest() {
  for (let i = 0; i < 10; i++) {
    
    let randomID = `{${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}}`;
    await sessionManager.writeSessionToSQL(randomID, {
      savedSettings: {
        lang: await __NK__.langs.supported[Math.floor(Math.random() * __NK__.langs.supported.length)],
        skin: await __NK__.skins.supported[Math.floor(Math.random() * __NK__.skins.supported.length)],
        save_search_result: booleanOptions[Math.floor(Math.random() * booleanOptions.length)],
        save_selected_item: booleanOptions[Math.floor(Math.random() * booleanOptions.length)],
        turn_off_preloader: booleanOptions[Math.floor(Math.random() * booleanOptions.length)],
        ambience_off: booleanOptions[Math.floor(Math.random() * booleanOptions.length)],
        change_skin_by_time: booleanOptions[Math.floor(Math.random() * booleanOptions.length)],
        current_banner: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        latestSearchesKamon: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        latestSearchesBanners: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        latestSearchesClans: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        latestSearchesPattern: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        selectedItemsKamon: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        selectedItemsBanners: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        selectedItemsClans: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
        selectedItemsPattern: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${-(new Date().getTimezoneOffset() / 60)}-${new Date().getTime()}`,
      }
    });
  }
}

(async () => {
  //await jsonDBStessTest();
  //await sessionManager.explainFile();
})();



const randomNames = ['Banshee', 'Ieyasu', 'Hachiman', 'Yorimasa', 'Tadahisa', 'Byakuya'];
app.use(async (req, res, next) => {
  try {
    let getSessionID = req.cookies.sessionID || null;
    if (!getSessionID) {
      const prefixName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const newSessionID = `${prefixName}-${crypto.randomUUID()}`;
      await res.cookie('sessionID', newSessionID, { httpOnly: true, secure: true });
    }
    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get('/', async (request, response, next) => {
  try {
    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [SERVER] :: Latest modify date is [${new Date(await getLastModifiedInFolders()).toLocaleString()}]\x1b[39m`);

    const session = { sessionID: request.cookies.sessionID, settings: {}, platform: request.useragent.source };
    console.log('Session ID is: ', session.sessionID);

    for (const cookieName in request.cookies) {
      for (const validCookie of VALID_COOKIES) {
        if (cookieName.startsWith(validCookie) && cookieName.includes('.')) {
          const cookieKey = cookieName.split('.')[0];
          const cookieValue = request.cookies[cookieName];
          session.settings[cookieKey] = session.settings[cookieKey] || {};
          session.settings[cookieKey][cookieName.substring(cookieKey.length + 1)] = cookieValue;
        }
      }
    }
    if (session.sessionID) {
      //console.log(session);
      await sessionManager.writeSessionToSQL(session.sessionID, session.settings);
      //console.log(await sessionManager.readSessionFromSQL(session.sessionID))
      //console.log(await sessionManager.getSettingsFromSQL(session.sessionID, 'savedSettings.lang'))
      //await sessionManager.writeSession(session.sessionID, session.settings);
      //await sessionManager.registration(session.sessionID, 'Nkardaz', '123', 'example@gmail.com', session.platform);
      //console.log(await sessionManager.readSession(session.sessionID));
      //await sessionManager.readSession(session.sessionID);
    }
    const metaDataResponse = {
      userSession: null,
      request: request,
      userURL: request.url,
      fullURL: `${request.protocol}://${request.get('host')}${request.url}`,
      domainURL: `${request.protocol}://${request.get('host')}`,
      userDevice: os.platform(),
      urlModes: await parseUrl(request),
    };
    if (metaDataResponse.urlModes !== null) {
      if (
        metaDataResponse.urlModes.mode && !VALID_MODES.includes(metaDataResponse.urlModes.mode) ||
        metaDataResponse.urlModes.select && !VALID_SELECTED.includes(metaDataResponse.urlModes.select)
      ) {
        response.redirect('/');
        return;
      }
    }
    //console.log(await sessionManager.readSession(session.sessionID));
    const isUserLang = metaDataResponse.userSession && metaDataResponse.userSession.savedSettings && metaDataResponse.userSession.savedSettings.lang && metaDataResponse.userSession.savedSettings.lang;
    const isLangUrlMode = metaDataResponse.urlModes && __NK__.langs.supported.includes(metaDataResponse.urlModes.lang) && metaDataResponse.urlModes.lang;
    const isNavigatorLang = __NK__.langs.supported.includes(request.headers['accept-language'].substring(0, 2)) && request.headers['accept-language'].substring(0, 2);
    
    metaDataResponse.renderLanguage = isLangUrlMode ? isLangUrlMode : isUserLang ? isUserLang : isNavigatorLang || 'en';

    let webManifest = await readFileAsync(path.join(`${__PROJECT_DIR__}/static/public/manifest/manifest.${metaDataResponse.renderLanguage}.webmanifest`), 'utf8');
    webManifest = JSON.parse(webManifest);
    const __COMPILED_DATA = { metaDataResponse, webManifest };



    let [$document, $component] = [
      ['$Test=test.pug', '$Test2=test.md', '$HEAD=document/head', '$BODY=document/body'],
      ['$Header']
    ]
    for (const names of $component) {
      let [variable, path] = names.includes('=') ? names.split('=') : [names, names.toLowerCase().replace('$', '')];

      Array.isArray($component) && ($component = {});
      $component[variable] = await loadComponent(path.includes('components') ? path : `components/${path}`, { ...__COMPILED_DATA });
    }
    for (const names of $document) {
      let [variable, path] = names.split('=');

      Array.isArray($document) && ($document = {});
      $document[variable] = await loadComponent(path, { ...$component, ...__COMPILED_DATA })
    }

    const Builded = await loadComponent('layout', { ...$document, ...__COMPILED_DATA }).PostProcessor({ ...__COMPILED_DATA });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


app.get('/wiki', async (request, response, next) => {
  try {

    response.send('Future WIKI Section')
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get('/wiki/:page', async (request, response, next) => {
  try {
  
    response.send(`Вики-страница “${request.params.page}”`)
  } catch (error) {
    console.error(error);
    next(error);
  }
});


app.get('/shared/images/nocache/:imageFileName', async (request, response) => {
  try {
    const handler = new ImageHandler(__PROJECT_DIR__, request, true);
    const handledResult = await handler.getImage(sharedAssetsDB);

    if (typeof handledResult === 'string') response.status(404).send(handledResult);
    else
      response.contentType(handledResult.mimeType);
      response.send(handledResult.imageBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    response.status(500).send('Error processing image');
  }
});

app.get('/shared/images/:imageFileName', async (request, response) => {
  try {
    const handler = new ImageHandler(__PROJECT_DIR__, request);
    const handledResult = await handler.getImage(sharedAssetsDB);

    if (typeof handledResult === 'string') response.status(404).send(handledResult);
    else
      response.contentType(handledResult.mimeType);
      response.send(handledResult.imageBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    response.status(500).send('Error processing image');
  }
});


app.get('/local/images/*', async (request, response) => {
  try {
    const handler = new ImageHandler(path.join(__PROJECT_DIR__, 'static/public/resource/images'), request);
    const handledResult = await handler.getImage();

    if (typeof handledResult === 'string') response.status(404).send(handledResult);
    else
      response.contentType(handledResult.mimeType);
      response.send(handledResult.imageBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    response.status(500).send('Error processing image');
  }
});



app.post('/process-dom', (reqest, response) => {
  const { window } = new JSDOM();
  const $ = require('jquery')(window);
  
  const { dom } = reqest.body;
  $('#content').append('<p>Added by server</p>');
  const processedDom = domInstance.window.document.documentElement.outerHTML;

  response.json({ dom: processedDom });
});

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});


app.use(async (err, req, res, next) => {
  try {
    let errorText = err.stack.replace(/\n/g, '<br>');
    if (err.status === 404) {
      const page = await loadComponent('404.pug', { navigatorLanguage: req.headers['accept-language'], currentURL: `${req.protocol}://${req.get('host')}${req.url}` });
      res.status(404).send(page);
    } else {
      const page = await loadComponent('500.pug', { errorText: errorText, navigatorLanguage: req.headers['accept-language'], currentURL: `${req.protocol}://${req.get('host')}${req.url}` });
      res.status(500).send(page);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: {
        message: 'Internal Server Error'
      }
    });
  }
});

const options = {
  key: fs.readFileSync('nkardaz.io.key'),
  cert: fs.readFileSync('nkardaz.io.crt')
};

const server = https.createServer(options, app).listen(process.env.PORT, () => {
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: HTTPS enabled\x1b[39m`);
});

