const localise = require('./LocalisationHandling');
function evalStringCommands(text) {
  return text
    .replace(/\{{ (.*?)\ }}/g, function (match, p1) {
      return eval(`locale.ru.${p1}`);
    });
}

String.prototype.evalStringCommands = function () {
  return evalStringCommands(this);
}



async function StringHandling(text) {
  localise.get();
  text = text.evalStringCommands();
  return text;
}



module.exports = { StringHandling };