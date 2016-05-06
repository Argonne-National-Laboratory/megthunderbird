/**
 * Provides an interface for the client to perform whatever actions it needs
 * to interact with the MEG server
 */
// Using aliases because btoa and atob are not readable. Cu seems to be canonical
const Cu = Components.utils;

Cu.import("chrome://megthunderbird/content/db.js");
Cu.import("chrome://megthunderbird/content/crypto.js");
Cu.import("chrome://megthunderbird/content/http.js");
//Cu.import("resource://comm-central/mail/components/compose/content/MsgComposeCommands.js");

let ss = new Storage("megthunderbird");
let crypto = new Crypto(ss);
let http = new HTTP();

// XXX Remove when debugging finished
//const DB_AES_KEY = "aeskeyStr";
//const DB_SALT_KEY = "salt";
//ss.remove(DB_AES_KEY);
//ss.remove(DB_SALT_KEY);

function string2Bin (str) {
    return str.split("").map(function(val) {
        return val.charCodeAt(0);
    });
}

cb = function(response) {
    var editor = GetCurrentEditor();
	editor.beginTransaction();
	editor.beginningOfDocument();
    editor.selectAll();
    editor.cut();  // TODO get a better method. only problem is deleteSelection has weird API.
    editor.insertText(JSON.parse(response).message);
	editor.endTransaction();
    SendMessage();
}

alertCb = function(msg) {alert(msg);}

cmd_megSendButton = function() {
    if (!crypto.hasKey()) {  // No QR code present. User must scan it
        var input = crypto.generateKeyData();
        var keyStr = crypto.transformDataForInput(input);
        generateQRCode(keyStr);
    } else {  // QR code exists. Must transmit message
        var text = getMailText();
        text = crypto.encryptText(text);
        var email_to = "grehm87@gmail.com";  // XXX DEBUG
        var email_from = "grehm87@gmail.com";  // XXX DEBUG
        http.transmitDecryptedToServer(text, email_to, email_from);
        http.getEncryptedFromServer(cb, alertCb, email_to, email_from);
        // Get it back from the server. Then send it to recipient.
    }
}

getMailText = function() {
    var editor = GetCurrentEditor();
    return editor.outputToString("text/plain", 4);
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
    crypto.storeKey();
}

generateQRCode = function(keyStr) {
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
