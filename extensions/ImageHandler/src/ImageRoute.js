const express = require('express');
const { Worker } = require('worker_threads');
const path = require('path');

const imageRouter = express.Router();

async function processImage(request, response, next, localFile = false, cacheEnabled) {
  const isFileTypeValid = serverConfig.allowedFileTypes.images.includes(path.extname(request.path));
  if (isFileTypeValid) {
    try {
      const worker = new Worker(path.resolve(__dirname, './ImageTask.js'));
      const workerRequest = { query: request.query ?? {}, params: request.params ?? {}, url: request.url };
      const messageData = { __PROJECT_DIR__, serverConfig, workerRequest };

      messageData.localFile = localFile;
      messageData.cacheEnabled = cacheEnabled ?? serverConfig.cache.enabled;

      worker.postMessage(messageData);

      worker.on('message', (message) => {
        if (message.error) {
          const error = new Error(message.error);
          //error.status = 404;
          console.log(error);
          next(error);
        } else {
          const imageInstance = Buffer.from(message.imageInstance);
          if (message.fileSource !== null) {
            let encodedFileSource = message.fileSource;
            encodedFileSource = encodedFileSource.replace(/[^a-zA-Z0-9+\/\\\.\-\:]+/g, (match) => encodeURIComponent(match));
            
            response.setHeader('Original-File-Source', encodedFileSource);

          }
          response.contentType(message.mimeType);
          response.send(imageInstance);
        }
      });

      worker.on('error', (error) => {
        console.error('Error processing image:', error);
        next(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      next(error);
    }
  }
  else next();
}

imageRouter.get('/local/images/*', async (request, response, next) => await processImage(request, response, next, true));
imageRouter.get('/local/images/nocache/*', async (request, response, next) => await processImage(request, response, next, true, false));
imageRouter.get('/shared/images/:imageFileName', async (request, response, next) => await processImage(request, response, next));
imageRouter.get('/shared/images/nocache/:imageFileName', async (request, response, next) => await processImage(request, response, next, false, false));

module.exports = { imageRouter };
