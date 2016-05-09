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
    // Hmm the mechanics of how this actually works makes it non-trivial to send
    // email to multiple recipients.
    SendMessage();
}

alertCb = function(msg) {alert(msg);}

cmd_megSendButton = function() {
    if (!crypto.hasKey()) {  // No QR code present. User must scan it
        var input = crypto.generateKeyData();
        var keyStr = crypto.transformDataForInput(input);
        generateQRCode(keyStr);
    } else {  // QR code exists. Must transmit message
        addresses = getEmailAddresses();
        if (!addresses) {
            return;
        }
        // TODO Ensure that the addresse has MEG.
        var text = getMailText();
        text = crypto.encryptText(text);
        http.transmitDecryptedToServer(text, addresses.to, addresses.from);
        http.getEncryptedFromServer(cb, alertCb, addresses.to, addresses.from);
    }
}

getEmailAddresses = function() {
    var from = document.getElementById("msgIdentity").description;
    var win = Services.wm.getMostRecentWindow("msgcompose");
    var compFields = {};
    win.Recipients2CompFields(compFields);
    var to = compFields.to.split(",");
    if (to.length > 1) {
        alert("MEG can only support sending messages to one person at a time currently");
        return false;
    }
    var re = /<(.+)>/;
    var to_single = re.exec(to[0])[1];
    return {from: from, to: to_single};
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
