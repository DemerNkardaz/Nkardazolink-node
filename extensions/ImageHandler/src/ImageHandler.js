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
    !fs.existsSync('./cache/images') && fs.mkdirSync('./cache/images', { recursive: true });
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

  constructor() {
    !fs.existsSync('./cache/images') && fs.mkdirSync('./cache/images', { recursive: true });
  }

  async queryAssing(sourcePath, request, enableCache = true, getImageInfoOnly = false) {
    this.#handlerQuery.isGetImageInfoOnly = getImageInfoOnly;
    this.#handlerQuery.sourcePath = sourcePath;

    this.#handlerQuery.imageFilePath = this.#localisedFileQuery.test(request.params[0])
    ? request.params[0].replace(this.#localisedFileQuery, '')
    : request.params[0];
    
    this.#handlerQuery.imageFileName = this.#localisedFileQuery.test(request.params.imageFileName)
    ? request.params.imageFileName.replace(this.#localisedFileQuery, '')
    : request.params.imageFileName || null;
    
    this.#handlerQuery.imageSizeBeforeProcessing = request.query.s ? parseInt(request.query.s) : null;
    this.#handlerQuery.imageWidthHeight = request.query.wh ? request.query.wh.split('x').map(Number) : null;
    this.#handlerQuery.imageFit = request.query.fit || null;
    this.#handlerQuery.convetToFromat = request.query.to || null;
    this.#handlerQuery.convertQuality = request.query.q ? parseInt(request.query.q) : null;
    this.#handlerQuery.convertAlphaQuality = request.query.aQ ? parseInt(request.query.aQ) : null;
    this.#handlerQuery.imagePaddingPercent = request.query.p ? parseFloat(request.query.p) : 0;
    this.#handlerQuery.imageSizeAfterProcessing = request.query.r ? parseInt(request.query.r) : 0;
    this.#handlerQuery.imageBackgroundColor = request.query.bg || null;
    this.#handlerQuery.imagePaddingBackgroundColor = request.query.pbg || null;
    this.#handlerQuery.staticURL = request.url;
    this.#handlerQuery.watermark = request.query.water || null;
    this.#handlerQuery.watermarkPosition = request.query.pos || null;
    this.#handlerQuery.watermarkScale = request.query.ws || null;
    this.#handlerQuery.isPlaceWatermarkAfterProcessing = request.query.wpost ? (request.query.wpost === 'true' ? true : false) : null;
    this.#handlerQuery.cacheKeyImageRequest = this.#generateCacheKey(request.url);
    this.#handlerQuery.cacheEnabled = enableCache;
    this.#handlerQuery.imageRotate = request.query.rotate ? parseInt(request.query.rotate) : null;
    this.#handlerQuery.isImageRotateAfterProcessing = request.query.protate ? parseInt(request.query.protate) : null;
    this.#handlerQuery.imageRotateBackgroundColor = request.query.rbg || null;
    this.#handlerQuery.imageGamma = request.query.gamma ? request.query.gamma.split(',').map(Number) : null;
    this.#handlerQuery.imageBrightness = request.query.brightness ? parseFloat(request.query.brightness) : null;
    this.#handlerQuery.imageSaturation = request.query.saturation ? parseFloat(request.query.saturation) : null;
    this.#handlerQuery.imageHUE = request.query.hue ? parseFloat(request.query.hue) : null;
    this.#handlerQuery.version = request.query.v || null;
    this.#handlerQuery.imageRatio = request.query.ratio || null;
    this.#handlerQuery.imageRatioFit = request.query.ratioFit || null;
    this.#handlerQuery.imageRatioShift = request.query.ratioShift || null;
    this.#handlerQuery.imageBorderRadius = request.query.br || null;
    this.#handlerQuery.imageColorSpace = request.query.colorSpace ? request.query.colorSpace.toLowerCase() : null;
    this.#handlerQuery.imageICCProfile = request.query.icc || null;

    this.#handlerQuery.zlibCompression = parseInt(request.query.zlib) || null;
    this.#handlerQuery.progressive = request.query.progressive ? (request.query.progressive === 'true' ? true : false) : null;
    this.#handlerQuery.dither = parseFloat(request.query.dither) || null;
    this.#handlerQuery.colors = parseInt(request.query.colors) || null;
    this.#handlerQuery.effort = parseInt(request.query.effort) || null;
    this.#handlerQuery.pngPalette = request.query.pngPalette ? (request.query.pngPalette === 'true' ? true : false) : null;

    this.#handlerQuery.mozjpeg = request.query.mozjpeg ? (request.query.mozjpeg === 'true' ? true : false) : null;
    this.#handlerQuery.chromaSubsampling = request.query.chromaSubsampling || null;

    this.#handlerQuery.lossless = request.query.lossless ? (request.query.lossless === 'true' ? true : false) : null;
    this.#handlerQuery.nearLossless = request.query.nearLossless ? (request.query.nearLossless === 'true' ? true : false) : null;
    this.#handlerQuery.smartSubsample = request.query.smartSubsample ? (request.query.smartSubsample === 'true' ? true : false) : null;
    this.#handlerQuery.preset = request.query.preset || null;

    this.#handlerQuery.bitdepth = parseInt(this.#handlerQuery.bitdepth) || null;


    if (this.#handlerQuery.imageBackgroundColor) {
      const [r, g, b, alpha] = chroma(this.#handlerQuery.imageBackgroundColor).rgba();
      this.#handlerQuery.imageBackgroundColor = { r, g, b, alpha };
    }
    if (this.#handlerQuery.imagePaddingBackgroundColor) {
      const [r, g, b, alpha] = chroma(this.#handlerQuery.imagePaddingBackgroundColor).rgba();
      this.#handlerQuery.imagePaddingBackgroundColor = { r, g, b, alpha };
    }

    await this.#manageCacheSize();
    return this;
  }


  #generateCacheKey(keyString) {
    return crypto.createHash('md5').update(keyString).digest('hex');
  }


  async getImage(dataBase) {
    let imagePath;
    if (dataBase) {
      return new Promise((resolve, reject) => {
        dataBase.get('SELECT * FROM sharedFiles WHERE FileName = ? AND FileType = ?', [this.#handlerQuery.imageFileName, 'Image'], async (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(`${this.#handlerQuery.imageFilePath || this.#handlerQuery.imageFileName} Image Not Found`);

          const imagePath = row.FileLink.startsWith('https://') ? row.FileLink : path.join(this.#handlerQuery.sourcePath, row.FileLink);
          try {
            row.FileInfo = row.FileInfo ? JSON.parse(row.FileInfo) : {};

            const result = await this.#readAndHandleImage(imagePath, row);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      imagePath = path.join(this.#handlerQuery.sourcePath, 'images', this.#handlerQuery.imageFilePath);
      try {
        const result = await this.#readAndHandleImage(imagePath);
        return result;
      } catch (error) {
        throw error;
      }
    }
  }


  async #readAndHandleImage(imagePath, dataBaseInfo = null) {
    let imageBuffer;
    let remoteMetaData = null;

    try {
      if (!imagePath.startsWith('https://')) imageBuffer = await fsPromises.readFile(imagePath);
      else {
        const remoteMeta = await axios.head(imagePath);

        remoteMetaData = {
          mimeType: remoteMeta.headers['content-type'],
          size: remoteMeta.headers['content-length'] / 1024 / 1024 + ' MB',
          mtime: new Date(remoteMeta.headers['last-modified']).toISOString(),
          atime: new Date(remoteMeta.headers['date']).toISOString(),
        }

        const remoteImage = await axios.get(imagePath, { responseType: 'arraybuffer' });
        const metaData = await sharp(remoteImage.data).metadata();
        Object.assign(remoteMetaData, metaData);

        //!console.log(JSON.stringify(remoteMetaData));
        imageBuffer = Buffer.from(remoteImage.data);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        return `File Not Found: ${imagePath}`;
      }
      throw err;
    }

    const isCacheExists = await this.#checkCache();
    let sourceMeta = !imagePath.startsWith('https://') ? await fsPromises.stat(imagePath) : remoteMetaData;
    const isSourceImageChanged = isCacheExists?.fileInfo && sourceMeta.mtime > isCacheExists?.fileInfo?.mtime;

    if (isCacheExists && !isSourceImageChanged) {
      try {
        //console.info(`Line of cached, loaded from cache: ${imagePath}`);
        if (this.#handlerQuery.isGetImageInfoOnly === true) return { dataBaseInfo: dataBaseInfo || null, cached: true, remoteMetaData: remoteMetaData || null, fileInfo: isCacheExists.fileInfo };
        
        return { mimeType: isCacheExists.mimeType || 'application/octet-stream', imageBuffer: isCacheExists.imageBuffer, dataBaseInfo: dataBaseInfo || null, cached: true, fileInfo: isCacheExists.fileInfo || null, remoteMetaData: remoteMetaData || null };
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
    //if (!/\.\w+$/.test(this.staticUrl)) console.info(`Line of generated, new genearion of cache: ${imagePath}`);
          
    try {
      if (this.#handlerQuery.watermark && this.#handlerQuery.isPlaceWatermarkAfterProcessing !== true && this.#handlerQuery.watermarkPosition) imageBuffer = await this.#setWatermark(imageBuffer);

      let mimeType = mime.lookup(imagePath) || 'application/octet-stream';
      let svgScales;

      if (mimeType.startsWith('image/')) {
        let metadata;

        if (mimeType !== 'image/svg+xml') {
          metadata = await sharp(imageBuffer).metadata();

          if (this.#handlerQuery.imageSizeBeforeProcessing) {
            const maxDimension = Math.max(metadata.width, metadata.height);
            const finalSize = this.#handlerQuery.imageSizeBeforeProcessing ? Math.min(this.#handlerQuery.imageSizeBeforeProcessing, maxDimension) : null;

            if (finalSize && finalSize < maxDimension) {
              imageBuffer = await sharp(imageBuffer).resize(finalSize, finalSize, { withoutEnlargement: true, fit: this.#handlerQuery.imageFit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
            }
          } else if (this.#handlerQuery.imageWidthHeight) {
            const maxWidth = Math.min(this.#handlerQuery.imageWidthHeight[0], metadata.width);
            const maxHeight = Math.min(this.#handlerQuery.imageWidthHeight[1], metadata.height);

            imageBuffer = await sharp(imageBuffer).resize(maxWidth, maxHeight, { withoutEnlargement: true, fit: this.#handlerQuery.imageFit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
          }
          if (this.#handlerQuery.imageRotate) {
            imageBuffer = await sharp(imageBuffer).rotate(this.#handlerQuery.imageRotate, { background: this.#handlerQuery.imageRotateBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
          }
        } else {
          imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, this.#handlerQuery.imageSizeBeforeProcessing), 'utf8');
          svgScales = await this.#checkSVGScale(imageBuffer);
        }

        if (this.#handlerQuery.convetToFromat) {
          if (mimeType === 'image/svg+xml' && (svgScales['width'] > 2048 || svgScales['height'] > 2048)) {
            imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, 2048), 'utf8');
          }

          const getConverted = await this.#convertImage(imageBuffer);
          imageBuffer = getConverted.convertedImageBuffer;
          mimeType = getConverted.mimeType;
        }

        if (this.#handlerQuery.imagePaddingPercent > 0) {
          imageBuffer = await this.#applyPadding(imageBuffer);
        }

        if (this.#handlerQuery.imageSizeAfterProcessing) {
          if (!isNaN(this.resolution) && this.resolution > 0) {
            imageBuffer = await sharp(imageBuffer).resize(this.#handlerQuery.imageSizeAfterProcessing, this.#handlerQuery.imageSizeAfterProcessing, { withoutEnlargement: true,  fit: 'inside' }).toBuffer();
          }
        }
        
        if (this.#handlerQuery.watermark && this.#handlerQuery.isPlaceWatermarkAfterProcessing === true && this.#handlerQuery.watermarkPosition) imageBuffer = await this.#setWatermark(imageBuffer);

        if (this.#handlerQuery.imageBackgroundColor) {
          if (mimeType !== 'image/svg+xml') {
            const afterScaleMeta = await sharp(imageBuffer).metadata();
            let backgroundImage = await sharp({ create: { width: afterScaleMeta.width, height: afterScaleMeta.height, channels: 4, background: this.#handlerQuery.imageBackgroundColor } }).webp().toBuffer();

            imageBuffer = await sharp(backgroundImage).composite([{ input: imageBuffer }]).toBuffer();
          } else {
            imageBuffer = Buffer.from(await this.#createSVGBackground(imageBuffer, this.#handlerQuery.imageBackgroundColor), 'utf8');
          }
        }

        if (this.#handlerQuery.isImageRotateAfterProcessing) {
          imageBuffer = await sharp(imageBuffer).rotate(this.#handlerQuery.imageRotate, { background: this.#handlerQuery.imageRotateBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
        }

        if (this.#handlerQuery.imageBorderRadius) {
          const borderRadiusValue = this.#handlerQuery.imageBorderRadius.trim();
          let radiusInPixels;

          if (borderRadiusValue.endsWith('px')) {
            radiusInPixels = parseInt(borderRadiusValue.slice(0, -2), 10);
          } else if (borderRadiusValue.endsWith('perc')) {
            const radiusPercent = parseFloat(borderRadiusValue.slice(0, -4));
            const metadata = await sharp(imageBuffer).metadata();
            const minDimension = Math.min(metadata.width, metadata.height);
            radiusInPixels = Math.floor((radiusPercent / 100) * minDimension);
          } else {
            throw new Error(`Invalid borderRadius value: ${this.#handlerQuery.imageBorderRadius}`);
          }

          const metadata = await sharp(imageBuffer).metadata();
          const { width, height } = metadata;

          const svgMask = `
          <svg width="${width}" height="${height}">
            <rect x="0" y="0" width="${width}" height="${height}" rx="${radiusInPixels}" ry="${radiusInPixels}" fill="#fff" />
          </svg>
          `;

          const maskBuffer = Buffer.from(svgMask);


          imageBuffer = await sharp(imageBuffer)
            .composite([{
              input: maskBuffer,
              blend: 'dest-in'
            }])
            .toFormat(this.#handlerQuery.convetToFromat ?? 'webp', { quality: this.#handlerQuery.convertQuality || 75 })
            .toBuffer();
        }

        if (this.#handlerQuery.imageRatio) {
          imageBuffer = await this.#applyRatio(imageBuffer);
        }

        if (this.#handlerQuery.imageColorSpace || this.#handlerQuery.imageICCProfile)
          imageBuffer = await this.#switchColorProfile(imageBuffer);

        if (this.#handlerQuery.imageGamma || this.#handlerQuery.imageBrightness || this.#handlerQuery.imageSaturation || this.#handlerQuery.imageHUE) {
          const options = {};
          if (this.#handlerQuery.imageBrightness) options.brightness = this.#handlerQuery.imageBrightness;
          if (this.#handlerQuery.imageSaturation) options.saturation = this.#handlerQuery.imageSaturation;
          if (this.#handlerQuery.imageHUE) options.hue = this.#handlerQuery.imageHUE;

          imageBuffer = sharp(imageBuffer).modulate(options);
          this.#handlerQuery.imageGamma && (imageBuffer = imageBuffer.gamma(this.#handlerQuery.imageGamma[0], this.#handlerQuery.imageGamma[1]));

          imageBuffer = await imageBuffer.toBuffer();
        }

        if (this.#handlerQuery.staticURL.includes('?') && imageBuffer.length <= serverConfig.cache.maxCachedImageSize) {
          const cachedName = `${this.#handlerQuery.cacheKeyImageRequest}-${this.#generateCacheKey(mimeType.slice(6))}`;
          this.#handlerQuery.cacheEnabled === true && await this.#saveToCache(imageBuffer, cachedName);
        }

        const fileInfo = await sharp(imageBuffer).metadata();
        fileInfo.icc && delete fileInfo.icc;

        return { imageBuffer, mimeType, dataBaseInfo, fileInfo, remoteMetaData };
      } else {
        return `File is not an image: ${imagePath}`;
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async #switchColorProfile(imageBuffer) {
    let processingImage = sharp(imageBuffer);
    try {
      let isValidColorSpace = this.#handlerQuery.imageColorSpace && allowedColorSpaces.map(colorSpace => colorSpace.toLowerCase()).includes(this.#handlerQuery.imageColorSpace);
      let iccProfile = this.#handlerQuery.imageICCProfile && iccProfiles.find(iccEntry => iccEntry.map(profile => profile.toLowerCase()).includes(this.#handlerQuery.imageICCProfile.toLowerCase()));
      
      if (isValidColorSpace) processingImage = processingImage.toColorspace(this.#handlerQuery.imageColorSpace);      
      if (iccProfile) processingImage = processingImage.withMetadata({ icc: iccProfile[1] });
    } catch (err) {
      console.log('Error processing image:', err);
    } finally {
      return await processingImage.toBuffer();
    }
  }

  async #setWatermark(imageBuffer) {
    let watermak = await fsPromises.readFile(path.join(this.#handlerQuery.sourcePath, `static/public/resource/images/${this.#handlerQuery.watermark}.svg`));
    let gravity;

    switch (this.#handlerQuery.watermarkPosition) {
      case 'nw':
        gravity = 'northwest';
        break;
      case 'ne':
        gravity = 'northeast';
        break;
      case 'sw':
        gravity = 'southwest';
        break;
      case 'se':
        gravity = 'southeast';
        break;
      case 'n':
        gravity = 'north';
        break;
      case 's':
        gravity = 'south';
        break;
      case 'c':
        gravity = 'center';
        break;
      default:
        gravity = 'northwest';
    }
        
    watermak = await sharp(watermak).toFormat('png').resize((this.#handlerQuery.watermarkScale * 100) || null, (this.#handlerQuery.watermarkScale * 100) || null, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    imageBuffer = await sharp(imageBuffer).composite([{ input: watermak, gravity: gravity, blend: 'overlay' }]).toBuffer();

    return imageBuffer;
  }

  async #checkCache() {
    const fileMimes = ['apng', 'png', 'svg+xml', 'webp', 'jpeg', 'gif', 'avif', 'tiff', 'bmp', 'ico'];
    const files = await fsPromises.readdir(this.#handlerQuery.cacheDirectory);

    for (const file of files) {
      if (file.startsWith(this.#handlerQuery.cacheKeyImageRequest)) {
        const mimeTypePart = file.split('-')[1];

        for (const type of fileMimes) {
          if (mimeTypePart === this.#generateCacheKey(type)) {
            const mimeType = `image/${type}`;
            const filePath = path.join(this.#handlerQuery.cacheDirectory, file);

            try {
              const cachedBuffer = await fsPromises.readFile(filePath);
              let fileInfo;

              await new Promise(async (resolve, reject) => {
                const fileStat = await fsPromises.stat(filePath);
                const fileMetadata = await sharp(cachedBuffer).metadata();
                fileInfo = await [fileStat, fileMetadata].mergeObjects();
                resolve(fileInfo);
              });

              setTimeout(async () => {
                const now = new Date();
                await fsPromises.utimes(filePath, now, now);
              }, 1000);

              return { imageBuffer: cachedBuffer, mimeType, fileInfo, TEST: 'SDASFASFASF' };
            } catch (error) {
              console.error(`Ошибка чтения кеш-файла: ${error.message}`);
              return null;
            }
          }
        }
      }
    }

    return null;
  }
  
  async #saveToCache(imageBuffer, cachadName) {
    const cachePath = path.join(this.#handlerQuery.cacheDirectory, cachadName);

    try {
      await fsPromises.writeFile(cachePath, imageBuffer);
      await this.#manageCacheSize();
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }


  async #manageCacheSize() {
    const maxCacheSize = serverConfig.cache.maxImagesCache;
    
    try {
      const files = await fsPromises.readdir(this.#handlerQuery.cacheDirectory);
      let totalSize = 0;

      const fileSizes = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.#handlerQuery.cacheDirectory, file);
          const stat = await fsPromises.stat(filePath);
          totalSize += stat.size;
          return { filePath, size: stat.size, mtime: stat.mtime };
        })
      );

      if (totalSize > maxCacheSize) {
        const sortedFiles = fileSizes.sort((a, b) => a.mtime - b.mtime);
        for (const file of sortedFiles) {
          await fsPromises.unlink(file.filePath);
          totalSize -= file.size;
          if (totalSize <= maxCacheSize) {
            break;
          }
        }
      }
    } catch (error) {
      return;
    }
  }

  async #convertImage(imageBuffer) {
    let convertedImageBuffer, mimeType;

    switch (this.#handlerQuery.convetToFromat.toLowerCase()) {
      case 'webp':
        convertedImageBuffer = await sharp(imageBuffer).webp({
          quality: this.#handlerQuery.convertQuality || 75,
          alphaQuality: this.#handlerQuery.convertAlphaQuality || 100,
          effort: this.#handlerQuery.effort || 4,
          lossless: this.#handlerQuery.lossless || false,
          nearLossless: this.#handlerQuery.nearLossless || false,
          smartSubsample: this.#handlerQuery.smartSubsample || false,
          preset: this.#handlerQuery.preset || 'default',
        }).toBuffer();
        mimeType = 'image/webp';
        break;
      case 'avif':
        convertedImageBuffer = await sharp(imageBuffer).avif({
          quality: this.#handlerQuery.convertQuality || 75,
          lossless: this.#handlerQuery.lossless || false,
          effort: this.#handlerQuery.effort || 4,
          chromaSubsampling: this.#handlerQuery.chromaSubsampling || '4:4:4',
          bitdepth: this.#handlerQuery.bitdepth || 8
        }).toBuffer();
        mimeType = 'image/avif';
        break;
      case 'gif':
        convertedImageBuffer = await sharp(imageBuffer).gif({
          dither: this.#handlerQuery.dither || 1.0,
          colors: this.#handlerQuery.colors || 256,
          effort: this.#handlerQuery.effort || 7,
          progressive: this.#handlerQuery.progressive || false
        }).toBuffer();
        mimeType = 'image/gif';
        break;
      case 'png':
        convertedImageBuffer = await sharp(imageBuffer).png({
          quality: this.#handlerQuery.convertQuality || 75,
          compressionLevel: this.#handlerQuery.zlibCompression || 6,
          palette: this.#handlerQuery.pngPalette || false,
          dither: this.#handlerQuery.dither || 1.0,
          colors: this.#handlerQuery.colors || 256,
          effort: this.#handlerQuery.effort || 7,
          progressive: this.#handlerQuery.progressive || false,
        }).toBuffer();
        mimeType = 'image/png';
        break;
      case 'jpeg':
      case 'jpg':
        convertedImageBuffer = await sharp(imageBuffer).jpeg({
          quality: this.#handlerQuery.convertQuality || 75,
          progressive: this.#handlerQuery.progressive || false,
          mozjpeg: this.#handlerQuery.mozjpeg || false,
          chromaSubsampling: this.#handlerQuery.chromaSubsampling || '4:2:0'
        }).toBuffer();
        mimeType = 'image/jpeg';
        break;
      case 'tiff':
        convertedImageBuffer = await sharp(imageBuffer).tiff({ quality: this.#handlerQuery.convertQuality || 75 }).toBuffer();
        mimeType = 'image/tiff';
        break;
        
      default:
        return `Unsupported format: ${this.#handlerQuery.convetToFromat}`;
    }

    return { convertedImageBuffer, mimeType };
  }

  async #checkSVGScale(imageBuffer) {
    const svgString = await imageBuffer.toString('utf-8');
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;

    const viewBox = svgElement.getAttribute('viewBox');
    const width = svgElement.getAttribute('width');
    const height = svgElement.getAttribute('height');

    if (width && height) {
      return { width: parseFloat(width), height: parseFloat(height) }
    }

    if (viewBox) {
      const [minX, minY, viewBoxWidth, viewBoxHeight] = viewBox.split(' ').map(Number);
      return { width: viewBoxWidth, height: viewBoxHeight }
    }
  }

  async #rescaleSVG(imageBuffer, size) {
  const svgString = await imageBuffer.toString('utf-8');
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;

    if (size) {
      const width = svgElement.getAttribute('width');
      const height = svgElement.getAttribute('height');

      if (width && height) {
        const aspectRatio = parseFloat(width) / parseFloat(height);

        if (parseFloat(width) >= parseFloat(height)) {
          svgElement.setAttribute('width', size);
          svgElement.setAttribute('height', Math.round(size / aspectRatio));
        } else {
          svgElement.setAttribute('height', size);
          svgElement.setAttribute('width', Math.round(size * aspectRatio));
        }
      } else {
        const viewBox = svgElement.getAttribute('viewBox');

        if (viewBox) {
          const [minX, minY, viewBoxWidth, viewBoxHeight] = viewBox.split(' ').map(Number);
          const aspectRatio = viewBoxWidth / viewBoxHeight;

          if (viewBoxWidth >= viewBoxHeight) {
            svgElement.setAttribute('width', size);
            svgElement.setAttribute('height', Math.round(size / aspectRatio));
          } else {
            svgElement.setAttribute('height', size);
            svgElement.setAttribute('width', Math.round(size * aspectRatio));
          }
        }
      }

      const xmlSerializer = new XMLSerializer();

      return xmlSerializer.serializeToString(svgElement);
    } else {
      return imageBuffer;
    }
  }

  async #createSVGBackground(imageBuffer, backgroundColor) {
    const svgString = imageBuffer.toString('utf-8');
  
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;

    const width = svgElement.getAttribute('width') || svgElement.viewBox.baseVal.width;
    const height = svgElement.getAttribute('height') || svgElement.viewBox.baseVal.height;

    const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.alpha})`);

    svgElement.insertBefore(rect, svgElement.firstChild);

    const xmlSerializer = new XMLSerializer();
    const modifiedSvgString = xmlSerializer.serializeToString(svgElement);

    return modifiedSvgString;
  }


  async #applyPadding(imageBuffer, ) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
  
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
  
    const paddingSize = Math.floor(Math.max(originalWidth, originalHeight) * this.#handlerQuery.imagePaddingPercent / 100);
  
    const minWidth = 10;
    const minHeight = 10;

    let newWidth = originalWidth - 2 * paddingSize;
    let newHeight = originalHeight - 2 * paddingSize;

    if (newWidth < minWidth) {
      newWidth = minWidth;
    }

    if (newHeight < minHeight) {
      newHeight = minHeight;
    }

    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, { withoutEnlargement: true })
      .extend({
        top: paddingSize,
        bottom: paddingSize,
        left: paddingSize,
        right: paddingSize,
        background: this.#handlerQuery.imagePaddingBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    return resizedImageBuffer;
  }

  async #applyRatio(imageBuffer) {
    const [ratioWidth, ratioHeight] = this.#handlerQuery.imageRatio.split(':').map(Number);
    if (!ratioWidth || !ratioHeight) return imageBuffer;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    const targetRatio = ratioWidth / ratioHeight;
    const currentRatio = originalWidth / originalHeight;

    let newWidth, newHeight;

    if (this.#handlerQuery.imageRatioFit === 'cover') {
      if (targetRatio > currentRatio) {
        newWidth = originalWidth;
        newHeight = Math.round(originalWidth / targetRatio);
      } else {
        newWidth = Math.round(originalHeight * targetRatio);
        newHeight = originalHeight;
      }
    } else if (this.#handlerQuery.imageRatioFit === 'contain') {
      if (targetRatio > currentRatio) {
        newWidth = Math.round(originalHeight * targetRatio);
        newHeight = originalHeight;
      } else {
        newWidth = originalWidth;
        newHeight = Math.round(originalWidth / targetRatio);
      }
    } else {
      return imageBuffer;
    }

    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(newWidth, newHeight, { fit: 'cover', position: 'center' })
      .toBuffer();

    return resizedImageBuffer;
  }
}


module.exports = { ImageHandler, ImageCacheCleaner, imageRouter };