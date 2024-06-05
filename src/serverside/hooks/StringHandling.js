async function evalStringCommands(text, data) {
  return text
    .replace(/\{{ (.*?)\ }}/g, function (match, p1) {
      return eval(`locale.${data.__META__.navigatorLanguage}.${p1}`);
    });
}

String.prototype.evalStringCommands = (data) => { return evalStringCommands(this, data) }



async function StringHandling(text, data) {
  text = await evalStringCommands(text, data);
  return text;
}



module.exports = { StringHandling };