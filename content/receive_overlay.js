const Cu = Components.utils;
Cu.import("chrome://megthunderbird/content/modules/thunderbird-stdlib/msgHdrUtils.js");
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

decryptorCallback = function(text) {
    var message = JSON.parse(text).message;
    var plain = crypto.decryptText(message);
    var messagepane = document.getElementById("messagepane").contentWindow.document;
    var textFlowed = messagepane.getElementsByClassName("moz-text-flowed");
    textFlowed[0].text = plain;
}

var messageExtension = {
	init: function() {
		var messagepane = document.getElementById("messagepane"); // mail
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
        // TODO Eventually we will want to declare false here to not strip html
        var text = msgHdrToMessageBody(msgHdr, true, 32768);
        // TODO for now its easier to make the assumption of single recipients
        var re = /<(.+)>/;
        var author = re.exec(msgHdr.author)[1];
        var recipient = re.exec(msgHdr.recipients.trim())[1];
        var http = new HTTP();
        http.transmitEncryptedToServer(text, recipient, author);
        http.getDecryptedFromServer(
            decryptorCallback, function() {}, recipient, author
        );
    }
}

window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    messageExtension.init();
}, false)
