const AdobeIndesign = {
  GREPRules: [
    [/([a-zA-Z])\s/g, '$1&nbsp;' /* (?<=\<[\l\u]\>)\s */],
    [/\d\s(?=\d)/g, '&nbsp;' /* ((?<=\d)\s(?=\d)) */],
  ]
}
String.prototype.replaceGREPRules = function () {
  try {
    let modifiedText = this;
    for (let i = 0; i < AdobeIndesign.GREPRules.length; i++) {
      modifiedText = modifiedText.replace(AdobeIndesign.GREPRules[i][0], AdobeIndesign.GREPRules[i][1]);
      console.log(modifiedText);
    }
    return modifiedText;
  } catch (error) {
    console.log(error);
    return this;
  }
}
async function evalStringCommands(text, data) {
  return text
    .replace(/\{{ (.*?)\ }}/g, function (match, p1) {
      return eval(`locale.${data.__META__.navigatorLanguage}.${p1}`);
    });
}

String.prototype.evalStringCommands = (data) => { return evalStringCommands(this, data) }



async function StringHandling(text, data) {
  text = await evalStringCommands(text, data);
  //text = await text.replaceGREPRules();
  return text;
}



module.exports = { StringHandling };