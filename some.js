const BSON = require('bson');
const fs = require('fs');

// Read the JSON file
const jsonData = fs.readFileSync('package.json', 'utf8');

// Parse the JSON data
const jsonObject = JSON.parse(jsonData);

// Convert JSON object to BSON
const bsonData = BSON.serialize(jsonObject);

// Write the BSON data to a file
fs.writeFileSync('output.bson', bsonData);