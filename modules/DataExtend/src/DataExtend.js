const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DataExtend {
  constructor(dataArray, rootDir) {
    this.dataArray = dataArray;
    this.rootDir = rootDir;
    this.fs = fs;
    this.path = path;
    this.yaml = yaml;

    this.extendData();
  }

  async extendData() {
    for (const item of this.dataArray) {
      const filePath = this.path.resolve(this.rootDir, item.source);
      const extension = this.path.extname(filePath);
      const variableName = item.as;
      
      try {
        let data;
        if (extension === '.json') {
          data = require(filePath);
        } else if (extension === '.yaml' || extension === '.yml') {
          const fileContent = this.fs.readFileSync(filePath, 'utf8');
          data = this.yaml.load(fileContent);
        } else {
          throw new Error('Unsupported file extension');
        }
  
        const parts = variableName.split('.');
        let parent = global;
  
        for (let i = 0; i < parts.length - 1; i++) {
          if (!parent[parts[i]]) {
            parent[parts[i]] = {};
          }
          parent = parent[parts[i]];
        }
  
        if (!parent[parts[parts.length - 1]]) {
          parent[parts[parts.length - 1]] = {};
        }
  
        this.#deepMerge(parent[parts[parts.length - 1]], data);
  
        console.log(`\x1b[33m[${new Date().toLocaleString().replace(',', '')}] :: 🟨 > [DATA-EXTEND] :: [${extension.toUpperCase()}] from [${filePath}] now as “${variableName}”\x1b[39m`);
      } catch (err) {
        console.error(`Error loading file ${filePath}: ${err.message}`);
      }
    }
  }

  #deepMerge(target, source) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          if (!target[key]) {
            target[key] = {};
          }
          this.#deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}

module.exports = { DataExtend };
