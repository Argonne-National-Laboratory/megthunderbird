/**
 * Performs HTTP actions for the MEG client
 */
var EXPORTED_SYMBOLS = ["HTTP"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');

const HTTP_RETRY_TIMEOUT = 500;
const HTTP_MAX_RETRIES = 10;
const SERVER_URL = "http://grehm.us/megserver/"

HTTP = function() {
    this.retries = 0;
}

/**
 * Transmit a decrypted message to the server so that we can encrypt
 * it with the recipients PGP key.
 *
 * @param {String} Base64 encoded text we will send to be encrypted by PGP
 * @param {String} email address of the person we are contacting
 * @param {String} our email address
 */
HTTP.prototype.transmitDecryptedToServer = function(text, email_to, email_from) {
    this.transmit(text, email_to, email_from, "decrypted_message", "encrypt");
}

/**
 * Transmit a encrypted message to the server so that we can decrypt
 * it with the recipients PGP key.
 *
 * @param {String} Base64 encoded text we will send to be encrypted by PGP
 * @param {String} email address of the person we are contacting
 * @param {String} our email address
 */
HTTP.prototype.transmitEncryptedToServer = function(text, email_to, email_from) {
    this.transmit(text, email_to, email_from, "encrypted_message", "decrypt");
}

HTTP.prototype.transmit = function(text, email_to, email_from, api, action) {
    var start = Date.now()
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(
        Ci.nsIXMLHttpRequest
    );
    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    // Do we need a successCb here??
                    Cu.reportError("Transmit time: " + parseInt(Date.now() - start));
                    break;
                }
            default:
                // TODO should probably add retry logic before we die
                Cu.reportError("transmit failure time: " + parseInt(Date.now() - start));
                Services.prompt.alert(null, 'Error Contacting MEG', 'Error Sending Message For Encryption. Retry: ' + xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']');
                break;
        }
    };

    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open(
        'PUT',
        SERVER_URL.concat(
            api, "/?action=", action, "&email_to="
        ).concat(encodeURIComponent(email_to)).concat(
            "&email_from="
        ).concat(encodeURIComponent(email_from)),
        true
    );
    xhr.setRequestHeader("Content-Type", "text/plain;charset=us-ascii");
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
    xhr.send(text);
}

// TODO I can probably remove the alert callback
HTTP.prototype.getDecryptedFromServer = function(successCb, email_to, email_from) {
    this.retrieve(successCb, email_to, email_from, "decrypted_message");
}

// TODO I can probably remove the alert callback
HTTP.prototype.getEncryptedFromServer = function(successCb, email_to, email_from) {
    this.retrieve(successCb, email_to, email_from, "encrypted_message");
}

HTTP.prototype.retrieve = function(successCb, email_to, email_from, api) {
    // redeclare this because it doesn't work in callbacks
    var self = this;
    var timer = Components.classes[
        "@mozilla.org/timer;1"
    ].createInstance(Components.interfaces.nsITimer);
    var event_ = {
        notify: function(timer) {
            self._retrieve(successCb, timer, email_to, email_from, api);
        }
    }
    timer.initWithCallback(
        event_, HTTP_RETRY_TIMEOUT, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
    );
    // Ensure that timer is not reaped before it is started per
    // https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Threads
    var idx = this.getEncryptedFromServer.timers.push(timer) - 1;
    return idx;
}
HTTP.prototype.getEncryptedFromServer.timers = [];

HTTP.prototype._retrieve = function(successCb, timer, email_to, email_from, api) {
    var start = Date.now()
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(
        Ci.nsIXMLHttpRequest
    );

    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    timer.cancel();
                    successCb(xhr.response);
                    Cu.reportError("retrieve_ success time: " + parseInt(Date.now() - start));
                    break;
                }
            default:
                // TODO So technically we have a problem with our implementation.
                // The server returns the first email it has for the user. However
                // that email might not necessarily be the email we want. So it
                // is totally possible to retrieve the wrong encrypted email from
                // the past. I think the easiest current solution to the problem
                // is to just delete the message when it is retrieved by the client.
                // This of course leaves the spectre of having zombie messages floating
                // around that were never retrieved by the client for whatever reason
                // of the internets/server broke.
                //
                // Whatever... punt for now and just implement deletion of messages.
                // zombie messages will have to wait. The dirtiest thing that we can do is
                // just to introduce some kind of TTL for the message in the database.
                Cu.reportError("Could not get email from server; retrying");
                this.retries += 1;
                if (this.retries > HTTP_MAX_RETRIES) {
                    // reset retries for future attempts
                    Cu.reportError("reached max retries");
                    this.retries = 0;
                    timer.cancel();
                    let type = api.replace('ed_message', '');
                    Services.prompt.alert(
                        null,
                        'XHRError',
                        "We cannot " + type + " the message with MEG. " +
                        "Check to see if you are logged into MEG on your phone."
                    );
                    break;
                }
                Cu.reportError("retrieve_ failure time: " + parseInt(Date.now() - start));
                break;
        }
    };
    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open(
        'GET',
        SERVER_URL.concat(api, "/?email_to=").concat(
            encodeURIComponent(email_to)
        ).concat("&email_from=").concat(
            encodeURIComponent(email_from)
        ),
        true
    );
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
    xhr.send(null);
}
