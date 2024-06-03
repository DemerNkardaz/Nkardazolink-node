window.nk = {};
nk.cookie = function (key) {
    var methods = {};

    methods.get = function () {
        var cookieString = document.cookie;
        var cookies = cookieString.split('; ');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].split('=');
            if (cookie[0] === key) {
                return JSON.parse(decodeURIComponent(cookie[1]));
            }
        }
        return null;
    };

    methods.set = function (value) {
        var cookieValue = encodeURIComponent(JSON.stringify(value));
        var cookieString = key + '=' + cookieValue.replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        });
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 2); // Expires in 2 years
        document.cookie = cookieString + "; expires=" + expirationDate.toUTCString() + "; path=/";
    };

    methods.remove = function () {
        document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    };

    return methods;
};
