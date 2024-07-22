const path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const sharp = require('sharp');
const fsPromises = require('fs').promises;
const fs = require('fs');
const mime = require('mime-types');
const crypto = require('crypto');
const axios = require('axios');
const chroma = require('chroma-js');
const { DOMParser, XMLSerializer } = require('xmldom');
const { imageRouter } = require('./ImageRoute');
const { mergeObjects } = require(path.join(root, 'modules/Utilities/Utilities'));


class ImageCacheCleaner {
  constructor() {

    this.frequency = serverConfig.cache.cacheCleaningFrequency || '7d';
    this.cacheMaxAge = serverConfig.cache.maxCacheAge || '7d';
    this.cacheDir = path.join(__PROJECT_DIR__, 'cache/images');
    this.serverINI = path.join(__PROJECT_DIR__, 'server.ini');
    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [IMAGE HANDLER] :: Cache cleaner initialized and checking [cache/images] every ${serverConfig.cache.cacheCleaningFrequency || '7d'}\x1b[39m`);
    this.cacheCleanInterval = setInterval(() => this.#removeOutdatedCache(), parseToInterval(this.frequency));

    chokidar.watch(this.serverINI).on('change', () => {
      setTimeout(() => {
        if (this.frequency !== serverConfig.cache.cacheCleaningFrequency) {
          console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [IMAGE HANDLER] :: Cache cleaner frequency changed from ${this.frequency} to ${serverConfig.cache.cacheCleaningFrequency}\x1b[39m`);

          this.frequency = serverConfig.cache.cacheCleaningFrequency;
          clearInterval(this.cacheCleanInterval);
          this.cacheCleanInterval = setInterval(() => this.#removeOutdatedCache(), parseToInterval(this.frequency));
        }
        if (this.cacheMaxAge !== serverConfig.cache.maxCacheAge) {
          console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [IMAGE HANDLER] :: Cache max age changed from ${this.cacheMaxAge} to ${serverConfig.cache.maxCacheAge}\x1b[39m`);

          this.cacheMaxAge = serverConfig.cache.maxCacheAge;
        }
      }, 1200);
    });
  }

  async #removeOutdatedCache() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - parseToDays(this.cacheMaxAge));

    try {
      const files = await fsPromises.readdir(this.cacheDir);

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fsPromises.stat(filePath);
        if (stats.mtime < oneWeekAgo) {
          await fsPromises.unlink(filePath);
        }
      }
    } catch (error) {
      console.error(`Ошибка при очистке кэша: ${error.message}`);
    }
  }
}

const allowedColorSpaces = [
  'rgb',
  'srgb',
  'adobergb',
  'cmyk',
  'xyz',
  'lab',
  'labs',
  'labq',
  'lch',
  'cmc',
  'b-w',
  'hsv',
  'scrgb',
  'rgb16',
  'grey16',
  'yxy'
];

const iccProfiles = [
  //* RGB ICC Profiles
  ['sRGB IEC61966-2.1', 'sRGB Color Space Profile.icm'],
  ['ProPhoto RGB', 'ProPhoto.icm'],
  ['CIE RGB', 'CIERGB.icc'],
  ['Adobe RGB (1998)', 'AdobeRGB1998.icc'],
  ['Apple RGB', 'AppleRGB.icc'],
  ['ColorMatch RGB', 'ColorMatchRGB.icc'],
  ['Wide Gamut RGB', 'WideGamutRGB.icc'],
    
  ['PAL/SECAM', 'PAL_SECAM.icc'],
  ['SMPTE-C', 'SMPTE-C.icc'],

  //* CMYK ICC Profiles
  ['Coated FOGRA27 (ISO 12647-2:2004)', 'CoatedFOGRA27.icc'],
  ['Coated FOGRA39 (ISO 12647-2:2004)', 'CoatedFOGRA39.icc'],
  ['Coated GRACoL 2006 (ISO 12647-2:2004)', 'CoatedGRACoL2006.icc'],
  ['Japan Color 2001 Coated', 'JapanColor2001Coated.icc'],
  ['Japan Color 2001 Uncoated', 'JapanColor2001Uncoated.icc'],
  ['Japan Color 2002 Newspaper', 'JapanColor2002Newspaper.icc'],
  ['Japan Color 2003 Web Coated', 'JapanColor2003WebCoated.icc'],
  ['Japan Web Coated (Ad)', 'JapanWebCoated.icc'],
  ['US Web Coated (SWOP) v2', 'USWebCoatedSWOP.icc'],
  ['US Web Uncoated v2', 'USWebUncoated.icc'],
  ['Uncoated FOGRA29 (ISO 12647-2:2004)', 'UncoatedFOGRA29.icc'],
  ['Web Coated FOGRA28 (ISO 12647-2:2004)', 'WebCoatedFOGRA28.icc'],
  ['Web Coated SWOP Grade 3 Paper', 'WebCoatedSWOP2006Grade3.icc'],
  ['Web Coated SWOP Grade 5 Paper', 'WebCoatedSWOP2006Grade5.icc'],
  ['Euroscale Coated', 'EuroscaleCoated.icc'],
  ['Euroscale Uncoated', 'EuroscaleUncoated.icc'],
  ['RSWOP', 'RSWOP.icm'],

  //* Gray ICC Profiles
  ['BW', 'BlackWhite.icc'],
  ['sGray', 'sGray.icc'],
];

class ImageHandler {
  #handlerQuery = { cacheDirectory: path.join(__PROJECT_DIR__, 'cache/images') };
  #localisedFileQuery = new RegExp(serverConfig.routes.validFilesQuery.source, serverConfig.routes.validFilesQuery.flags + "i");

  constructor() { !fs.existsSync('./cache/images') && fs.mkdirSync('./cache/images', { recursive: true }) }

  async queryAssing(sourcePath, request, enableCache = true, getImageInfoOnly = false) {

  }




  
}






module.exports = { ImageHandler, ImageCacheCleaner, imageRouter };