require('dotenv').config();
require('./nk.config.js').config().init();
app.use(express.static(path.join(__PROJECT_DIR__, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__PROJECT_DIR__, 'app'));




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



__NK__.url = [];
__NK__.langs = {};
__NK__.langs.list = {
  ru: { emoji: '🇷🇺', name: 'Русский' },
  en: { emoji: '🇬🇧', name: 'English' },
  ja: { emoji: '🇯🇵', name: '日本語' },
  zh: { emoji: '🇨🇳', name: '简体中文' },
  ko: { emoji: '🇰🇷', name: '한국어' },
  vi: { emoji: '🇻🇳', name: 'Tiếng Việt' },
  mo: { emoji: '🇲🇩', name: 'Молдовеняскэ' },
  ro: { emoji: '🇷🇴', name: 'Română' },
};
__NK__.langs.supported = Object.keys(__NK__.langs.list);


const dataArray = [];
__NK__.langs.supported.forEach(lang => { dataArray.push({ source: `./public/data/locale/common/main.${lang}.yaml`, as: `locale.${lang}` }) });
dataArray.push({ source: `./public/data/locale/common/asset.common.yaml`, as: `locale.common` });
dataArray.push({ source: `./public/data/locale/common/asset.templates.yaml`, as: `locale.templates` });

DataExtend(dataArray, __PROJECT_DIR__)
    .then(() => console.log('Data extension complete'))
    .catch(err => console.error('Error extending data:', err));


app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});


const VALID_COOKIES = ['savedSettings', 'latestCommands', 'selectedItems', 'NK'];
const VALID_MODES = ['kamon', 'banners', 'clans', 'cv', 'landing', 'tree', 'license', 'pattern', 'reader'];
const VALID_SELECTED = ['2d', '3d'];

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


async function loadComponent(component, data, renderer) {
  const renderers = {
    pug: [pug.renderFile, 'pug'],
    ejs: [ejs.renderFile, 'ejs']
  }
  try {
    let template;
    const transferedData = [`app/${component}.${renderers[renderer] ? renderers[renderer][1] : 'ejs'}`, data || {}];
    template = await renderers[renderer] ? renderers[renderer][0](...transferedData) : renderers['ejs'][0](...transferedData);
    return template;
  }
  catch (error) {
    console.error(error);
    throw error;
  }
}

async function PagePrerender(pageTemplate, data) {
  try {
    const template = await ejs.renderFile(`app/${pageTemplate}.ejs`, data || {});
    const processedPage = await PostProcessor(template);

    return processedPage;
  } catch (error) {
    console.error('Ошибка при обработке страницы:', error);
    return null;
  }
}


app.get('/', async (request, response) => {
  try {
    console.log(new Date(await getLastModifiedInFolders()).toLocaleString());
    const cookies = {};
    for (const cookieName in request.cookies) {
      for (const validCookie of VALID_COOKIES) {
        if (cookieName.startsWith(validCookie)) {
          const cookieKey = cookieName.split('.')[0]; // Получаем первую часть куки (до точки)
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
      userDevice: os.platform(),
      navigatorLanguage: request.headers['accept-language'],
      urlModes: await parseUrl(),
    };
    
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
    
    const getNavigatorLanguage = __META__.navigatorLanguage.substring(0, 2); // Получаем первые две буквы языка
    __META__.navigatorLanguage = __NK__.langs.supported.includes(getNavigatorLanguage) ? getNavigatorLanguage : 'en';

    const __SETTING_CONFIG__ = new Map([
      ['lang', __META__.navigatorLanguage],
    ]);

    const __COMPILED_DATA = { __META__, __SETTING_CONFIG__ };

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


const [ PORT, HOST ] = [ 3000, 'localhost' ];
const server = app.listen(PORT, HOST, () => { console.log(`Server is running on http://${HOST}:${PORT}`) });
