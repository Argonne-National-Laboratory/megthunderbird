/**
 *
 */
const Cu = Components.utils;

Cu.import("chrome://megthunderbird/content/modules/thunderbird-stdlib/SimpleStorage.js");

let ss = SimpleStorage.createCpsStyle("megthunderbird");

//window.addEventListener("load", function(e) {
//	startup();
//}, false);
//
//startup = function() {
//	var megSend = document.getElementById("meg-send");
//    // Do additional actions
//}

function bin2String(array) {
    return String.fromCharCode.apply(String, array);
}

cmd_megSendButton = function() {
    arrayInput = generateKeyData();
    strInput = transformDataForInput(arrayInput);
    generateQRCode(strInput);
}

transformDataForInput = function(input) {
    key = input[0];
    iv = input[1];
    keyStr = btoa(bin2String(key));
    ivStr = btoa(bin2String(iv));
    return keyStr.concat("&&", ivStr);
}

generateQRCode = function(input) {
    var qrcode = new QRCode("appcontent");
    qrcode.makeCode(input);
    var vbox = document.getElementById("appcontent");
    var imgs = vbox.getElementsByTagName("img");
    imgs[0].style.display = "block";
    var editors = vbox.getElementsByTagName("editor");
    editors[0].parentNode.removeChild(editors[0]);
    throw new Error(btoa(input));
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

generateKeyData = function() {
    var salt = randArr(8);
	// Obviously going to change. Probably something randomly generated
	var pass = "foobar";
    pbe = GibberishAES.openSSLKey(GibberishAES.s2a(pass), salt);
    return [pbe.key, pbe.iv];
}

randArr = function(num) {
	var result = [], i;
	for (i = 0; i < num; i++) {
		result = result.concat(Math.floor(Math.random() * 256));
	}
	return result;
}
