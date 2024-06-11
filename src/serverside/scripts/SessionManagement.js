const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


class SessionManager {

  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    this.checkSessionFile();
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }

  async checkSessionFile() {
    if (!fs.existsSync(path.join(this.sourcePath, 'static/sessions.json'))) {
      await writeFile(path.join(this.sourcePath, 'static/sessions.json'), JSON.stringify({ sessions: [] }), 'utf-8');
    }
  }

  async writeSession(sessionID, settings) {
    if (sessionID !== undefined && settings !== null) {
      const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
      let sessionsJSON = JSON.parse(await readFile(sessionsPath, 'utf-8'));

      const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sessionID);

      if (existingSessionIndex !== -1) {
        sessionsJSON.sessions[existingSessionIndex] = { sessionID: sessionID, settings: settings };
      } else {
        sessionsJSON.sessions.push({ sessionID: sessionID, settings: settings });
      }

      function checkKeyValueMaxLength(object) {
        return Object.keys(object).every(key => {
          const value = object[key];
          if (typeof value === 'object') {
            return Object.keys(value).every(nestedKey => value[nestedKey].length <= 4096);
          } else if (typeof value === 'string') {
            return value.length <= 128;
          }
          return false;
        });
      }

      const isValidLength = checkKeyValueMaxLength(settings) && sessionID.length <= 32;

      if (isValidLength) {
        await writeFile(sessionsPath, JSON.stringify(sessionsJSON), 'utf-8');
        console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Session ${sessionID} has been written\x1b[39m`);
        return true;
      }
    }
    return false;
  }

  async readSession(sessionID) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
    let sessionsJSON = JSON.parse(await readFile(sessionsPath, 'utf-8'));
    return sessionsJSON.sessions.find(session => session.sessionID === sessionID);
  }
}

module.exports = { SessionManager };