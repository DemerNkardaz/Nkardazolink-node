const express = require('express');
const { Worker } = require('worker_threads');
const path = require('path');

const imageRouter = express.Router();

async function processImage(request, response, next, localFile = false) {
  try {
    const worker = new Worker(path.resolve(__dirname, './ImageTask.js'));
    const workerRequest = { query: request.query ?? {}, params: request.params ?? {}, url: request.url };
    const messageData = { __PROJECT_DIR__, serverConfig, workerRequest };

    if (localFile) messageData.localFile = true;

    worker.postMessage(messageData);

    worker.on('message', (message) => {
      if (message.error) {
        const error = new Error(message.error);
        error.status = 404;
        next(error);
      } else {
        const imageBuffer = Buffer.from(message.imageBuffer);
        response.contentType(message.mimeType);
        response.send(imageBuffer);
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

imageRouter.get('/local/images/*', async (request, response, next) => await processImage(request, response, next, true));
imageRouter.get('/shared/images/:imageFileName', async (request, response, next) => await processImage(request, response, next));

module.exports = { imageRouter };
