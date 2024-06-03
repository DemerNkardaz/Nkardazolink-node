const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

async function DataExtend(dataArray, rootDir) {
    for (const item of dataArray) {
        const filePath = path.resolve(rootDir, item.source);
        const extension = path.extname(filePath);
        const variableName = item.as;

        try {
            let data;
            if (extension === '.json') {
                data = require(filePath);
            } else if (extension === '.yaml' || extension === '.yml') {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                data = yaml.load(fileContent);
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

            parent[parts[parts.length - 1]] = data;

            console.log(`Loaded ${extension.toUpperCase()} file from ${filePath} as '${variableName}'`);
        } catch (err) {
            console.error(`Error loading file ${filePath}: ${err.message}`);
        }
    }
}
module.exports = { DataExtend };