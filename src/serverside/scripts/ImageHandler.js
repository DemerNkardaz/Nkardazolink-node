const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises; // Изменено для использования промисов с файловой системой
const mime = require('mime-types');
const crypto = require('crypto');
const axios = require('axios');
const { DOMParser, XMLSerializer } = require('xmldom');


class ImageCacheCleaner {
  constructor(intervalStr) {
    this.cacheDir = path.join(__PROJECT_DIR__, 'cache/images');
    this.interval = this.#parseInterval(intervalStr || '7d');
    console.log(`\x1b[32m[${new Date().toLocaleString().replace(',', '')}] :: 💠 > [IMAGE HANDLER] :: Cache cleaner initialized and checking [cache/images] every ${intervalStr || '7d'}\x1b[39m`);
    setInterval(() => this.#removeOutdatedCache(), this.interval);
  }

  #parseInterval(intervalStr) {
    const match = intervalStr.match(/^(\d+)([shdwmy])$/);
    if (!match) {
      throw new Error('Invalid interval string. Valid examples: "1h", "7d", "2w", "9m", "10y"');
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'm':
        return value * 30 * 24 * 60 * 60 * 1000;
      case 'y':
        return value * 365 * 24 * 60 * 60 * 1000;
      default:
        throw new Error('Invalid interval unit. Valid units: "h", "d", "w", "m", "y"');
    }
  }

  async #removeOutdatedCache() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime < oneWeekAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error(`Ошибка при очистке кэша: ${error.message}`);
    }
  }
}

class ImageHandler {
  constructor(sourcePath, request, disableCache = false) {
    this.sourcePath = sourcePath;
    this.cacheDir = path.join(__PROJECT_DIR__, 'cache/images');
    this.filePath = /^(File:|Файл:)/i.test(request.params[0]) ? request.params[0].replace(/^(File:|Файл:)/i, '') : request.params[0];
    this.imageFileName = /^(File:|Файл:)/i.test(request.params.imageFileName) ? request.params.imageFileName.replace(/^(File:|Файл:)/i, '') : request.params.imageFileName || null;
    [this.size, this.wh, this.fit, this.toFormat, this.quality, this.paddingPercent, this.resolution, this.staticUrl, this.watermark, this.watermarkPos, this.watermarkScale, this.postMark] = [
      request.query.s ? parseInt(request.query.s) : null,
      request.query.wh ? request.query.wh.split('x').map(Number) : null,
      request.query.fit || null,
      request.query.to || null,
      request.query.q ? parseInt(request.query.q) : null,
      request.query.p ? parseFloat(request.query.p) : 0,
      request.query.r ? parseInt(request.query.r) : 0,
      request.url,
      request.query.water || null,
      request.query.pos || null,
      request.query.ws || null,
      request.query.wpost ? Boolean(request.query.wpost) : null
    ];
    this.cacheKey = this.#generateCacheKey(this.staticUrl);
    this.disableCache = disableCache;
    (async () => await this.#manageCacheSize())();
  }
  #generateCacheKey(keyString) {
    return crypto.createHash('md5').update(keyString).digest('hex');
  }


  async getImage(dataBase) {
    console.log(this.imageFileName)
    let imagePath;
    if (dataBase) {
      return new Promise((resolve, reject) => {
        dataBase.get('SELECT * FROM sharedFiles WHERE FileName = ? AND FileType = ?', [this.imageFileName, 'Image'], async (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(`${this.filePath || this.imageFileName} Image Not Found`);
          const imagePath = row.FileLink.startsWith('https://') ? row.FileLink : path.join(this.sourcePath, row.FileLink);
          try {
            const result = await this.#readAndHandleImage(imagePath, row);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      imagePath = path.join(this.sourcePath, this.filePath);
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
    try {
      if (!imagePath.startsWith('https://')) imageBuffer = await fs.readFile(imagePath);
      else {
        const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        return `File Not Found: ${imagePath}`;
      }
      throw err;
    }

    const isCacheExists = await this.#checkCache();
    if (isCacheExists && isCacheExists.mimeType && isCacheExists.imageBuffer) {
      try {
        console.info(`Line of cached, loaded from cache: ${imagePath}`);
        return { mimeType: isCacheExists.mimeType, imageBuffer: isCacheExists.imageBuffer, dataBaseInfo: dataBaseInfo || null, cached: true };
      } catch (error) {
        return `Error: ${error.message}`;
      }
    }
    if (!/\.\w+$/.test(this.staticUrl)) console.info(`Line of generated, new genearion of cache: ${imagePath}`);
          
    try {
      if (this.watermark && this.postMark !== true && this.watermarkPos) imageBuffer = await this.#watermark(imageBuffer);

      let mimeType = mime.lookup(imagePath) || 'application/octet-stream';
      let svgScales;

      if (mimeType.startsWith('image/')) {
        let metadata;
        if (mimeType !== 'image/svg+xml') {
          metadata = await sharp(imageBuffer).metadata();
          if (this.size) {
            const maxDimension = Math.max(metadata.width, metadata.height);
            const finalSize = this.size ? Math.min(this.size, maxDimension) : null;

            if (finalSize && finalSize < maxDimension) {
              imageBuffer = await sharp(imageBuffer).resize(finalSize, finalSize, { withoutEnlargement: true, fit: this.fit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
            }
          } else if (this.wh) {
            const maxWidth = Math.min(this.wh[0], metadata.width);
            const maxHeight = Math.min(this.wh[1], metadata.height);
            imageBuffer = await sharp(imageBuffer).resize(maxWidth, maxHeight, { withoutEnlargement: true, fit: this.fit || 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();

          }
        } else {
          imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, this.size), 'utf8');
          svgScales = await this.#checkSVGScale(imageBuffer);
        }

        if (this.toFormat) {
          if (mimeType === 'image/svg+xml' && (svgScales['width'] > 2048 || svgScales['height'] > 2048)) {
            imageBuffer = Buffer.from(await this.#rescaleSVG(imageBuffer, 2048), 'utf8');
          }

          const getConverted = await this.#convertImage(imageBuffer);
          imageBuffer = getConverted.convertedImageBuffer;
          mimeType = getConverted.mimeType;
        }

        if (this.paddingPercent > 0) {
          imageBuffer = await this.#applyPadding(imageBuffer);
        }

        if (this.resolution) {
          if (!isNaN(this.resolution) && this.resolution > 0) {
            imageBuffer = await sharp(imageBuffer).resize(this.resolution, this.resolution, { withoutEnlargement: true,  fit: 'inside' }).toBuffer();
          }
        }
        
        if (this.watermark && this.postMark === true && this.watermarkPos) imageBuffer = await this.#watermark(imageBuffer);

        if (this.staticUrl.includes('?') && imageBuffer.length <= 1 * 1024 * 1024) {
          const cachedName = `${this.cacheKey}-${this.#generateCacheKey(mimeType.slice(6))}`;
          this.disableCache !== true && await this.#saveToCache(imageBuffer, cachedName);
        }

        return { imageBuffer, mimeType, dataBaseInfo };
      } else {
        return `File is not an image: ${imagePath}`;
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async #watermark(imageBuffer) {
    let watermak = await fs.readFile(path.join(this.sourcePath, `static/public/resource/images/${this.watermark}.svg`));
    let gravity;

    switch (this.watermarkPos) {
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
        
    watermak = await sharp(watermak).toFormat('png').resize((this.watermarkScale * 100) || null, (this.watermarkScale * 100) || null, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    imageBuffer = await sharp(imageBuffer).composite([{ input: watermak, gravity: gravity, blend: 'overlay' }]).toBuffer();
    return imageBuffer;
  }

  async #checkCache() {
    const fileMimes = ['apng', 'png', 'svg+xml', 'webp', 'jpeg', 'gif', 'avif', 'tiff', 'bmp', 'ico'];
    const files = await fs.readdir(this.cacheDir);

    for (const file of files) {
      if (file.startsWith(this.cacheKey)) {
        const mimeTypePart = file.split('-')[1];
        for (const type of fileMimes) {
          if (mimeTypePart === this.#generateCacheKey(type)) {
            const mimeType = `image/${type}`;
            const filePath = path.join(this.cacheDir, file);

            try {
              const cachedBuffer = await fs.readFile(filePath);
            
              const now = new Date();
              await fs.utimes(filePath, now, now);

              return { imageBuffer: cachedBuffer, mimeType };
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
    const cachePath = path.join(this.cacheDir, cachadName);
    try {
      await fs.writeFile(cachePath, imageBuffer);
      await this.#manageCacheSize();
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }


  async #manageCacheSize() {
    const maxCacheSize = 1 * 1024 * 1024 * 1024;
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      const fileSizes = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.cacheDir, file);
          const stat = await fs.stat(filePath);
          totalSize += stat.size;
          return { filePath, size: stat.size, mtime: stat.mtime };
        })
      );

      if (totalSize > maxCacheSize) {
        const sortedFiles = fileSizes.sort((a, b) => a.mtime - b.mtime);
        for (const file of sortedFiles) {
          await fs.unlink(file.filePath);
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
    switch (this.toFormat.toLowerCase()) {
      case 'webp':
        convertedImageBuffer = await sharp(imageBuffer).webp({ quality: this.quality || 75 }).toBuffer();
        mimeType = 'image/webp';
        break;
      case 'avif':
        convertedImageBuffer = await sharp(imageBuffer).avif({ quality: this.quality || 75, chromaSubsampling: '4:2:0' }).toBuffer();
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
      case 'jpg':
        convertedImageBuffer = await sharp(imageBuffer).jpeg({ quality: this.quality || 75 }).toBuffer();
        mimeType = 'image/jpeg';
        break;
      case 'tiff':
        convertedImageBuffer = await sharp(imageBuffer).tiff({ quality: this.quality || 75 }).toBuffer();
        mimeType = 'image/tiff';
        break;
        
      default:
        return `Unsupported format: ${this.toFormat}`;
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

  async #applyPadding(imageBuffer, ) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
  
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
  
    const paddingSize = Math.floor(Math.max(originalWidth, originalHeight) * this.paddingPercent / 100);
  
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
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer();

    return resizedImageBuffer;
  }
}


module.exports = { ImageHandler, ImageCacheCleaner };