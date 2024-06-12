window.nk = {};
nk.cookie = function (key) {
  let methods = {};

  methods.get = function () {
    let cookieString = document.cookie;
    let cookies = cookieString.split('; ');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].split('=');
      if (cookie[0] === key) {
        return JSON.parse(decodeURIComponent(cookie[1]));
      }
    }
    return null;
  };

  methods.set = function (value) {
    let cookiesArray = [];
    if (key.includes('[') && key.includes(']')) {
      let rootName = key.split('[')[0];
      let keysArray = key.match(/\[(.*?)\]/)[1].split(',');
      keysArray = keysArray.map((element) => `${rootName}.${element.replace(/\s/g, '')}`);
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          let cookieValue = encodeURIComponent(JSON.stringify(value[i]));
          let cookieString = keysArray[i] + '=' + cookieValue.replace(/%([0-9A-F]{2})/g, function (match, p1) {
            return String.fromCharCode('0x' + p1);
          });
          let expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 2);
          let cookia = `${cookieString}; expires=${expirationDate.toUTCString()}; path=/; SameSite=None; Secure`;
          document.cookie = cookia;
        }
      }
    } else {
      let cookieValue = encodeURIComponent(JSON.stringify(value));
      let cookieString = key + '=' + cookieValue.replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
      });
      let expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 2);
      let cookia = `${cookieString}; expires=${expirationDate.toUTCString()}; path=/; SameSite=None; Secure`;
      document.cookie = cookia;
    }
  };

  methods.remove = function () {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  return methods;
}

