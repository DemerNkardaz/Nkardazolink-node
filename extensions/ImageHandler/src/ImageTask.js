const path = require('path');
const sqlite3 = require("sqlite3").verbose();
const { parentPort } = require('worker_threads');
const { ImageHandler } = require('./ImageHandler');


parentPort.on('message', async (data) => {
  try {
    global.__PROJECT_DIR__ = data.__PROJECT_DIR__;
    global.serverConfig = data.serverConfig;

    const sharedAssetsDB = data.localFile !== true
      ? new sqlite3.Database(path.join(serverConfig.paths.root, 'static/data_base/sharedAssets.db')) : null;
    const imageRootPath = data.localFile !== true ? serverConfig.paths.shared : serverConfig.paths.local;

    const requestedImageHandler = await new ImageHandler()
      .queryAssing(imageRootPath, data.workerRequest, data.cacheEnabled);
    const requestedImageResult = await requestedImageHandler.getImage(sharedAssetsDB);

    if (typeof requestedImageResult === 'string') parentPort.postMessage({ error: requestedImageResult });
    else parentPort.postMessage({ mimeType: requestedImageResult.mimeType, imageBuffer: requestedImageResult.imageBuffer, fileSource: requestedImageResult.dataBaseInfo?.FileLink || null });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
    console.log(error);
  }
});