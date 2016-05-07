const Cu = Components.utils;
Cu.import("chrome://megthunderbird/content/modules/thunderbird-stdlib/msgHdrUtils.js");
Cu.import("chrome://megthunderbird/content/db.js");
Cu.import("chrome://megthunderbird/content/crypto.js");
Cu.import("chrome://megthunderbird/content/http.js");

//let times = 0;
let ss = new Storage("megthunderbird");
let crypto = new Crypto(ss);

decryptorCallback = function(text) {
    var message = JSON.parse(text).message;
    var plain = crypto.decryptText(message);
    Cu.reportError(plain);
}

var messageExtension = {
	init: function() {
        // Use this or the one below??
		var messagePane = GetMessagePane();
//        for (var m in messagePane) {
//            Cu.reportError("message pane " + m);
//        }
//        Cu.reportError(messagePane.TEXT_NODE);
//        Cu.reportError(messagePane.textContext);
//        Cu.reportError(messagePane.children);
//        for (var i=0; i < messagePane.children.length; i++){
//            Cu.reportError(typeof messagePane.children[i]);
//            Cu.reportError(messagePane.children[i].constructor.name);
//            Cu.reportError(messagePane.children[i].nodeName);
//        }
		var messagepane = document.getElementById("messagepane"); // mail
//        for (var i=0; i < messagepane.children.length; i++){
//            Cu.reportError(messagePane.children[i].nodeName);
//        }
        //for (var m in messagepane) {
        //    Cu.reportError("message pane " + m);
        //}
		if(messagepane){
			messagepane.addEventListener("load", function(event) {
				messageExtension.onPageLoad(event);
			}, true);
		}
	},
	onPageLoad: function(aEvent) {
        var doc = aEvent.originalTarget; // doc is document that triggered the event
        var win = doc.defaultView; // win is the window for the doc
        //for (var m in doc) {
        //    Cu.reportError("doc " + m);
        //}
        // test desired conditions and do something
        // if (doc.nodeName != "#document") return; // only documents
        // if (win != win.top) return; //only top window.
        // if (win.frameElement) return; // skip iframes/frames
        Cu.reportError("page is loaded \n" +doc.location.href);
		let messenger = Components.classes["@mozilla.org/messenger;1"]
								  .createInstance(Components.interfaces.nsIMessenger);
		let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
							   .createInstance(Components.interfaces.nsISyncStreamListener);
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
								  .getService(Components.interfaces.nsIIOService);
		var url = ioService.newURI(doc.location.href, null, null);
        // Is of type xpconnect wrapped nsIMsgDBHeader
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
        // I don't think this will work for us. It deletes the message and thunderbird
        // isn't able to keep track of the changes after deletion. You need to restart.
        // I think we can try to figure out how to put the new messge text on top of the
        // old. It's html after all. I don't think it'll be impossible.
//        if (times < 1) {
//            msgHdrsModifyRaw([msgHdr], function(input) {
//                //We can't find the whole text because input includes newlines
//                var idx = input.search(text.slice(0,10));
//                Cu.reportError(input.slice(0, idx));
//                return input.slice(0, idx) + "\nblah blah blah blah blah";
//            });
//            times += 1;
//        }
    }
}

window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    messageExtension.init();
}, false)
