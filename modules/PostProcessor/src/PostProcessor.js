async function PostProcessor(page, data) {
  page = await StringHandling(page, data);
  page = eval('`' + page + '`');

  return page;
} 


module.exports = { PostProcessor };