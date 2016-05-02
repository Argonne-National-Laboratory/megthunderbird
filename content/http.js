/**
 * Performs HTTP actions for the MEG client
 */
var EXPORTED_SYMBOLS = ["HTTP"];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import('resource://gre/modules/Services.jsm');

const HTTP_RETRY_TIMEOUT = 3000;
const HTTP_MAX_RETRIES = 5;
// Of course this will change.
const SERVER_URL = "http://grehm.us/megserver/"

HTTP = function() {
    this.retries = 0;
}

HTTP.prototype.transmitDecryptedToServer = function(text, email_to, email_from) {
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(
        Ci.nsIXMLHttpRequest
    );
    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    // Do we need a callback here??
                    break;
                }
            default:
                Services.prompt.alert(null, 'XHR Error', 'Error Sending Message For Encryption. Retry: ' + xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']');
                break;
        }
    };

    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open(
        'PUT',
        SERVER_URL.concat(
            "decrypted_message/?action=encrypt&email_to="
        ).concat(encodeURIComponent(email_to)).concat(
            "&email_from="
        ).concat(encodeURIComponent(email_from)),
        true
    );
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
    xhr.send(text);
}

HTTP.prototype.getEncryptedFromServer = function(callback, email_to, email_from) {
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(
        Ci.nsIXMLHttpRequest
    );
    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    callback(xhr.response);
                    break;
                }
            default:
                Components.utils.reportError("Could not get email from server; retrying");
                this.retries += 1;
                if (this.retries > HTTP_MAX_RETRIES) {
                    // TODO. Some kind of warning or something
                    break;
                }
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
                // zombie messages will have to wait.
                var timer = Components.classes[
                    "@mozilla.org/timer;1"
                ].createInstance(Components.interfaces.nsITimer);
                timer.initWithCallback(function() {
                        this.getEncryptedFromServer(email_to, email_from);
                }, HTTP_RETRY_TIMEOUT);
                break;
        }
    };

    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open(
        'GET',
        SERVER_URL.concat("encrypted_message/?email_to=").concat(
            encodeURIComponent(email_to)
        ).concat("&email_from=").concat(
            encodeURIComponent(email_from)
        ),
        true
    );
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
    xhr.send(null);
}
