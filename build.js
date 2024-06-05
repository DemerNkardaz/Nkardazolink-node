const fs = require('fs-extra');
const path = require('path');
const terser = require('terser');
const htmlMinifier = require('html-minifier');
const sass = require('node-sass');

const handlingExtensions = ['.js', '.html', '.scss', '.css'];

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
        const result = sass.renderSync({
          file: sourcePath,
          outputStyle: 'compressed'
        });
        await fs.writeFile(destinationPath, result.css.toString());
      } else if (!handlingExtensions.includes(path.extname(sourcePath))) {
        await fs.copy(sourcePath, destinationPath);
      }
    } else if (entry.isDirectory()) {
      await copyFilesAndMinify(sourcePath, destinationPath);
    }
  }
}
const sourceDir = './src/serverside';
const destinationDir = './app';

copyFilesAndMinify(sourceDir, destinationDir)
  .then(() => console.log('Файлы успешно скопированы и минифицированы'))
  .catch(error => console.error('Ошибка при копировании и минификации файлов:', error));