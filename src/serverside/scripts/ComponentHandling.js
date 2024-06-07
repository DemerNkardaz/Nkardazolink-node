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
  console.log(await this);
  try {
    return await PostProcessor(await this, data);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { loadComponent };