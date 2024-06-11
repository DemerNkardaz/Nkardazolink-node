const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const { Mutex } = require('async-mutex');
const sessionMutex = new Mutex();

class SessionManager {

  constructor(sourcePath) {
    if (!process.env.API_SESSIONS) throw new Error('API_SESSIONS environment variable is not set!');
    else if (process.env.API_SESSIONS.length !== 32) throw new Error('API_SESSIONS environment variable is not valid!');
    this.sourcePath = sourcePath;
    this.checkSessionFile();
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }

  async checkSessionFile() {
    //if (!fs.existsSync(path.join(this.sourcePath, 'static/sessions.json'))) {
    //  await writeFile(path.join(this.sourcePath, 'static/sessions.json'), this.#encryptSessions({ sessions: [] }), 'utf-8');
    //  await writeFile(path.join(this.sourcePath, 'static/sessions.cryptoless.json'), JSON.stringify({ sessions: [] }), 'utf-8');
    //}
    if (!fs.existsSync(path.join(this.sourcePath, 'static/sessions.bdb'))) {
      const encryptedRoot = this.#encryptSessions({ sessions: [] });
      const encryptedBuffer = Buffer.from(encryptedRoot, 'hex');
      await writeFile(path.join(this.sourcePath, 'static/sessions.bdb'), encryptedBuffer, { flag: 'w' });
    }
  }

  async writeSession(sessionID, settings, authorize = {}) {
    const release = await sessionMutex.acquire();
    try {
      if (sessionID !== undefined && settings !== null) {
        const sessionsPath = path.join(this.sourcePath, 'static/sessions.bdb');
        let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'hex')));
        let writeMessage = true;

        const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sessionID);

        if (existingSessionIndex !== -1) {
          sessionsJSON.sessions[existingSessionIndex] = { sessionID: sessionID, settings: settings, ...authorize };
          writeMessage = false;
        } else {
          sessionsJSON.sessions.push({ sessionID: sessionID, settings: settings, ...authorize });
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
          const contentBuffer = Buffer.from(this.#encryptSessions(sessionsJSON), 'hex');
          await writeFile(sessionsPath, contentBuffer, { flag: 'w' });
          writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Session ${sessionID} has been written\x1b[39m`);
          return true;
        }
      }
      return false;
    } finally {
      release();
    }
  }

  async readSession(sessionID = null, login = null) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.bdb');
    let sessionsJSON = await JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'hex')));
    return await sessionsJSON.sessions.find(session => (session.login && session.login === login) || (session.sessionID === sessionID));
  }

  async registration(sessionID = null, login, pass, email, userPlatform) {
    const session = await this.readSession(sessionID, login);
    if (session && session.login && session.pass) {
      await this.authorization(login, pass, email);
    } else {
      const userID = await this.#generateUserID();
      const encryptedLogin = this.#encryptString(login, ['API_LOGINS', 'LOGINS_IV']);
      const encryptedPass = this.#encryptString(pass, ['API_PASSWORDS', 'PASSWORDS_IV']);
      const encryptedEmail = email ? this.#encryptString(email, ['API_EMAILS', 'EMAILS_IV']) : null;
      const encryptedPlatform = userPlatform ? this.#encryptString(userPlatform, ['API_USERMETA', 'USERMETA_IV']) : null;
      console.log(userPlatform, encryptedPlatform);
      const registeredSession = {
        login: encryptedLogin,
        pass: encryptedPass,
        email: encryptedEmail,
        userID: userID,
        userPlatform: encryptedPlatform
      };

      await this.writeSession(sessionID, session.settings, registeredSession);
      console.log(await this.readSession(sessionID));
      }
  }

  async authorization(login, pass, email) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.bdb');
    let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'hex')));
    
    for (const session of sessionsJSON.sessions) {
      if (session && session.login && session.pass) {
        console.log(await sessionsJSON);
        const decryptedLogin = this.#decryptString(session.login, ['API_LOGINS', 'LOGINS_IV']);
        const decryptedPass = this.#decryptString(session.pass, ['API_PASSWORDS', 'PASSWORDS_IV']);
        const decryptedEmail = session.email ? this.#decryptString(session.email, ['API_EMAILS', 'EMAILS_IV']) : null;
        const decryptedPlatform = session.userPlatform ? this.#decryptString(session.userPlatform, ['API_USERMETA', 'USERMETA_IV']) : null;
        console.log(decryptedLogin, decryptedEmail, decryptedPass, decryptedPlatform);

        if ((decryptedLogin === login || decryptedEmail === email) && decryptedPass === pass) {
          return { sessionID: session.sessionID, userID: session.userID };
        }
      }
    }

    return null;
  }

  #encryptString(string, token = []) {
    const IV = Buffer.from(process.env[`${token[1]}`], 'hex');
    const KEY = Buffer.from(process.env[`${token[0]}`]);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
    let encrypted = cipher.update(string, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  #decryptString(string, token = []) {
    const IV = Buffer.from(process.env[`${token[1]}`], 'hex');
    const KEY = Buffer.from(process.env[`${token[0]}`]);
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    let decrypted = decipher.update(string, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }


  async #generateUserID() {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.bdb');
    let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'hex')));

    let maxUserID = -1;
    for (const session of sessionsJSON.sessions) {
      if (session.settings && session.settings.userID) {
        const userID = parseInt(session.settings.userID.substring(1));
        if (!isNaN(userID) && userID > maxUserID) {
          maxUserID = userID;
        }
      }
    }

    return 'u' + (maxUserID + 1);
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
