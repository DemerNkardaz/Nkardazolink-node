const htmlMinifyOptions = {
  removeAttributeQuotes: true,
  collapseWhitespace: true,
  removeComments: true,
  minifyJS: true,
  minifyCSS: true
}

async function PostProcessor(page, data) {
  page = await StringHandling(page, data);
  page = eval('`' + page + '`');

  page = htmlMinifier.minify(page, htmlMinifyOptions);
  return page;
} 


module.exports = { PostProcessor };