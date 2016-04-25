/**
 *
 */
const Cu = Components.utils;

Cu.import("chrome://megthunderbird/content/modules/thunderbird-stdlib/SimpleStorage.js");
//
//let ss = SimpleStorage.createCpsStyle("megthunderbird");
//
//window.addEventListener("load", function(e) {
//	startup();
//}, false);
//
//startup = function() {
//	var megSend = document.getElementById("meg-send");
//    // Do additional actions
//}
//

cmd_megSendButton = function() {
    var qrcode = new QRCode("appcontent");
    qrcode.makeCode("foobar");
    var vbox = document.getElementById("appcontent");
    var imgs = vbox.getElementsByTagName("img");
    var canvases = vbox.getElementsByTagName("canvas");
    imgs[0].style.display = "block";
    var editors = vbox.getElementsByTagName("editor");
    editors[0].parentNode.removeChild(editors[0]);
}

//
//determineQRPrompt = function() {
//    if (!ss.has(key) || !ss.has(iv)) {
//        generated = generateKeyData();
//        alert("foo");
//    }
//}
//
//transmitMessage = function() {
//
//}
//
//pollForEncrypted = function() {
//
//}
//
//generateKeyData = function() {
//    var salt = randArr(8);
//	// Obviously going to change
//	var pass = "foobar";
//	pbe = GibberishAES.openSSLKey(GibberishAES.s2a(pass), salt);
//    return {"key": pbe.key, "iv": pbe.iv};
//}
//
//randArr = function(num) {
//	var result = [], i;
//	for (i = 0; i < num; i++) {
//		result = result.concat(Math.floor(Math.random() * 256));
//	}
//	return result;
//}
