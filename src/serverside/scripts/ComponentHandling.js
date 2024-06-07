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

async function PagePrerender(pageTemplate, data) {
  try {
    const template = await ejs.renderFile(`app/${pageTemplate}.ejs`, data || {});
    const processedPage = await PostProcessor(template, data);

    return processedPage;
  } catch (error) {
    console.error('Ошибка при обработке страницы:', error);
    return null;
  }
}

module.exports = { loadComponent, PagePrerender };