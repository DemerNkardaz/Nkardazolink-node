const pug = require('pug');
const ejs = require('ejs');
//const { PostProcessor } = require('../../PostProcessor/PostProcessor');
const { Remarkable } = require('remarkable');
const { linkify } = require('remarkable/linkify');
const markdown = new Remarkable({ html: true }).use(linkify);

markdown.core.ruler.enable(['abbr']);
markdown.inline.ruler.enable(['ins', 'mark','footnote_inline', 'sub', 'sup']);
markdown.block.ruler.enable(['footnote', 'deflist']);

markdown.renderFile = async function (filePath, data) {
  const fileContent = await readFileAsync(filePath, 'utf8');
  const parsedContent = fileContent
    .replace(/```js\s\%([\s\S]*?)```/g, (match, code) => {
      try {
        const boundFunction = new Function('data', code).bind(null, data);
        return boundFunction();
      } catch (err) {
        console.log(err);
        return match;
      }
    })
    .replace(/\${((?!{[^{]*}).*?)}/g, (match, code) => {
      const varLink = code.match(/\.[\s\S]*?\)/g) ?
        code.replace(/\.[\s\S]*?\)/g, '').split('.').map(key => `[\"${key}\"]`).join('')
        : !code.includes('(') ? code.split('.').map(key => `[\"${key}\"]`).join('') : code;
      const varMethods = code.match(/(\.\w+\(.*?\))/g) ? code.match(/(\.\w+\(.*?\))/g).join('') : '';
      try {
        return new Function('data', `return data${varLink}${varMethods}`)(data);
      } catch (err) {
        try {
          return new Function('data', `return ${code}`)(data)
          } catch (err) {
          console.log(err);
          return `<span title="${err}" style="cursor: help">${match}</span>`;
        }
      }
    });
  return await markdown.render(parsedContent);
};

async function loadComponent(component, data, renderer) {
  const renderers = {
    pug: [pug.renderFile, 'pug'],
    ejs: [ejs.renderFile, 'ejs'],
    md: [markdown.renderFile, 'md']
  }
  try {
    for (const [key, [renderFile, ext]] of Object.entries(renderers)) {
      if (ext.includes(component.split('.').pop()))
        return await renderFile(`app/${component}`, data || {});
    }
    const transferedData = [`app/${component}.${renderers[renderer] ? renderers[renderer][1] : 'ejs'}`, data || {}];
    return await renderers[renderer] ? renderers[renderer][0](...transferedData) : renderers['ejs'][0](...transferedData);
  }
  catch (error) {
    console.error(error);
    throw error;
  }
}

Promise.prototype.PostProcessor = async function (data) {
  try {
    return await PostProcessor(await this, data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { loadComponent, markdown, PostProcessor };