/**
 * Provides an interface for the client to perform whatever actions it needs
 * to interact with the MEG server
 */
const Cu = Components.utils;
const sendButtonCmd = "cmd_sendButton";
const originalSendCommand = "goDoCommand('" + sendButtonCmd + "')";

Cu.import("chrome://megthunderbird/content/db.js");
Cu.import("chrome://megthunderbird/content/crypto.js");
Cu.import("chrome://megthunderbird/content/http.js");

let ss = new Storage("megthunderbird");
let crypto = new Crypto(ss);
let http = new HTTP();


cmd_enableDisable = function() {
    var sendButton = document.getElementById("button-send");
    var currentCmd = sendButton.getAttribute("oncommand");
    if (currentCmd == originalSendCommand) {
        sendButton.removeAttribute("command");
        sendButton.setAttribute("oncommand", "cmd_megSendButton()");
    } else {
        sendButton.setAttribute("oncommand", originalSendCommand);
        sendButton.setAttribute("command", sendButtonCmd);
    }
}

// XXX Remove when debugging finished
debugRemoveSymmetricKey = function() {
    var DB_AES_KEY = "aeskeyStr";
    var DB_SALT_KEY = "salt";
    ss.remove(DB_AES_KEY);
    ss.remove(DB_SALT_KEY);
}

transmitCallback = function(response) {
    gMsgCompose.compFields.setHeader("X-Header-1", "MEG-Encrypted");
    // Could using the editor get the message listener to wait until completed?
    var editor = GetCurrentEditor();
	editor.beginTransaction();
	editor.beginningOfDocument();
    editor.selectAll();
    editor.cut();
    editor.insertText(JSON.parse(response).message);
	editor.endTransaction();
    // Hmm.. the mechanics of how this actually works makes it non-trivial to send
    // email to multiple recipients.
    SendMessage();
}

cmd_megSendButton = function() {
    if (!crypto.hasKey()) {  // No QR code present. User must scan it
        var input = crypto.generateKeyData();
        var keyStr = crypto.transformDataForInput(input);
        generateQRCode(keyStr);
    } else {  // QR code exists. Must transmit message
        var start = Date.now()
        addresses = getEmailAddresses();
        if (!addresses) {
            return;
        }
        // TODO Ensure that the addresse has MEG.
        var text = getMailText();
        var encStart = Date.now();
        text = crypto.encryptText(text);
        Cu.reportError("Encryption time: " + parseInt(Date.now() - encStart));
        http.transmitDecryptedToServer(text, addresses.to, addresses.from);
        http.getEncryptedFromServer(transmitCallback, addresses.to, addresses.from);
        Cu.reportError("First part transmit: " + parseInt(Date.now() - start));
    }
}

getEmailAddresses = function() {
    var from = document.getElementById("msgIdentity").description;
    // XXX Bug! When the cursor is above the message compose field then the
    // window found is null for some reason.
    var win = Services.wm.getMostRecentWindow("msgcompose");
    var compFields = {};
    win.Recipients2CompFields(compFields);
    var to = compFields.to.split(",");
    if (to.length > 1) {
        alert("MEG can only support sending messages to one person at a time currently");
        return false;
    }
    var re = /<(.+)>/;
    // XXX Bug! When the cursor is set to a new, empty To: line then the
    // email will come up as null.
    //
    // Well I think... this can only be replicated on one of my debugging tools.
    var to_single = re.exec(to[0])[1];
    return {from: from, to: to_single};
}

getMailText = function() {
    var editor = GetCurrentEditor();
    return editor.outputToString("text/html", 4);
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
    button.setAttribute("label", "CLICK ME WHEN YOU'RE FINISHED SCANNING");
    button.setAttribute("oncommand", "cmd_qrScanComplete()");
    vbox.appendChild(button);
}

// XXX This is kinda on the gross side of things. preferable would be something
// that occurs on load of the window, however when I've tried to do this I've
// run into race conditions where the window wasn't completely loaded yet and
// so my JS was trying to operate on a null element.
window.setInterval(
    function() {
        var security = document.getElementById("button-security");
        security.style.display = "none";
    }, 100);

// XXX Also kinda grody, but less so.
window.setInterval(
    function() {
        var win = Services.wm.getMostRecentWindow("msgcompose");
        if (win == null) {
            return
        }
        var compFields = {};
        win.Recipients2CompFields(compFields);
        var to = compFields.to.split(",");
        if (to != "") {
            var sendButton = document.getElementById("button-send");
            sendButton.setAttribute("disabled", false);
        }
    }, 500);
