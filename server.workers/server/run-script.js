const { execSync } = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const yamlPath = path.join(__dirname, '..', '..', 'scripts.yml');
const config = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

const command = process.argv[2];
if (command && command in config) {
  const steps = config[command];
  steps.forEach(step => {
    console.log(`${step.label}...`);
    const commands = step.command.split('\n');
    commands.forEach(command => {
      console.log(`[${new Date().toLocaleString().replace(',', '')}] :: % EXEC % > ${command}`);
      command !== '' && execSync(command.trim(), { stdio: 'inherit' });
    });
  });
} else {
  console.error(`Invalid command: ${command}`);
}