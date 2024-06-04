
async function PostProcessor(data) {
  data = await StringHandling(data);
  data = eval('`' + data + '`');
  return data;
} 


module.exports = { PostProcessor };