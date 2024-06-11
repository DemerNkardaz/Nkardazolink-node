const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


class SessionManager {

  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    this.checkSessionFile();
  }

  async checkSessionFile() {
    if (!fs.existsSync(path.join(this.sourcePath, 'static/sessions.json'))) {
      await writeFile(path.join(this.sourcePath, 'static/sessions.json'), JSON.stringify({ sessions: [] }), 'utf-8');
    }
  }

  async writeSession(sessionID, settings) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
    let sessionsJSON = JSON.parse(await readFile(sessionsPath, 'utf-8'));
  
    const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sessionID);

    if (existingSessionIndex !== -1) {
      sessionsJSON.sessions[existingSessionIndex] = { sessionID: sessionID, settings: settings };
    } else {
      sessionsJSON.sessions.push({ sessionID: sessionID, settings: settings });
    }
    await writeFile(sessionsPath, JSON.stringify(sessionsJSON), 'utf-8');
  }

  async readSession(sessionID) {
    const sessionsPath = path.join(this.sourcePath, 'static/sessions.json');
    let sessionsJSON = JSON.parse(await readFile(sessionsPath, 'utf-8'));
    return sessionsJSON.sessions.find(session => session.sessionID === sessionID);
  }
}

/*

async function SessionManagement(sourcePath) {
  let methods = {};

  if (!fs.existsSync(path.join(sourcePath, 'static/sessions.json'))) {
    await writeFile(path.join(sourcePath, 'static/sessions.json'), JSON.stringify({ sessions: [] }), 'utf-8');
  }

  methods.writeSession = async (sessionID, settings) => {
    const sessionsPath = path.join(sourcePath, 'static/sessions.json');
    let sessionsJSON = JSON.parse(await readFile(sessionsPath, 'utf-8'));
    
    const existingSessionIndex = sessionsJSON.sessions.findIndex(session => session.sessionID === sessionID);

    if (existingSessionIndex !== -1) {
      sessionsJSON.sessions[existingSessionIndex] = { sessionID: sessionID, settings: settings };
    } else {
      sessionsJSON.sessions.push({ sessionID: sessionID, settings: settings });
    }
    await writeFile(sessionsPath, JSON.stringify(sessionsJSON), 'utf-8');
  };

  return methods;
}
*/
module.exports = { SessionManager };