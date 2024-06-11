require('../../nk.config.js').config().init(['AppVariables']);
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const writeFilePromise = promisify(fs.writeFile);
const terser = require('terser');
const htmlMinifier = require('html-minifier');
const sass = require('sass');
const handlingExtensions = ['.js', '.html', '.scss', '.css'];

const checkForIndex = async (sourcePath) => {
  try {
    await fs.access(path.join(sourcePath, 'index.js'));
    execSync('node index.js', { stdio: 'inherit' });
  } catch (error) {
    console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > Not found [index.js], runnig % builder %`);
    execSync('node build.js index', { stdio: 'inherit' });

  }
}


async function copyFilesAndMinify(sourceDir, destinationDir) {
  await fs.ensureDir(destinationDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isFile()) {
      if (path.extname(sourcePath) === '.js') {
        const fileContent = await fs.readFile(sourcePath, 'utf8');
        const minified = await terser.minify(fileContent, {
          compress: true,
          mangle: true,
          keep_fnames: true,
          keep_classnames: true
        });
        await fs.writeFile(destinationPath, minified.code);
      } else if (path.extname(sourcePath) === '.html') {
        const fileContent = await fs.readFile(sourcePath, 'utf8');
        const minified = htmlMinifier.minify(fileContent, {
          collapseWhitespace: true,
          removeComments: true
        });
        await fs.writeFile(destinationPath, minified);
      } else if (path.extname(sourcePath) === '.scss' || path.extname(sourcePath) === '.css') {
        const result = sass.compile(sourcePath, { style: 'compressed' });
        await fs.writeFile(destinationPath, result.css.toString());
      } else if (!handlingExtensions.includes(path.extname(sourcePath))) {
        await fs.copy(sourcePath, destinationPath);
      }
    } else if (entry.isDirectory()) {
      await copyFilesAndMinify(sourcePath, destinationPath);
    }
    console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [BUILDER] % “${destinationPath}\\${entry.name}” created successfully!\x1b[39m`);
  }
}

const createManifest = async (sourcePath, lang, manifest) => {
  const translate = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(translate);
    }

    const translated = {};
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        translated[key] = translate(obj[key]);
      } else if (key === lang) {
        return obj[key];
      } else if (key === 'en' && !(lang in obj)) {
        return obj[key];
      } else {
        translated[key] = obj[key];
      }
    }

    return translated;
  };

  const translatedManifest = translate(manifest);
  const outputPath = path.join(sourcePath, `static/public/manifest/manifest.${lang}.webmanifest`);
  const minifiedManifest = JSON.stringify({ lang, ...translatedManifest }, null, 0);
  await fs.writeFile(outputPath, minifiedManifest, 'utf-8');
  console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [BUILDER] % Manifest for [${lang.toUpperCase()}] created successfully!\x1b[39m`);
};

async function index(sourcePath) {
  const destinationPath = path.join(sourcePath, 'index.js');
  sourcePath = path.join(sourcePath, 'index.dev.js');

  const fileContent = await fs.readFile(sourcePath, 'utf8');
  const minified = await terser.minify(fileContent, {
    compress: true,
    mangle: true,
    keep_fnames: true,
    keep_classnames: true
  });
  await writeFilePromise(destinationPath, minified.code);

  console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [BUILDER] :: “${destinationPath}” Index file builded\x1b[39m`);
}

module.exports = { copyFilesAndMinify, createManifest, index, checkForIndex };