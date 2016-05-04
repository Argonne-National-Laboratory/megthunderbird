/**
 * Performs crypto functions for the MEG client. This isn't perfect OOP but we
 * can refactor later.
 */

var EXPORTED_SYMBOLS = ['Crypto'];

const { require } = Components.utils.import(
    "resource://gre/modules/commonjs/toolkit/require.js", {}
)
var GibberishAES = require(
    "chrome://megthunderbird/content/js/gibberish-aes-1.0.0.js"
);

const b64encode = btoa;
const b64decode = atob;

const DB_AES_KEY = "aeskeyStr";
const DB_SALT_KEY = "salt";

binToString = function(array) {
  return String.fromCharCode.apply(null, array);
}

function Crypto(dbConnection) {
    this.ss = dbConnection;
}

Crypto.prototype.getAESData = function() {
    var keyData = this.ss.get(DB_AES_KEY);
    var arr = JSON.parse(keyData).value.split("&&");
    var saltData = this.ss.get(DB_SALT_KEY);
    var salt = b64decode(JSON.parse(saltData).value);
    var key = GibberishAES.Base64.decode(arr[0]);
    var iv = GibberishAES.Base64.decode(arr[1]);
    return {key: key, iv: iv, salt: salt};
}

Crypto.prototype.hasKey = function() {
    return this.ss.has(DB_AES_KEY);
}

Crypto.prototype.decryptText = function(text) {
    var keyData = this.getAESData();
    // This is not a generic Base64 implementation and is specifically
    // designed to work on encoding / decoding data for use in these
    // algorithms
    text = GibberishAES.Base64.decode(text);
    return GibberishAES.rawDecrypt(text, keyData.key, keyData.iv);
}

Crypto.prototype.encryptText = function(text) {
    var keyData = this.getAESData();
    // Kinda stealing some code straight out of GibberishAES.
    // we can add the implementation of writing out Salted__ later if we want
    var cipherBlocks = GibberishAES.rawEncrypt(
        GibberishAES.s2a(text), keyData.key, keyData.iv
    );
    // Show bytes so I can get a look @ padding
    return GibberishAES.Base64.encode(cipherBlocks);
}

Crypto.prototype.transformDataForInput = function(input) {
    this.keyStr = b64encode(binToString(input.key));
    var ivStr = b64encode(binToString(input.iv));
    this.keyStr = this.keyStr.concat("&&", ivStr);
    return this.keyStr;
}

Crypto.prototype.generateKeyData = function() {
    this.salt = this.randArr(8);
    // 25 characters max so 27 because 27 - 2 = 25.
	var pass = Math.random().toString(36).substring(2, 27);
    var pbe = GibberishAES.openSSLKey(GibberishAES.s2a(pass), this.salt);
    return {key: pbe.key, iv: pbe.iv};
}

Crypto.prototype.randArr = function(num) {
	var result = [], i;
	for (i = 0; i < num; i++) {
		result = result.concat(Math.floor(Math.random() * 256));
	}
	return result;
}

Crypto.prototype.storeKey = function() {
    this.ss.set(DB_AES_KEY, this.keyStr);
    this.ss.set(DB_SALT_KEY, b64encode(this.salt));
}
