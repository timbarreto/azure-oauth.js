(function (window) {
    'use strict';

    function define_joauth() {
        var joauth = {};

        var RESOURCE_KEY = 'Resource';
        var LOCATION_KEY = 'Location';
        var EXPIRES_KEY = 'Expires';

        //public
        joauth.getToken = function (authServer, appIdUri, responseType) {
            console.log('clientId: ' + clientId);
            console.log('redirectUri: ' + redirectUri);

            var token = getFromStorage(appIdUri);
            var expireTime = getFromStorage(appIdUri + EXPIRES_KEY);
            if (token) {
                var time = new Date().getTime();
                if (time < expireTime) {
                    return token;
                }
            }

            var uuid = guid();
            saveToStorageByState(uuid, RESOURCE_KEY, azureAppIdUri);
            saveToStorageByState(uuid, LOCATION_KEY, window.location);

            console.log('redirectUri: ' + redirectUri);

            var url = authServer +
                "response_type=" + encodeURI(responseType) + "&" +
                "client_id=" + encodeURI(clientId) + "&" +
                "resource=" + encodeURI(appIdUri) + "&" +
                "state=" + encodeURI(uuid) + "&" +
                      "redirect_uri=" + encodeURI(redirectUri);

            window.location = url;

            return null;
        }

        //private

        urlParameterExtraction = new (function () {
            function splitQueryString(queryStringFormattedString) {
                var split = queryStringFormattedString.split('&');

                // If there are no parameters in URL, do nothing.
                if (split == "") {
                    return {};
                }

                var results = {};

                // If there are parameters in URL, extract key/value pairs. 
                for (var i = 0; i < split.length; ++i) {
                    var p = split[i].split('=', 2);
                    if (p.length == 1)
                        results[p[0]] = "";
                    else
                        results[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
                }

                return results;
            }

            // Split the query string (after removing preceding '#'). 
            this.queryStringParameters = splitQueryString(window.location.hash.substr(1));
        })();

        processOpenIdConnectRedirect = function () {
            // Extract token from urlParameterExtraction object.
            var token = urlParameterExtraction.queryStringParameters['access_token'];
            var state = urlParameterExtraction.queryStringParameters['state'];
            var error = urlParameterExtraction.queryStringParameters['error'];

            if (token && state) {
                var resource = getFromStorageByState(state, RESOURCE_KEY);
                var location = getFromStorageByState(state, LOCATION_KEY);

                var expires = urlParameterExtraction.queryStringParameters['expires_in'];
                var expiresTime = new Date();
                expiresTime = new Date(expiresTime.getTime() + 1000 * expires);

                //save the token for this resource to browser storage
                console.log('token: ' + token);
                console.log('expires: ' + expiresTime);
                saveToStorage(resource, token);
                saveToStorage(resource + EXPIRES_KEY, expiresTime.getTime());

                //revert the window location to what it was before the token request
                window.location = location;
            } else if (error && state) {
                var errorDescription = urlParameterExtraction.queryStringParameters['error_description'];

                // check for authorizatoin error
                var location1 = getFromStorageByState(state, LOCATION_KEY);

                console.log('error: ' + error);
                console.log('error description:' + errorDescription);

                throw errorDescription;
            }
        }

        saveToStorage = function (key, value) {
            if (useLocalStorage === true) {
                try {
                    localStorage.setItem(key, value);
                } catch (ex) {
                    throw ex;
                }
            } else {
                try {
                    sessionStorage.setItem(key, value);
                } catch (ex) {
                    throw ex;
                }
            }
        }

        getFromStorage = function (key) {
            if (useLocalStorage === true) {
                try {
                    return localStorage.getItem(key);
                } catch (ex) {
                    throw ex;
                }
            } else {
                try {
                    return sessionStorage.getItem(key);
                } catch (ex) {
                    throw ex;
                }
            }
        }

        saveToStorageByState = function (state, key, value) {
            saveToStorage(state + "-" + key, value);
        }

        getFromStorageByState = function (state, key) {
            return getFromStorage(state + "-" + key);
        }

        guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                  .toString(16)
                  .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
        }

        return joauth;
    }

    //define globally if it doesn't already exist
    if (typeof (joauth) === 'undefined') {
        window.joauth = define_joauth();
    }
    else {
        console.log("joauth already defined.");
    }

})(window);