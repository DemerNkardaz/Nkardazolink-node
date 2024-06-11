const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class SessionManager {

  constructor(sourcePath) {
    if (!process.env.API_SESSIONS) throw new Error('API_SESSIONS environment variable is not set!');
    else if (process.env.API_SESSIONS.length !== 32) throw new Error('API_SESSIONS environment variable is not valid!');
    this.sourcePath = sourcePath;
    this.checkSessionFile();
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }

  async checkSessionFile() {
    if (!fs.existsSync(path.join(this.sourcePath, 'static/sessions.json'))) {
      await writeFile(path.join(this.sourcePath, 'static/sessions.json'), this.#encryptSessions({ sessions: [] }), 'utf-8');
      await writeFile(path.join(this.sourcePath, 'static/sessions.cryptoless.json'), JSON.stringify({ sessions: [] }), 'utf-8');
    }
  }

  async writeSession(sessionID, settings) {
    if (sessionID !== undefined && settings !== null) {
      const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
      let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'utf-8')));
      let writeMessage = true;

      const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sessionID);

      if (existingSessionIndex !== -1) {
        sessionsJSON.sessions[existingSessionIndex] = { sessionID: sessionID, settings: settings };
        writeMessage = false;
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

      const isValidLength = checkKeyValueMaxLength(settings) && sessionID.length == 40;

      if (isValidLength) {
        await writeFile(sessionsPath, this.#encryptSessions(sessionsJSON), 'utf-8');
        await writeFile(path.join(this.sourcePath, 'static/sessions.cryptoless.json'), JSON.stringify(sessionsJSON), 'utf-8');
        writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Session ${sessionID} has been written\x1b[39m`);
        return true;
      }
    }
    return false;
  }

  async readSession(sessionID) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
    let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'utf-8')));
    return sessionsJSON.sessions.find(session => session.sessionID === sessionID);
  }

  async getSettings(sessionID, settingName) {
    const session = await this.readSession(sessionID);
    if (session !== undefined && session !== null) {
      if (settingName === undefined) {
        return session.settings;
      } else {
        const keys = settingName.split('.');
        let currentObject = session.settings;
        for (const key of keys) {
          if (!currentObject || typeof currentObject !== 'object' || !currentObject.hasOwnProperty(key)) {
            return;
          }
          currentObject = currentObject[key];
        }
        if (currentObject !== undefined) {
          return currentObject;
        }
      }
    }
    return;
  }

  #encryptSessions(data) {
    const IV = Buffer.from(process.env.SESSION_IV, 'hex');
    const KEY = Buffer.from(process.env.API_SESSIONS);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
    let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  #decryptSessions(data) {
    const IV = Buffer.from(process.env.SESSION_IV, 'hex');
    const KEY = Buffer.from(process.env.API_SESSIONS);
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    let decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

}

module.exports = { SessionManager };
