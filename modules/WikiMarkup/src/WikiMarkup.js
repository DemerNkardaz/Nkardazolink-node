const fs = require('fs').promises;
const path = require('path');
const { DOMParser } = require('xmldom');


class WikiMarkup {
  constructor(options) {
    Object.assign(this, {
      linkify: options.linkify || false,
    });

  }

  async render(text) {
    try {

    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      return text;
    }
  }

  async renderFile(filePath, data) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    try {

    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      return fileContent;
    }
  }
}


module.exports = { WikiMarkup }