/**
 * Lift Connector
 * @constructor
 **/
/* ----- Private ----- */
var httpLib = require('http'),
    urlLib = require('url');

/**
 * Gets HTTP request options
 * 
 * @private
 * @param {String} url
 * @param {String} method
 * @returns {{ host: String, path: String, method: String }}
 */
function getOptions(url, method) {
    var data = urlLib.parse(url);
    return {
        host: data.hostname,
        path: data.path,
        port: 80,
        method: method
    };
}

/**
 * Gets a callback for HTTP Request
 * 
 * @private
 * @param {Function} [success] Callback when success
 * @param {Function} [error] Callback when encounter error
 * @returns {Function}
 */
function getRequestCallback(success, error) {
    return function (response) {
        var data = [];
        
        if (success) {
            response.on('data', function(chunk) {
                data.push(chunk);
            });
            
            response.on('end', function() {
                success(JSON.parse(data.join('')));
            });
        }
        
        response.on('error', function() {
            console.log('Error deteted in Connector');
            if (error) {
                error('There is an error');
            }
        });
    };
}

/* ----- Public ----- */
/**
 * Posts data to server
 * 
 * @param {String} url URL to post data to
 * @param {String} data Data in JSON
 * @param {Function} [success] Callback when it was successful
 * @param {Function} [error] Callback when encounters an error
 * @returns {void}
 */
exports.post = function(url, data, success, error) {
    var request = httpLib.request(getOptions(url, 'POST'), getRequestCallback(success, error));
    
    if (data) {
        request.write(JSON.stringify(data));
    }
    request.end();
};
