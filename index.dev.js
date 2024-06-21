const crypto = require('crypto');

require('dotenv').config();
require('./modules/CoreConfig/CoreConfig').config().init();
global.__PROJECT_DIR__ = path.join(__dirname, '.');

const serverINI = path.join(__PROJECT_DIR__, 'server.ini');
ini.parse(serverINI, 'serverConfig');
ini.watch(serverINI, 'serverConfig');
require('./modules/ModuleLoader/ModuleLoader').config(serverConfig.modules.modulesFolder).init(srcMode = serverConfig.modules.useSrc);
require('./modules/ModuleLoader/ModuleLoader').config(serverConfig.modules.extensionsFolder).init(srcMode = serverConfig.modules.useSrc);

console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: Server started\x1b[39m`);
app.use(liveSassCompiler);
app.use(urlSpaceToUnderscore);
app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__PROJECT_DIR__, 'assets')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/public')));
app.use(express.static(path.join(__PROJECT_DIR__, 'static/site.maps')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(useragent.express());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));
app.set('trust proxy', 1) // trust first proxy

/*
const knexDB = knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'admin',
    password: 'root',
  },
  pool: {
    min: 0,
    max: 10
  },
  useNullAsDefault: true
});*/


new ImageCacheCleaner(serverConfig.cache.cacheCleaningFrequency);

const usersDataBase = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/users.db'));
usersDataBase.run(`CREATE TABLE IF NOT EXISTS users (rowID INTEGER PRIMARY KEY, userID TEXT, userName TEXT, userLink TEXT, login TEXT, password TEXT, email TEXT, sessionID TEXT, settings JSON, authorize JSON)`);
usersDataBase.run(`CREATE TABLE IF NOT EXISTS anonymousSessions (sessionID TEXT, settings JSON)`);
const sessionManager = new SessionManager(usersDataBase);

const wikiDataBase = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/wikiPages.db'));
wikiDataBase.run(`CREATE TABLE IF NOT EXISTS articles (rowID INTEGER PRIMARY KEY, articleTitle TEXT, articleContent TEXT, otherLanguageVariants JSON)`);

const sharedAssetsDB = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/sharedAssets.db'));
sharedAssetsDB.run(`CREATE TABLE IF NOT EXISTS sharedFiles (rowID INTEGER PRIMARY KEY, FileType TEXT, Title TEXT, TitleLocales JSON, DescriptionLocales JSON, FileName TEXT, FileLink TEXT, FileEmbedded BLOB, FileInfo JSON)`);

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
    const mergedMeta = [await fileStat(pathTo), await sharp(pathTo).metadata()].mergeObjects();
    mergedMeta.icc && delete mergedMeta.icc;
    console.log(mergedMeta);
    await new Promise((resolve, reject) => {
      sharedAssetsDB.run(`INSERT INTO sharedFiles (FileType, Title, FileName, FileLink,  FileInfo) VALUES (?, ?, ?, ?, ?)`, ['Image', 'Nkardaz kamon glyph', 'kamon_glyph.png', testImage, JSON.stringify(mergedMeta)], function (err) {
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


app.use(
  '/api',
  createProxyMiddleware({
    target: 'http://www.example.org/secret',
    changeOrigin: true,
  }),
);


const dataArray = [];

Object.values(serverConfig.locales).forEach(locale => {
  if (locale.split('.').length === 3) {
    let isLanguageCode = locale.split('.')[1].length === 2 && serverConfig.language.supported.includes(locale.split('.')[1]);
    let isNonLanguage = locale.split('.')[1].length > 2;

    if (isLanguageCode || isNonLanguage) {
      dataArray.push({ source: `./assets/locale/${locale}`, as: `locale.${locale.split('.')[1]}` });
    }
  }
  else if (locale.split('.').length === 2) dataArray.push({ source: `./assets/locale/${locale}`, as: `locale` });
});

function loadLocales() {
  new Promise(async (resolve, reject) => {
    try {
      await new DataExtend(dataArray, __PROJECT_DIR__);
      resolve();
    } catch (error) {
      reject(error);
    }
  })
    .then(() => {
      console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [DATA-EXTEND] :: Extension of data completed\x1b[39m`);
    })
    .catch(err => {
      console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [DATA-EXTEND] :: Error extending data: ${err.message}`);
    });
}; loadLocales();

chokidar.watch('./assets/locale/**/*', {
  ignored: /(^|[\/\\])\../,
  persistent: true
}).on('change', path => {
  console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [DATA-EXTEND] :: [${path}] changed\x1b[39m`);
  loadLocales();
});


app.use((request, response, next) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});


//setInterval(() => console.log(Object.keys(serverConfig.locales)), 5000);

app.use(async (req, res, next) => {
  try {
    req.userDevice = req.useragent.isDesktop ? 'Desktop' : (req.useragent.isMobile || req.useragent.isMobileNative) ? 'Mobile' : req.useragent.isTablet ? 'Tablet' : 'Unknown';
    const isTLDEnabled = serverConfig.routes.useThirdLevelDomains && req.hostname.split('.').length > 2;
    const isTLDDisabled = !serverConfig.routes.useThirdLevelDomains && req.url.split('/')[1].substring(0, 2);
    if (isTLDEnabled || isTLDDisabled) {
      const getTLD = req.hostname.split('.')[0].split('https://').join('').split('http://').join('');
      req.urlLanguageRequest = serverConfig.routes.useThirdLevelDomains ? getTLD : req.url.split('/')[1].substring(0, 2) || null;
    }
    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
});


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
  request.query?.mode && !VALID_MODES.includes(request.query?.mode) && response.redirect('/');
  
  console.log(request.path);
  console.log(request.headers['detected-user-device']);
  console.log(request.headers['user-ip-address']);
  console.log(require('os').platform());
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

    request.isHomePage = true;


    const Builded = await loadComponent('layout', { request }).PostProcessor({ request });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


app.get('/:lang?/wiki', async (request, response, next) => {
  console.log(request.urlLanguageRequest);
  try {
    const localedMainPages = {
      ru: 'wiki/Заглавная_Страница',
      en: 'wiki/Main_Page',
      ja: 'wiki/メインページ',
      zh: 'wiki/主页',
      ko: 'wiki/메인페이지',
      vi: 'wiki/Trang_chủ',
      ro: 'wiki/Pagină_principală',
    }
    const isTLDEnabled = serverConfig.routes.useThirdLevelDomains && request.hostname.split('.').length > 2;
    const isTLDDisabled = !serverConfig.routes.useThirdLevelDomains && request.url.split('/')[1].substring(0, 2);
    const redirectUrl = isTLDEnabled ? `${request.protocol}://${request.get('host')}/${localedMainPages[request.urlLanguageRequest]}` : `${request.urlLanguageRequest ? `${request.urlLanguageRequest}/${localedMainPages[request.urlLanguageRequest]}` : 'wiki/Заглавная_Страница'}`;
    response.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get('/:lang?/wiki/:page', async (request, response, next) => {
  /*
  ? Создать «Разделы» — страницы с категориями и статьями общей тематики, например Раздел:Нихонсимагуни или Раздел:Магия
  ? Создать «Категории» — обычный элемент википедии, котрый содержит перечень статей, входящих в эти самые категории.


  */
  try {

    const Builded = await loadComponent('layout', { request }).PostProcessor({ request });

    response.send(Builded);
  } catch (error) {
    console.error(error);
    next(error);
  }
});


app.get('/shared/models/:3dModelName', async (request, response, next) => {
  try {

  } catch (error) {
    console.error('Error processing image:', error);
    next(error);
  }
});


app.get('/shared/images/nocache/:imageFileName', async (request, response, next) => {
  try {
    const handler = new ImageHandler(__PROJECT_DIR__, request, enabledCache = false);
    const handledResult = await handler.getImage(sharedAssetsDB);

    if (typeof handledResult === 'string') {
      const error = new Error(handledResult.message);
      error.status = 404;
      throw error;
    }
    else
      response.contentType(handledResult.mimeType);
    response.send(handledResult.imageBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    next(error);
  }
});

const imageExtensions = ['jpg', 'jpeg', 'png', 'apng', 'gif', 'webp', 'ico', 'svg', 'avif', 'bmp', 'tga', 'dds', 'tiff', 'jfif'];
const videoExtensions = ['mp4', 'mkv', 'webm', 'ogv', 'avi', 'mov', 'wmv', 'mpg', 'mpeg', 'm4v', '3gp', '3g2', 'mng', 'asf', 'asx', 'mxf', 'ts', 'flv', 'f4v', 'f4p', 'f4a', 'f4b'];
const fontExtensions = ['ttf', 'otf', 'woff', 'woff2'];
const docExtensions = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'];
const dataExtensions = ['xml', 'html', 'xhtml', 'yaml', 'yml', 'json', 'ejs', 'pug', 'jade', 'csv'];



const queriesType = {
  s: `<tr><td><p>s</p>размер</td><td>Изменяет размер изображения на основе одного значения</td><tr>`,
  wh: `<tr><td><p>wh</p>ширина/высота</td><td>Изменяет размер изображения на основе двух значений</td><tr>`,
  r: `<tr><td><p>r</p>пост-размер</td><td>Изменяет размер изображения на основе одного значения после конвертаций</td><tr>`,
  bg: `<tr><td><p>bg</p>фон</td><td>Если изображение имеет альфа канал, указывает цвет фона в формате HEX/HEXA (без знака #), или в формате RGBA (255,255,255,1)</td><tr>`,
  fit: `<tr><td><p>fit</p>подгонка</td><td>Указание способна подгонки изображения (cover, contain, fill, inside)</td><tr>`,
  to: `<tr><td><p>to</p>формат</td><td>Указание формата для конвертации (jpg, png, webp, aviff, gif, tiff)</td><tr>`,
  q: `<tr><td><p>q</p>качество</td><td>Указание качества изображения (1-100) при конвертации в jpg, avif, webp, tiff</td><tr>`,
  p: `<tr><td><p>p</p>отступы</td><td>Указание отступов содержимого изображения от его границ</td><tr>`,
  pbg: `<tr><td><p>pbg</p>«рамка»</td><td>Указание цвета фона отступа в формате HEX/HEXA (без знака #), или в формате RGBA (255,255,255,1)</td><tr>`,
  rotate: `<tr><td><p>rotate</p>поворот</td><td>Указание поворота изображения в градусах (&minus;360—360)</td><tr>`,
  protate: `<tr><td><p>protate</p>пост-поворот</td><td>Указание поворота изображения в градусах (&minus;360—360) после предыдущих преобразований</td><tr>`,
  rbg: `<tr><td><p>rbg</p>заливка поворота</td><td>Указание цвета фона заполнения при повороте изобраэения в формате HEX/HEXA (без знака #), или в формате RGBA (255,255,255,1)</td><tr>`,
  water: `<tr><td><p>water</p>водяной знак</td><td>Название файла водяного знака</td><tr>`,
  gamma: `<tr><td><p>gamma</p>гамма</td><td>Указание гаммы для изображения в двух целых или плавающих значениях через запятую (2.2,0.5 или 3,1)</td><tr>`,
  brightness: `<tr><td><p>brightness</p>яркость</td><td>Указание яркости изображения в целом или плавающем значении</td><tr>`,
  saturation: `<tr><td><p>saturate</p>насыщенность</td><td>Указание насыщенности изображения в целом или плавающем значении</td><tr>`,
  hue: `<tr><td><p>hue</p>тон</td><td>Указание смещения тона изображения в градусах (&minus;360—360)</td><tr>`,
  pos: `<tr><td><p>pos</p>положение</td><td>Положение водяного знака (n — по центру свреху, nw — по левому верхнему углу, ne — по правому верхнему углу, s — по центру снизу, sw — по левому нижнему углу, se — по правому нижнему углу)</td><tr>`,
  ws: `<tr><td><p>ws</p>размер</td><td>Указание размера водяного знака на основе одного значения</td><tr>`,
  wpost: `<tr><td><p>wpost</p>пост-знак</td><td>Указание должен ли знак устанавливаться на изображение после всех преобразований, если да — wpost=true</td><tr>`,
};
app.get(/^\/([A-Za-zа-яА-Я0-9_%]+):/, async (request, response, next) => {
  const decodedUrl = decodeURIComponent(request.url);
  let result;
  try {

    if (/^\/(File|Файл):/.test(decodedUrl)) {
      const FileName = decodedUrl.replace(/^\/(File|Файл):/, '').replace(/\?.*$/, '');
      const Arguments = request.url.includes('?') ? request.url.replace(/^[^?]*\?/, '?') : '';
      const getExtension = path.extname(request.url.split('?')[0]);

      if (serverConfig.allowedFileTypes.images.includes(getExtension)) {
        const language = await request.headers['accept-language'].substring(0, 2);
        request.params.imageFileName = FileName;
        const imageHandler = new ImageHandler(__PROJECT_DIR__, request, serverConfig.cache.enabled, true);
        const handledResult = await imageHandler.getImage(sharedAssetsDB);

        if (typeof handledResult === 'string') {
          const error = new Error(handledResult.message);
          error.status = 404;
          throw error;
        }


        const queriesTable = `
          <table>
            <tr>
                <th colspan="2">Аргументы запроса</th>
            </tr>
            ${Object.keys(queriesType).map(key => {
          const tableRow = queriesType[key];
          if (Object.keys(request.query).includes(key)) {
            return tableRow.replace('<tr>', '<tr class="query-used">');
          } else {
            return tableRow;
          }
        }).join('')}
          </table>
        `;
        //console.log(handledResult);

        const isCached = handledResult.cached ? 'Кэш' : 'Не кэшируется';
        const metaInfo = handledResult.dataBaseInfo.FileInfo || null;
        let metaResolution, metaFileSize, metaAccessTime, metaModifiedTime, metaCreateTime, metaSpace, metaHasAlpha, metaFormat, metaDensity, metaChannels;
        if (metaInfo) {
          metaResolution = `${metaInfo.width}x${metaInfo.height}` || null;
          metaFileSize = metaInfo.size / 1024 / 1024 + ' МБ';
          metaAccessTime = metaInfo.atime;
          metaModifiedTime = metaInfo.mtime;
          metaCreateTime = metaInfo.ctime;
          metaSpace = metaInfo.space;
          metaHasAlpha = metaInfo.hasAlpha || false;
          metaFormat = metaInfo.format;
          metaDensity = metaInfo.density;
          metaChannels = metaInfo.channels;
        }
        const fileLoadedInfo = handledResult.fileInfo || null;
        let fileResolution, fileSize, fileAccessTime, fileModifiedTime, fileCreateTime, fileSpace, fileHasAlpha, fileFormat, fileDensity, fileChannels;
        if (fileLoadedInfo) {
          fileResolution = `${fileLoadedInfo.width}x${fileLoadedInfo.height}` || null;
          fileSize = fileLoadedInfo.size / 1024 / 1024 + ' МБ';
          fileAccessTime = fileLoadedInfo.atime;
          fileModifiedTime = fileLoadedInfo.mtime;
          fileCreateTime = fileLoadedInfo.ctime;
          fileSpace = fileLoadedInfo.space;
          fileHasAlpha = fileLoadedInfo.hasAlpha || false;
          fileFormat = fileLoadedInfo.format;
          fileDensity = fileLoadedInfo.density;
          fileChannels = fileLoadedInfo.channels;
        }
        const dbTitle = handledResult.dataBaseInfo.Title || '';
        const dbFileName = handledResult.dataBaseInfo.FileName;
        const dbFileType = locale[language].FileTypes[handledResult.dataBaseInfo.FileType];
        const dbFileSource = request.params.imageFileName;
        let dbFileLink = handledResult.dataBaseInfo.FileLink;
        dbFileLink = !dbFileLink.startsWith('https://') ? `/${dbFileLink}` : dbFileLink;
        result = `
          <h1 style="display: flex; justify-content: space-between;"><span>${dbTitle}</span><span>${Arguments ? 'Сгенерировано запросом' : ''}</span></h1>
          <h2 style="display: flex; justify-content: space-between;"><span>${dbFileName}</span></h2>
          <h3>${dbFileType}</h3>
          ${Arguments ? isCached : ''}<br>
          ${Arguments ? queriesTable : ''}
          <br>
          <a href="${dbFileLink}">${dbFileLink}</a>
          <p>Старое разрешение: ${metaInfo && metaResolution} ${Arguments && fileLoadedInfo && fileResolution ? `| Новое разрешение: ${fileResolution}` : ''}</p>
          <a href="/shared/images/${dbFileSource}${Arguments}" target="_blank"><img src="/shared/images/${dbFileSource}${Arguments}" alt="${dbTitle}"></a>
        `;

      }

      else if (dataExtensions.includes(getExtension)) {
        if (getExtension === 'xml') {
          try {
            const row = await new Promise((resolve, reject) => {
              sharedAssetsDB.get('SELECT * FROM sharedFiles WHERE FileName = ? AND FileType = ?', [FileName, 'XML'], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });

            if (!row) throw new Error(`${FileName} XML Not Found`);
            result = `<pre>${row.FileEmbedded.toString()
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</pre>`;
            console.log(result);
          } catch (error) {
            console.error(error);
            throw error;
          }
        }
      }
    }
    else { response.status(400).send('Invalid URL format'); return; }

    response.send(result);
  } catch (error) {
    console.error('Error processing file:', error);
    next(error);
  }
});


app.get('/shared/images/:imageFileName', async (request, response, next) => {

  try {
    const handler = new ImageHandler(__PROJECT_DIR__, request, serverConfig.cache.enabled);
    const handledResult = await handler.getImage(sharedAssetsDB);

    if (typeof handledResult === 'string') {
      const error = new Error(handledResult.message);
      error.status = 404;
      throw error;
    } else {
      response.contentType(handledResult.mimeType);
      response.send(handledResult.imageBuffer);

    }
  } catch (error) {
    console.error('Error processing image:', error);
    next(error);
  }
});


app.get('/local/images/*', async (request, response, next) => {
  try {
    const handler = new ImageHandler(path.join(__PROJECT_DIR__, 'static/public/resource/images'), request, serverConfig.cache.enabled);
    const handledResult = await handler.getImage();

    if (typeof handledResult === 'string') {
      const error = new Error(handledResult.message);
      error.status = 404;
      throw error;
    }
    else
      response.contentType(handledResult.mimeType);
    response.send(handledResult.imageBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    next(error);
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

app.post('/registration', (request, response) => {
  try {
    const messageSender = nodemailer.createTransport({

    });
  } catch (error) {
    console.error(error);
    next(error);
  }
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

(async () => {
  try {
    const server = https.createServer(options, app);
    const expressServer = app.listen(serverConfig.server.HTTPPort);

    await Promise.all([
      new Promise((resolve, reject) => {
        server.listen(serverConfig.server.HTTPSPort, () => {
          console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: HTTPS enabled | PORT : ${serverConfig.server.HTTPSPort}\x1b[39m`);

          if (process.env.PM2_HOME) server.on('request', (req, res) => res.setHeader('Project-cluster', 'Enabled'));

          resolve();
        });
      }),
      new Promise((resolve, reject) => {
        expressServer.on('listening', () => {
          console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SERVER] :: HTTP enabled | PORT : ${serverConfig.server.HTTPPort}\x1b[39m`);
          resolve();
        });
      })
    ]);

    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 🟩 > [SERVER] :: Server started successfully\x1b[39m`);

  } catch (error) {
    console.error(`\x1b[31m[${new Date().toLocaleString().replace(',', '')}] :: ⭕ > [SERVER] :: Server failed to start\x1b[39m`, error);
  }
})();



