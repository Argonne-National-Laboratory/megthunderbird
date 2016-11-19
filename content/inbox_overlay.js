const Cu = Components.utils;
const Cc = Components.classes;
const SEARCH_TERM_HEADER = "----------- MEG search terms ------------";
const { require } = Components.utils.import(
    "resource://gre/modules/commonjs/toolkit/require.js", {}
)

Cu.import("chrome://megthunderbird/content/db.js");
Cu.import("chrome://megthunderbird/content/crypto.js");
Cu.import("chrome://megthunderbird/content/http.js");

let sha256 = require("chrome://megthunderbird/content/js/sha256.js").sha256;
let messenger = Components.classes["@mozilla.org/messenger;1"]
    .createInstance(Components.interfaces.nsIMessenger);
let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"]
    .createInstance(Components.interfaces.nsISyncStreamListener);
let ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
let searchCmd = "document.getElementById('searchInput').doSearch();"


megSearch = function(event) {
    if (event.keyCode == 13) {
        // get search input
        var parentNode = document.getElementById("searchInput");
        var anonNode = document.getAnonymousElementByAttribute(parentNode, "anonid", "input");
        if (anonNode.value == "") { return; }
        // hash input and perform search
        anonNode.value = sha256(anonNode.value);
        document.getElementById("searchInput").doSearch();
        event.preventDefault();
        event.stopPropagation();
    }
}

cmd_enableDisableSearch = function() {
    var searchInput = document.getElementById("searchInput");
    var toggle = document.getElementById("searchonoff");
    if (toggle.checked) {
        searchInput.removeEventListener("keypress", megSearch, useCapture=true);
    } else {
        searchInput.addEventListener("keypress", megSearch, capture=true);
    }
}

function Decryptor() {
    this.ss = new Storage();
    this.crypto = new Crypto(this.ss);
    this.searchFooter = "";
}

Decryptor.prototype.getMessageText = function(msgHdr, stripHTML, length) {
    let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
    let listener = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance(Ci.nsISyncStreamListener);
    let uri = msgHdr.folder.getUriForMsg(msgHdr);
    messenger.messageServiceFromURI(uri).streamMessage(
        uri, listener, null, null, false, ""
    );
    let folder = msgHdr.folder;
    var mailText = folder.getMsgTextFromStream(
        listener.inputStream, msgHdr.Charset, 2 * length,
        length, false, stripHTML, { }
    );
    var searchStart = mailText.indexOf("\n" + SEARCH_TERM_HEADER);
    this.searchFooter = mailText.slice(searchStart, mailText.length)
    return mailText.slice(0, searchStart);
}

Decryptor.prototype.stripAndStoreSearchDetails = function(plain) {
    parsed = new DOMParser().parseFromString(plain, "text/html");
    var idx = parsed.body.innerHTML.indexOf("}<");
    var json = JSON.parse(parsed.body.innerHTML.slice(0, idx + 1));
    parsed.body.innerHTML = parsed.body.innerHTML.slice(idx + 1, parsed.body.innerHTML.length);
    if (!this.ss.hasSearchSalt(json.thread_uuid)) {
        this.ss.setSalt(json.thread_uuid, json.search_salt);
    }
    var splitTerms = this.searchFooter.split("\n");
    for (i=2; i < splitTerms.length; i++) {
        if (!this.ss.hasSearchTerm(json.thread_uuid, splitTerms[i])) {
            this.ss.setSearchTerm(json.thread_uuid, splitTerms[i]);
        }
    }
    return parsed.firstChild.outerHTML;
}

Decryptor.prototype.httpCallback = function(text) {
    var message = JSON.parse(text).message;
    var plain = this.crypto.decryptText(message);
    plain = this.stripAndStoreSearchDetails(plain);
    var content = document.getElementById("messagepane").contentWindow.document;
    var div = content.getElementsByClassName("moz-text-flowed")[0]
        || content.getElementsByClassName("moz-text-plain")[0];
    div.innerHTML = plain;
}

Decryptor.prototype.decrypt = function(msgHdr) {
    var text = this.getMessageText(msgHdr, true, 32768);
    var re = /<(.+)>/;
    var author = re.exec(msgHdr.author)[1];
    var recipient = re.exec(msgHdr.recipients.trim())[1];
    var http = new HTTP();
    http.transmitEncryptedToServer(text, recipient, author);
    http.getDecryptedFromServer(this.httpCallback.bind(this), recipient, author);
}

shouldDecryptCallback = function(msgHdr, aMimeMsg) {
    if (aMimeMsg.get('x-header-1') == "MEG-Encrypted") {
        decryptor = new Decryptor();
        decryptor.decrypt(msgHdr);
    }
}

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
}

window.addEventListener("load", function load(event) {
    window.removeEventListener("load", load, false);
    messageExtension.init();
}, false)
