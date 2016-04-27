/**
 *
 */
// I don't like globals but I don't think I can get around it here.
var keyStr;
var dbAESkey = "aeskeyStr";
const Cu = Components.utils;

Cu.import("chrome://megthunderbird/content/db.js");

let ss = new Storage("megthunderbird");
ss.init();

function bin2String(array) {
    return String.fromCharCode.apply(String, array);
}

cmd_megSendButton = function() {
    if (!ss.has(dbAESkey)) {  // No QR code present. User must scan it
        var input = generateKeyData();
        transformDataForInput(input);
        generateQRCode();
    } else {  // QR code exists. Must transmit message

    }
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
    ss.set(dbAESkey, keyStr)
}

transformDataForInput = function(input) {
    var key = input[0];
    var iv = input[1];
    keyStr = btoa(bin2String(key));
    var ivStr = btoa(bin2String(iv));
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

transmitMessage = function() {

}

pollForEncrypted = function() {

}

generateKeyData = function() {
    var salt = randArr(8);
    // 25 characters max so 27 because 27 - 2 = 25.
	var pass = Math.random().toString(36).substring(2, 27);
    var pbe = GibberishAES.openSSLKey(GibberishAES.s2a(pass), salt);
    return [pbe.key, pbe.iv];
}

randArr = function(num) {
	var result = [], i;
	for (i = 0; i < num; i++) {
		result = result.concat(Math.floor(Math.random() * 256));
	}
	return result;
}
