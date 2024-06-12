/*
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
    const sessionsFilePath = path.join(this.sourcePath, 'static/sessions.bdb');
    if (!fs.existsSync(sessionsFilePath)) {
      const encryptedRoot = this.#encryptSessions({ sessions: [] });
      const encryptedBuffer = Buffer.from(encryptedRoot, 'hex');
      await writeFile(sessionsFilePath, encryptedBuffer, { flag: 'w' });
    }
  }

  async explainFile() {
    const sessionsFilePath = path.join(this.sourcePath, 'static/sessions.bdb');
    let sessionsJSON = await JSON.parse(this.#decryptSessions(await readFile(sessionsFilePath, 'hex')));
    await writeFile(path.join(this.sourcePath, 'static/sessions-explained.json'), JSON.stringify(sessionsJSON, null, 2), 'utf8');
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
*/





const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const { Mutex } = require('async-mutex');
const sessionMutex = new Mutex();
const sqlite3 = require('sqlite3').verbose();
const sha1 = str => crypto.createHash('sha1').update(str).digest('hex');
const sha256 = str => crypto.createHash('sha256').update(str).digest('hex');
const sha512 = str => crypto.createHash('sha3-512').update(str).digest('hex');
const argon2 = require('argon2');
const argonization = async (str) => {
    try {
        const hashedString = await argon2.hash(str, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 4,
            parallelism: 2
        });
        return hashedString;
    } catch (err) {
        console.error('Ошибка хеширования строки:', err);
        return null;
    }
};


const deargonization = async (str, hashedString) => {
  try {
    const isMatch = await argon2.verify(hashedString, str);
    return isMatch;
  } catch (err) {
    console.error('Ошибка при сравнении строки с хешем:', err);
    return false;
  }
}


const database = {
    "example": {
        passwordHash: "$argon2id$v=19$m=65536,t=4,p=2$zH+6IFTwB9Z7LUSHTou8vw$Mx6Z5UhDGIrSBChBY8nUSwyP4O351Dl7sNwcZI7jNfA"
    }
};
const verifyPassword = async (username, inputPassword) => {
    if (!database[username]) {
        console.error('Пользователь не найден.');
        return false;
    }

    const hashedPassword = database[username].passwordHash;
    return await deargonization(inputPassword, hashedPassword);
};

class SessionManager {

  constructor(sourcePath) {
    if (!process.env.API_SESSIONS) throw new Error('API_SESSIONS environment variable is not set!');
    else if (process.env.API_SESSIONS.length !== 32) throw new Error('API_SESSIONS environment variable is not valid!');
    const dataBasePath = path.join(sourcePath, 'static/data_base/users.db');
    this.dataBase = new sqlite3.Database(dataBasePath);
    this.dataBase.run(`CREATE TABLE IF NOT EXISTS users (rowID INTEGER PRIMARY KEY, userID TEXT, login TEXT, password TEXT, email TEXT, sessionID TEXT, settings JSON, authorize JSON)`);

    (async () => {
      const username = 'example';
      const inputPassword = 'warmonger';

      // Проверка введенного пароля
      const isPasswordCorrect = await verifyPassword(username, inputPassword);
      console.log(`Пароль правильный: ${isPasswordCorrect}`);
    })();


    this.sourcePath = sourcePath;
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }

  async startAnonymousSessions(sessionID, settings) {
    try {
      let writeMessage = true;
      const sessionIDCrypted = this.#encryptString(sessionID, ['API_SESSIONS', 'SESSION_IV']);
      const isSessionExists = await this.readSessionFromSQL(sessionID);
      const isSessionRegistered = isSessionExists !== null && isSessionExists.login !== null && isSessionExists.password !== null;
      if (!isSessionExists) {
        this.dataBase.run('INSERT INTO users (sessionID, settings) VALUES (?, ?)', [sessionIDCrypted, JSON.stringify(settings)]);
        writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Anonymous session ${sessionID} has been written\x1b[39m`);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async writeSessionToSQL(sessionID, settings, authorize = {}) {
    try {
      let writeMessage = true;
      const sessionIDCrypted = this.#encryptString(sessionID, ['API_SESSIONS', 'SESSION_IV']);
      const isSessionExists = await this.readSessionFromSQL(sessionID);
      isSessionExists && (writeMessage = false);
      const isSessionRegistered = isSessionExists !== null && isSessionExists.login !== null && isSessionExists.password !== null;
      console.log(isSessionRegistered ? 'Сессия зарегистрирована' : 'Сессия не зарегистрирована');
      this.dataBase.run('INSERT INTO users (sessionID, settings, authorize) VALUES (?, ?, ?)', [sessionIDCrypted, JSON.stringify(settings), JSON.stringify(authorize)]);
      writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Session ${sessionID} has been written\x1b[39m`);
    } catch (err) {
      console.log(err);
    }
  }


  async readSessionFromSQL(sessionID) {
    try {
      return new Promise((resolve, reject) => {
        sessionID = this.#encryptString(sessionID, ['API_SESSIONS', 'SESSION_IV']);
        this.dataBase.get('SELECT * FROM users WHERE sessionID = ?', [sessionID], (err, row) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              const rowID = row.rowID;
              const userID = row.userID || null;
              const login = row.login || null;
              const password = row.password || null;
              const email = row.email || null;
              const sessionID = row.sessionID;
              const settings = JSON.parse(row.settings) || {};
              const authorize = JSON.parse(row.authorize) || {};
              const sessionPackage = { rowID: rowID, userID: userID, login: login, password: password, email: email, sessionID: sessionID, settings: settings, authorize: authorize };
              resolve(sessionPackage);
            } else {
              resolve(null);
            }
          }
        });
      });
    } catch (err) {
      console.log(err);
    }
  }

  async getSettingsFromSQL(sessionID, settingName) {
    const session = await this.readSessionFromSQL(sessionID);
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



  async writeSession(sessionID, settings, authorize = {}) {
    const release = await sessionMutex.acquire();
    try {
      if (sessionID !== undefined && settings !== null) {
        const sessionsPath = path.join(this.sourcePath, 'static/sessions.bdb');
        let sessionsJSON = JSON.parse(this.#decryptSessions(await readFile(sessionsPath, 'hex')));
        let writeMessage = true;

        const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sha1(sessionID));

        if (existingSessionIndex !== -1) {
          sessionsJSON.sessions[existingSessionIndex] = { sessionID: sha1(sessionID), settings: settings, ...authorize };
          writeMessage = false;
        } else {
          sessionsJSON.sessions.push({ sessionID: sha1(sessionID), settings: settings, ...authorize });
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
    return await sessionsJSON.sessions.find(session => (session.login && session.login === login) || (session.sessionID === sha1(sessionID)));
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











/*
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const { Mutex } = require('async-mutex');
const sessionMutex = new Mutex();
const sha1 = str => crypto.createHash('sha1').update(str).digest('hex');


class SessionManager {

  constructor(sourcePath) {
    if (!process.env.API_SESSIONS) throw new Error('API_SESSIONS environment variable is not set!');
    else if (process.env.API_SESSIONS.length !== 32) throw new Error('API_SESSIONS environment variable is not valid!');
    this.sourcePath = sourcePath;
    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }



  async writeSession(sessionID, settings, authorize = {}) {
    try {
      if (sessionID !== undefined && settings !== null) {
        const sessionFilePath = path.join(this.sourcePath, `static/users/${sha1(sessionID)}.bdb`);
        let sessionsJSON = { sessionID, settings, ...authorize };
        let writeMessage = true;

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
          try {
            await fs.promises.access(sessionFilePath);
            writeMessage = false;
          } catch (error) {
            writeMessage = true;
          }
          const contentBuffer = Buffer.from(this.#encryptSessions(sessionsJSON), 'hex');
          await writeFile(sessionFilePath, contentBuffer, { flag: 'w' });
          writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Session ${sessionID} has been written\x1b[39m`);
          return true;
        }
      }
    } catch (error) {
      console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [SESSIONS] :: Error writing session: ${error.message}`);
    }
    return false;
  }

  async readSession(sessionID = null) {
    try {
      const sessionFilePath = path.join(this.sourcePath, `static/users/${sha1(sessionID)}.bdb`);
      let sessionsJSON = await JSON.parse(this.#decryptSessions(await readFile(sessionFilePath, 'hex')));
      return await sessionsJSON;
    } catch (error) {
      console.error(`[${new Date().toLocaleString().replace(',', '')}] :: 🟥 > [SESSIONS] :: Error reading session: ${error.message}`);
    }
  }


  async registration(sessionID, login, pass, email, userPlatform) {
    const session = await this.readSession(sessionID);
    if (session && session.login && session.pass) {
      await this.authorization(sessionID, login, pass, email);
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

  async authorization(sessionID, login, pass, email) {
    const sessionPath = await this.readSession(sessionID);
    
    for (const session of sessionPath.sessions) {
      if (session && session.login && session.pass) {
        console.log(await sessionPath);
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
    const usersDirectory = path.join(this.sourcePath, 'static/users/');
    const files = await fs.promises.readdir(usersDirectory);
    let maxUserID = -1;

    for (const file of files) {
      const filePath = path.join(usersDirectory, file);
      const content = await readFile(filePath, 'hex');
      const sessionData = JSON.parse(this.#decryptSessions(content));

      if (sessionData && sessionData.userID) {
        const userID = parseInt(sessionData.userID.substring(1));
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

module.exports = { SessionManager };*/