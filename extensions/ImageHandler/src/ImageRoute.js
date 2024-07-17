const express = require('express');
const { Worker } = require('worker_threads');
const path = require('path');

const imageRouter = express.Router();

imageRouter.get('/local/images/*', async (request, response, next) => {
  try {
    const worker = new Worker(path.resolve(__dirname, './ImageTask.js'));
    const workerRequest = { query: request.query ?? {}, params: request.params ?? {}, url: request.url };
    worker.postMessage({ __PROJECT_DIR__, serverConfig, workerRequest, localFile: true });

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
});


imageRouter.get('/shared/images/:imageFileName', async (request, response, next) => {
  try {
    const worker = new Worker(path.resolve(__dirname, './ImageTask.js'));
    const workerRequest = { query: request.query ?? {}, params: request.params ?? {}, url: request.url };
    worker.postMessage({ __PROJECT_DIR__, serverConfig, workerRequest });

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
});

module.exports = { imageRouter };