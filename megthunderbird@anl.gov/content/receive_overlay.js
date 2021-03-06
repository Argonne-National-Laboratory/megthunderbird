const Cu = Components.utils;
const Cc = Components.classes;
Cu.import("chrome://megthunderbird/content/db.js");
Cu.import("chrome://megthunderbird/content/crypto.js");
Cu.import("chrome://megthunderbird/content/http.js");

let ss = new Storage("megthunderbird");
let crypto = new Crypto(ss);
let messenger = Components.classes["@mozilla.org/messenger;1"]
    .createInstance(Components.interfaces.nsIMessenger);
let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
    .createInstance(Components.interfaces.nsISyncStreamListener);
let ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

getMessageText = function(msgHdr, stripHTML, length) {
    let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
    let listener = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance(Ci.nsISyncStreamListener);
    let uri = msgHdr.folder.getUriForMsg(msgHdr);
    messenger.messageServiceFromURI(uri).streamMessage(
        uri, listener, null, null, false, ""
    );
    let folder = msgHdr.folder;
    return folder.getMsgTextFromStream(
        listener.inputStream, msgHdr.Charset, 2 * length,
        length, false, stripHTML, { }
    );
};

decryptorCallback = function(text) {
    var message = JSON.parse(text).message;
    var plain = crypto.decryptText(message);
    var content = document.getElementById("messagepane").contentWindow.document;
    var div = content.getElementsByClassName("moz-text-flowed")[0]
        || content.getElementsByClassName("moz-text-plain")[0];
    div.innerHTML = plain;
};

shouldDecryptCallback = function(msgHdr, aMimeMsg) {
    if (aMimeMsg.get('x-header-1') == "MEG-Encrypted") {
        // TODO Eventually we will want to declare false here to not strip html
        var text = getMessageText(msgHdr, true, 32768);
        var re = /<(.+)>/;

        var author = 0;
        try {
          author = re.exec(msgHdr.author)[1];
        }
        catch (e) {
          recipient = msgHdr.author;
        }
        //DEBUG
        //Application.console.log("AUTHOR: ".concat(author))th

        var recipient = 0;
        try {
          recipient = re.exec(msgHdr.recipients.trim())[1];
        }
        catch (e) {
          recipient = msgHdr.recipients;
        }
        //DEBUG
        //Application.console.log("RECIPIENT: ".concat(recipient))

        var http = new HTTP();
        var msg_id = http.genID();
        var client_id = http.getClientID();
        http.transmitEncryptedToServer(text, recipient, author, client_id, msg_id);
        http.getDecryptedFromServer(decryptorCallback, client_id, msg_id);
    }
};

var messageExtension = {
    init: function() {
        var messagepane = document.getElementById("messagepane");
        if(messagepane){
            messagepane.addEventListener("load", function(event) {
                messageExtension.onPageLoad(event);
            }, true);
        }
    },
    onPageLoad: function(aEvent) {
        var doc = aEvent.originalTarget; // doc is document that triggered the event
        var win = doc.defaultView; // win is the window for the doc
        var url = ioService.newURI(doc.location.href, null, null);
        // Is of type xpconnect wrapped nsIMsgDBHeader
        // But if you want to look up the actual object it is msIMsgDBHdr
        msgHdr = url.QueryInterface(Components.interfaces.nsIMsgMessageUrl).messageHeader;
        MsgHdrToMimeMessage(msgHdr, null, shouldDecryptCallback, true, {
            partsOnDemand: true,
        });
    }
};

window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    messageExtension.init();
}, false);
