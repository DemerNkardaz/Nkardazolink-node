const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { DOMParser, XMLSerializer } = require('xmldom');



class ImageHandler {

  constructor(sourcePath, dataBase, request) {
    [this.filePath, this.imageFileName, this.size, this.toFormat, this.quality, this.paddingPercent] = [
      request.params[0],
      req.params.imageFileName || null,
      req.query.s ? parseInt(req.query.s) : null,
      request.query.to || null,
      req.query.q ? parseInt(req.query.q) : null,
      req.query.p ? parseFloat(req.query.p) : 0
    ];
  }


}