const space2underline = (str) => str.replace(/\s/g, '_');
const underline2space = (str) => str.replace(/\_/g, ' ');

export default { space2underline, underline2space };