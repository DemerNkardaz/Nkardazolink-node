const sharp = require('sharp');
const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs');
const mime = require('mime-types');
const crypto = require('crypto');
const axios = require('axios');
const chroma = require('chroma-js');
const { DOMParser, XMLSerializer } = require('xmldom');

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

class ImageHandler {
  #cacheDirectory = path.join(__PROJECT_DIR__, 'cache/images');
  #cacheEnabled;
  #cacheKeyImageRequest;
  #isGetImageInfoOnly;
  #sourcePath;

  #imageFilePath;
  #imageFileName;
  #imageSizeBeforeProcessing;
  #imageSizeAfterProcessing;
  #imageWidthHeight;
  #imageFit;
  #imagePaddingPercent;
  #imageBackgroundColor;
  #imagePaddingBackgroundColor;
  #imageRotate;
  #isImageRotateAfterProcessing;
  #imageRotateBackgroundColor;
  #imageGamma;
  #imageBrightness;
  #imageSaturation;
  #imageHUE;
  #imageRatio;
  #imageRatioFit;
  #imageRatioShift;
  #imageBorderRadius;
  
  #version;
  #convetToFromat;
  #convertQuality;
  #watermark;
  #watermarkPosition;
  #watermarkScale;
  #isPlaceWatermarkAfterProcessing;
  #staticURL;

  constructor() {
    !fs.existsSync('./cache/images') && fs.mkdirSync('./cache/images', { recursive: true });
  }

  async queryAssing(sourcePath, request, enabledCache = true, getImageInfoOnly = false) {
    this.#isGetImageInfoOnly = getImageInfoOnly;
    this.#sourcePath = sourcePath;
    this.#imageFilePath = /^(File:|Файл:)/i.test(request.params[0])
      ? request.params[0].replace(/^(File:|Файл:)/i, '')
      : request.params[0];
    this.#imageFileName = /^(File:|Файл:)/i.test(request.params.imageFileName)
      ? request.params.imageFileName.replace(/^(File:|Файл:)/i, '')
      : request.params.imageFileName || null;
    this.#imageSizeBeforeProcessing = request.query.s ? parseInt(request.query.s) : null;
    this.#imageWidthHeight = request.query.wh ? request.query.wh.split('x').map(Number) : null;
    this.#imageFit = request.query.fit || null;
    this.#convetToFromat = request.query.to || null;
    this.#convertQuality = request.query.q ? parseInt(request.query.q) : null;
    this.#imagePaddingPercent = request.query.p ? parseFloat(request.query.p) : 0;
    this.#imageSizeAfterProcessing = request.query.r ? parseInt(request.query.r) : 0;
    this.#imageBackgroundColor = request.query.bg || null;
    this.#imagePaddingBackgroundColor = request.query.pbg || null;
    this.#staticURL = request.url;
    this.#watermark = request.query.water || null;
    this.#watermarkPosition = request.query.pos || null;
    this.#watermarkScale = request.query.ws || null;

    this.#isPlaceWatermarkAfterProcessing = request.query.wpost
      ? (request.query.wpost === 'true' ? true : false)
      : null;
    this.#cacheKeyImageRequest = this.#generateCacheKey(request.url);
    this.#cacheEnabled = enabledCache;

    this.#imageRotate = request.query.rotate
      ? parseInt(request.query.rotate)
      : null;
    
    this.#isImageRotateAfterProcessing = request.query.protate
      ? parseInt(request.query.protate)
      : null;
    
    this.#imageRotateBackgroundColor = request.query.rbg || null;

    this.#imageGamma = request.query.gamma
      ? request.query.gamma.split(',').map(Number)
      : null;
    
    this.#imageBrightness = request.query.brightness
      ? parseFloat(request.query.brightness)
      : null;
    
    this.#imageSaturation = request.query.saturation
      ? parseFloat(request.query.saturation)
      : null;
    
    this.#imageHUE = request.query.hue
      ? parseFloat(request.query.hue)
      : null;
    
    this.#version = request.query.v || null;
    this.#imageRatio = request.query.ratio || null;
    this.#imageRatioFit = request.query.ratioFit || null;
    this.#imageRatioShift = request.query.ratioShift || null;
    this.#imageBorderRadius = request.query.br || null;

    if (this.#imageBackgroundColor) {
      const [r, g, b, alpha] = chroma(this.#imageBackgroundColor).rgba();
      this.#imageBackgroundColor = { r, g, b, alpha };
    }
    if (this.#imagePaddingBackgroundColor) {
      const [r, g, b, alpha] = chroma(this.#imagePaddingBackgroundColor).rgba();
      this.#imagePaddingBackgroundColor = { r, g, b, alpha };
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
        dataBase.get('SELECT * FROM sharedFiles WHERE FileName = ? AND FileType = ?', [this.#imageFileName, 'Image'], async (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(`${this.#imageFilePath || this.#imageFileName} Image Not Found`);

          const imagePath = row.FileLink.startsWith('https://') ? row.FileLink : path.join(this.#sourcePath, row.FileLink);
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
      imagePath = path.join(this.#sourcePath, this.#imageFilePath);
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
        if (this.#isGetImageInfoOnly === true) return { dataBaseInfo: dataBaseInfo || null, cached: true, remoteMetaData: remoteMetaData || null, fileInfo: isCacheExists.fileInfo };
        
        return { mimeType: isCacheExists.mimeType || 'application/octet-stream', imageBuffer: isCacheExists.imageBuffer, dataBaseInfo: dataBaseInfo || null, cached: true, fileInfo: isCacheExists.fileInfo || null, remoteMetaData: remoteMetaData || null };
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
    //if (!/\.\w+$/.test(this.staticUrl)) console.info(`Line of generated, new genearion of cache: ${imagePath}`);
          
    try {
      if (this.#watermark && this.#isPlaceWatermarkAfterProcessing !== true && this.#watermarkPosition) imageBuffer = await this.#setWatermark(imageBuffer);

      let mimeType = mime.lookup(imagePath) || 'application/octet-stream';
      let svgScales;

      if (mimeType.startsWith('image/')) {
        let metadata;

        if (mimeType !== 'image/svg+xml') {
          metadata = await sharp(imageBuffer).metadata();

          if (this.#imageSizeBeforeProcessing) {
            const maxDimension = Math.max(metadata.width, metadata.height);
            const finalSize = this.#imageSizeBeforeProcessing ? Math.min(this.#imageSizeBeforeProcessing, maxDimension) : null;

            if (finalSize && finalSize < maxDimension) {
              imageBuffer = await sharp(imageBuffer).resize(finalSize, finalSize, { withoutEnlargement: true, fit: this.#imageFit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
            }
          } else if (this.#imageWidthHeight) {
            const maxWidth = Math.min(this.#imageWidthHeight[0], metadata.width);
            const maxHeight = Math.min(this.#imageWidthHeight[1], metadata.height);

            imageBuffer = await sharp(imageBuffer).resize(maxWidth, maxHeight, { withoutEnlargement: true, fit: this.#imageFit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
          }
          if (this.#imageRotate) {
            imageBuffer = await sharp(imageBuffer).rotate(this.#imageRotate, { background: this.#imageRotateBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
          }
        } else {
          imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, this.#imageSizeBeforeProcessing), 'utf8');
          svgScales = await this.#checkSVGScale(imageBuffer);
        }

        if (this.#convetToFromat) {
          if (mimeType === 'image/svg+xml' && (svgScales['width'] > 2048 || svgScales['height'] > 2048)) {
            imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, 2048), 'utf8');
          }

          const getConverted = await this.#convertImage(imageBuffer);
          imageBuffer = getConverted.convertedImageBuffer;
          mimeType = getConverted.mimeType;
        }

        if (this.#imagePaddingPercent > 0) {
          imageBuffer = await this.#applyPadding(imageBuffer);
        }

        if (this.#imageSizeAfterProcessing) {
          if (!isNaN(this.resolution) && this.resolution > 0) {
            imageBuffer = await sharp(imageBuffer).resize(this.#imageSizeAfterProcessing, this.#imageSizeAfterProcessing, { withoutEnlargement: true,  fit: 'inside' }).toBuffer();
          }
        }
        
        if (this.#watermark && this.#isPlaceWatermarkAfterProcessing === true && this.#watermarkPosition) imageBuffer = await this.#setWatermark(imageBuffer);

        if (this.#imageBackgroundColor) {
          if (mimeType !== 'image/svg+xml') {
            const afterScaleMeta = await sharp(imageBuffer).metadata();
            let backgroundImage = await sharp({ create: { width: afterScaleMeta.width, height: afterScaleMeta.height, channels: 4, background: this.#imageBackgroundColor } }).webp().toBuffer();

            imageBuffer = await sharp(backgroundImage).composite([{ input: imageBuffer }]).toBuffer();
          } else {
            imageBuffer = Buffer.from(await this.#createSVGBackground(imageBuffer, this.#imageBackgroundColor), 'utf8');
          }
        }

        if (this.#isImageRotateAfterProcessing) {
          imageBuffer = await sharp(imageBuffer).rotate(this.#imageRotate, { background: this.#imageRotateBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
        }

        if (this.#imageGamma || this.#imageBrightness || this.#imageSaturation || this.#imageHUE) {
          const options = {};
          if (this.#imageBrightness) options.brightness = this.#imageBrightness;
          if (this.#imageSaturation) options.saturation = this.#imageSaturation;
          if (this.#imageHUE) options.hue = this.#imageHUE;

          imageBuffer = await sharp(imageBuffer).modulate(options).gamma(this.#imageGamma[0], this.#imageGamma[1]).toBuffer();
        }

        if (this.#imageBorderRadius) {
          const borderRadiusValue = this.#imageBorderRadius.trim();
          let radiusInPixels;

          if (borderRadiusValue.endsWith('px')) {
            radiusInPixels = parseInt(borderRadiusValue.slice(0, -2), 10);
          } else if (borderRadiusValue.endsWith('perc')) {
            const radiusPercent = parseFloat(borderRadiusValue.slice(0, -4));
            const metadata = await sharp(imageBuffer).metadata();
            const minDimension = Math.min(metadata.width, metadata.height);
            radiusInPixels = Math.floor((radiusPercent / 100) * minDimension);
          } else {
            throw new Error(`Invalid borderRadius value: ${this.#imageBorderRadius}`);
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
            .toFormat(this.#convetToFromat ?? 'webp', { quality: this.#convertQuality || 75 })
            .toBuffer();
        }

        if (this.#imageRatio) {
          imageBuffer = await this.#applyRatio(imageBuffer);
        }


        if (this.#staticURL.includes('?') && imageBuffer.length <= serverConfig.cache.maxCachedImageSize) {
          const cachedName = `${this.#cacheKeyImageRequest}-${this.#generateCacheKey(mimeType.slice(6))}`;
          this.#cacheEnabled === true && await this.#saveToCache(imageBuffer, cachedName);
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

  async #setWatermark(imageBuffer) {
    let watermak = await fsPromises.readFile(path.join(this.#sourcePath, `static/public/resource/images/${this.#watermark}.svg`));
    let gravity;

    switch (this.#watermarkPosition) {
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
        
    watermak = await sharp(watermak).toFormat('png').resize((this.#watermarkScale * 100) || null, (this.#watermarkScale * 100) || null, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    imageBuffer = await sharp(imageBuffer).composite([{ input: watermak, gravity: gravity, blend: 'overlay' }]).toBuffer();

    return imageBuffer;
  }

  async #checkCache() {
    const fileMimes = ['apng', 'png', 'svg+xml', 'webp', 'jpeg', 'gif', 'avif', 'tiff', 'bmp', 'ico'];
    const files = await fsPromises.readdir(this.#cacheDirectory);

    for (const file of files) {
      if (file.startsWith(this.#cacheKeyImageRequest)) {
        const mimeTypePart = file.split('-')[1];

        for (const type of fileMimes) {
          if (mimeTypePart === this.#generateCacheKey(type)) {
            const mimeType = `image/${type}`;
            const filePath = path.join(this.#cacheDirectory, file);

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
    const cachePath = path.join(this.#cacheDirectory, cachadName);

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
      const files = await fsPromises.readdir(this.#cacheDirectory);
      let totalSize = 0;

      const fileSizes = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.#cacheDirectory, file);
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

    switch (this.#convetToFromat.toLowerCase()) {
      case 'webp':
        convertedImageBuffer = await sharp(imageBuffer).webp({ quality: this.#convertQuality || 75 }).toBuffer();
        mimeType = 'image/webp';
        break;
      case 'avif':
        convertedImageBuffer = await sharp(imageBuffer).avif({ quality: this.#convertQuality || 75, chromaSubsampling: '4:2:0' }).toBuffer();
        mimeType = 'image/avif';
        break;
      case 'gif':
        convertedImageBuffer = await sharp(imageBuffer).gif().toBuffer();
        mimeType = 'image/gif';
        break;
      case 'png':
        convertedImageBuffer = await sharp(imageBuffer).png().toBuffer();
        mimeType = 'image/png';
        break;
      case 'jpeg':
      case 'jpg':
        convertedImageBuffer = await sharp(imageBuffer).jpeg({ quality: this.#convertQuality || 75 }).toBuffer();
        mimeType = 'image/jpeg';
        break;
      case 'tiff':
        convertedImageBuffer = await sharp(imageBuffer).tiff({ quality: this.#convertQuality || 75 }).toBuffer();
        mimeType = 'image/tiff';
        break;
        
      default:
        return `Unsupported format: ${this.#convetToFromat}`;
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
  
    const paddingSize = Math.floor(Math.max(originalWidth, originalHeight) * this.#imagePaddingPercent / 100);
  
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
        background: this.#imagePaddingBackgroundColor || { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    return resizedImageBuffer;
  }

  async #applyRatio(imageBuffer) {
    const [ratioWidth, ratioHeight] = this.#imageRatio.split(':').map(Number);
    if (!ratioWidth || !ratioHeight) return imageBuffer;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    const targetRatio = ratioWidth / ratioHeight;
    const currentRatio = originalWidth / originalHeight;

    let newWidth, newHeight;

    if (this.#imageRatioFit === 'cover') {
      if (targetRatio > currentRatio) {
        newWidth = originalWidth;
        newHeight = Math.round(originalWidth / targetRatio);
      } else {
        newWidth = Math.round(originalHeight * targetRatio);
        newHeight = originalHeight;
      }
    } else if (this.#imageRatioFit === 'contain') {
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


module.exports = { ImageHandler, ImageCacheCleaner };