(function (window) {
    'use strict';

    function define_joauth() {
        var joauth = {};

        var RESOURCE_KEY = 'Resource';
        var LOCATION_KEY = 'Location';
        var EXPIRES_KEY = 'Expires';
        var ERROR_KEY = 'Error';

        var useLocalStorageProp = true;
        var redirectPendingProp = false;
        
        //private
        var saveToStorage = function (key, value) {
            if (useLocalStorageProp === true) {
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

        var getFromStorage = function (key) {
            if (useLocalStorageProp === true) {
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

        var saveToStorageByState = function (state, key, value) {
            saveToStorage(state + "-" + key, value);
        }

        var getFromStorageByState = function (state, key) {
            return getFromStorage(state + "-" + key);
        }

        var guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                  .toString(16)
                  .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
        }

        var urlParameterExtraction = new (function () {
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

        //public
        joauth.setUseLocalStorage = function(useLocalStorage) {
            useLocalStorageProp = useLocalStorage;
        }

        joauth.getError = function () {
            var error = getFromStorage(ERROR_KEY);
            if (error === "null") {
                return null;
            }

            return error;
        }

        joauth.getAccessToken = function (authEndpointUri, appIdUri, clientId, redirectUri) {
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
            saveToStorageByState(uuid, RESOURCE_KEY, appIdUri);
            saveToStorageByState(uuid, LOCATION_KEY, window.location);

            console.log('redirectUri: ' + redirectUri);

            var responseType = 'token';
            var url = authEndpointUri + '?' +
                "response_type=" + encodeURI(responseType) + "&" +
                "client_id=" + encodeURI(clientId) + "&" +
                "resource=" + encodeURI(appIdUri) + "&" +
                "state=" + encodeURI(uuid) + "&" +
                "redirect_uri=" + encodeURI(redirectUri);

			if (redirectPendingProp === false) {
            	redirectPendingProp = true;
            	window.location = url;
            }

            return null;
        }

        joauth.processOAuthRedirect = function () {
              redirectPendingProp = false;
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
                  
                  // clear error
                  saveToStorage(ERROR_KEY, null);

                  //revert the window location to what it was before the token request
                 if (window.location.href != location) {
                	window.location = location;
                 }
              } else if (error && state) {
                  var resource = getFromStorageByState(state, RESOURCE_KEY);
                  var errorDescr = urlParameterExtraction.queryStringParameters['error_description'];

                  // check for authorizatoin error
                  var location1 = getFromStorageByState(state, LOCATION_KEY);

                  saveToStorage(ERROR_KEY, error + ' ' + errorDescr)
                  console.log('error: ' + error);
                  console.log('error description:' + errorDescr);
              }
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

    joauth.processOAuthRedirect();
    
})(window);