/**
 * Provides an interface for the client to perform whatever actions it needs
 * to interact with the MEG server
 */
// Using aliases because btoa and atob are not readable. Cu seems to be canonical
const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;
const b64encode = btoa
const b64decode = atob

// Of course this will change.
const SERVER_URL = "http://grehm.us/megserver/"
const DB_AES_KEY = "aeskeyStr";
const DB_SALT_KEY = "salt";

// I don't like globals but I don't think I can get around it here.
var keyStr;
var salt;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import("chrome://megthunderbird/content/db.js");

let ss = new Storage("megthunderbird");
// XXX Remove when debugging finished
//ss.remove(DB_AES_KEY);
//ss.remove(DB_SALT_KEY);

binToString = function(array) {
    return String.fromCharCode.apply(null, array);
}

function stringToBin(str) {
    return str.split("").map(function(c) {
        return c.charCodeAt(0);
    });
}

function string2Bin ( str ) {
    return str.split("").map( function( val ) {
        return val.charCodeAt( 0 );
    } );
}

getAESData = function() {
    var keyData = ss.get(DB_AES_KEY);
    var arr = JSON.parse(keyData).value.split("&&");
    var saltData = ss.get(DB_SALT_KEY);
    var salt = b64decode(JSON.parse(saltData).value);
    var key = b64decode(arr[0]);
    var iv = b64decode(arr[1]);
    return {key: key, iv: iv, salt: salt};
}

cmd_megSendButton = function() {
    if (!ss.has(DB_AES_KEY)) {  // No QR code present. User must scan it
        var input = generateKeyData();
        transformDataForInput(input);
        generateQRCode();
    } else {  // QR code exists. Must transmit message
        var text = getMailText();
        text = encryptText(text);
        Cu.reportError(text);
        transmitDecryptedToServer(text);
        // Get it back from the server. Then send it to recipient.
    }
}

getMailText = function() {
    var editor = GetCurrentEditor();
    return editor.outputToString("text/plain", 4);
}

decryptText = function(text) {
    var keyData = getAESData();
    // This is not a generic Base64 implementation and is specifically
    // designed to work on encoding / decoding data for use in these
    // algorithms
    text = GibberishAES.Base64.decode(text);
    return GibberishAES.rawDecrypt(text, keyData.key, keyData.iv);
}

encryptText = function(text) {
    var keyData = getAESData();
    // Kinda stealing some code straight out of GibberishAES.
    // we can add the implementation of writing out Salted__ later if we want
    var cipherBlocks = GibberishAES.rawEncrypt(
        GibberishAES.s2a(text), keyData.key, keyData.iv
    );
    return GibberishAES.Base64.encode(cipherBlocks);
}

transmitDecryptedToServer = function(text) {
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(
        Ci.nsIXMLHttpRequest
    );
    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    cb(xhr.response);
                    break;
                }
            default:
                Services.prompt.alert(null, 'XHR Error', 'Error Fetching Package: ' + xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']');
                break;
        }
    };

    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    var email_to = "foo@bar.com";  // XXX DEBUG
    var email_from = "grehm87@gmail.com";  // XXX DEBUG
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


cmd_qrScanComplete = function() {
    var vbox = document.getElementById("appcontent");
    var img = vbox.getElementsByTagName("img")[0];
    var canvas = vbox.getElementsByTagName("canvas")[0];
    var completeButton = vbox.getElementsByTagName("button")[0];
    // clean up all QR related stuff
    vbox.removeChild(img);
    vbox.removeChild(canvas);
    vbox.removeChild(completeButton);
    // Redisplay the editor. BUG - Unfortunately this displays a slight UI problem
    // where some of the lines in To: will be hidden. This is merely cosmetic tho
    // so I'm not going to bother with it.
    vbox.getElementsByTagName("editor")[0].style.display = "block";
    ss.set(DB_AES_KEY, keyStr);
    ss.set(DB_SALT_KEY, b64encode(salt));
}

transformDataForInput = function(input) {
    keyStr = b64encode(binToString(input.key));
    var ivStr = b64encode(binToString(input.iv));
    keyStr = keyStr.concat("&&", ivStr);
}

generateQRCode = function() {
    var qrcode = new QRCode("appcontent");
    qrcode.makeCode(keyStr);
    var vbox = document.getElementById("appcontent");
    var img = vbox.getElementsByTagName("img")[0];
    img.style.display = "block";
    vbox.getElementsByTagName("editor")[0].style.display = "none";
    // TODO Complete styling of button
    var button = document.createElement("button");
    button.setAttribute("oncommand", "cmd_qrScanComplete()");
    vbox.appendChild(button);
}

pollForEncrypted = function() {

}

generateKeyData = function() {
    salt = randArr(8);
    // 25 characters max so 27 because 27 - 2 = 25.
	var pass = Math.random().toString(36).substring(2, 27);
    var pbe = GibberishAES.openSSLKey(GibberishAES.s2a(pass), salt);
    return {key: pbe.key, iv: pbe.iv};
}

randArr = function(num) {
	var result = [], i;
	for (i = 0; i < num; i++) {
		result = result.concat(Math.floor(Math.random() * 256));
	}
	return result;
}
