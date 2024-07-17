const { parentPort } = require('worker_threads');
const path = require('path');
const { ImageHandler } = require('./ImageHandler');
const sqlite3 = require("sqlite3").verbose();


parentPort.on('message', async (data) => {
  try {
    global.__PROJECT_DIR__ = data.__PROJECT_DIR__;
    global.serverConfig = data.serverConfig;

    if (data.localFile === true) {
      const localFilesImageHandler = await new ImageHandler()
      .queryAssing(path.join(__PROJECT_DIR__, 'static/public/resource/images'), data.workerRequest, serverConfig.cache.enabled);
      const localFilesImageResult = await localFilesImageHandler.getImage();

      if (typeof localFilesImageResult === 'string') parentPort.postMessage({ error: localFilesImageResult });
      else parentPort.postMessage({ mimeType: localFilesImageResult.mimeType, imageBuffer: localFilesImageResult.imageBuffer });

    } else {
      const sharedAssetsDB = new sqlite3.Database(path.join(__PROJECT_DIR__, 'static/data_base/sharedAssets.db'));

      const requestImageHandler = await new ImageHandler()
        .queryAssing(__PROJECT_DIR__, data.workerRequest, serverConfig.cache.enabled);
      const requestImageResult = await requestImageHandler.getImage(sharedAssetsDB);

      if (typeof requestImageResult === 'string') parentPort.postMessage({ error: requestImageResult });
      else parentPort.postMessage({ mimeType: requestImageResult.mimeType, imageBuffer: requestImageResult.imageBuffer });
    }
  } catch (error) {
    parentPort.postMessage({ error: error.message });
    console.log(error);
  }
});