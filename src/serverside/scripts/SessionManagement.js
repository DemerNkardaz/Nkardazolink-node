const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const sqlite3 = require('sqlite3').verbose();
const sha1 = str => crypto.createHash('sha1').update(str).digest('hex');
const sha256 = str => crypto.createHash('sha256').update(str).digest('hex');
const sha512 = str => crypto.createHash('sha3-512').update(str).digest('hex');
const argon2 = require('argon2');
const argonization = async (str) => {
  try {
    const hashedString = await argon2.hash(str, { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 4, parallelism: 2 });
    return hashedString;
  } catch (err) { return null; }
};

const deargonization = async (str, hashedString) => {
  try {
    const isMatch = await argon2.verify(hashedString, str);
    return isMatch;
  } catch (err) { return false; }
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

  constructor(dataBase) {
    if (!process.env.API_SESSIONS) throw new Error('API_SESSIONS environment variable is not set!');
    else if (process.env.API_SESSIONS.length !== 32) throw new Error('API_SESSIONS environment variable is not valid!');
    this.dataBase = dataBase;

    (async () => {
      const username = 'example';
      const inputPassword = 'warmonger';

      // Проверка введенного пароля
      const isPasswordCorrect = await verifyPassword(username, inputPassword);
      console.log(`Пароль правильный: ${isPasswordCorrect}`);
    })();

    console.log(`\x1b[35m[${new Date().toLocaleString().replace(',', '')}] :: 🟪 > [SESSIONS] :: Session manager now installed\x1b[39m`);
  }

  async initializeSession(sessionID, settings) {
    try {
      const isSessionExists = await this.readSessionFromSQL(sessionID);
      const isSessionRegistered = isSessionExists !== null && isSessionExists.login !== null && isSessionExists.password !== null;

      if (!isSessionExists) {
        this.startAnonymousSession(sessionID, settings);
      } else if (isSessionExists && isSessionRegistered) {
        //! REQUIRE PASSWORD AND LOGIN TO ENTER SESSION IF NOT BE LOGGED IN BEFORE
        //? CHECK IF USER IN LOGGED DEVICE AND AUTOLOGIN ELSE AUTOLOGOUT
        //* LOGGED DEVICES STORED IN authorize JSON IN DB as devices: [{device: device_encrypted, logged: false/true}]
      }
    } catch (err) {
      console.log(err);
    }
  }

  async startAnonymousSession(sessionID, settings) {
    try {
      let writeMessage = true;
      const sessionIDCrypted = this.#encryptString(sessionID, ['API_SESSIONS', 'SESSION_IV']);

      this.dataBase.run('INSERT INTO users (sessionID, settings) VALUES (?, ?)', [sessionIDCrypted, JSON.stringify(settings)]);
      writeMessage && console.log(`\x1b[34m[${new Date().toLocaleString().replace(',', '')}] :: 🔷 > [SESSIONS] :: Anonymous session ${sessionID} has been written\x1b[39m`);
    } catch (err) {
      console.log(err);
    }
  }

  async writeSessionToSQL(sessionID, settings, authorize = {}) {
    try {
      let writeMessage = true;
      const sessionIDCrypted = this.#encryptString(sessionID, ['API_SESSIONS', 'SESSION_IV']);
      const isSessionExists = await this.readSessionFromSQL(sessionID);
      isSessionExists && console.log('isSessionExists');
      const isSessionRegistered = isSessionExists !== null && isSessionExists.login !== null && isSessionExists.password !== null;
      
      isSessionRegistered && console.log(isSessionExists.login, isSessionExists.password);
      isSessionExists && (writeMessage = false);
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
            reject();
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

