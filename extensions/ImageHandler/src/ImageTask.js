const path = require('path');
const sqlite3 = require("sqlite3").verbose();
const { parentPort } = require('worker_threads');
const { ImageHandler } = require('./ImageHandler');


parentPort.on('message', async (data) => {
  try {
    global.__PROJECT_DIR__ = data.__PROJECT_DIR__;
    global.serverConfig = data.serverConfig;

    const sharedAssetsDB = data.localFile !== true
      ? new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/sharedAssets.db')) : null;
    const imageRootPath = data.localFile !== true ? __PROJECT_DIR__ : path.join(__PROJECT_DIR__, 'static/public/resource/images');

    const requestedImageHandler = await new ImageHandler()
      .queryAssing(imageRootPath, data.workerRequest, serverConfig.cache.enabled);
    const requestedImageResult = await requestedImageHandler.getImage(sharedAssetsDB);

    if (typeof requestedImageResult === 'string') parentPort.postMessage({ error: requestedImageResult });
    else parentPort.postMessage({ mimeType: requestedImageResult.mimeType, imageBuffer: requestedImageResult.imageBuffer });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
    console.log(error);
  }
});