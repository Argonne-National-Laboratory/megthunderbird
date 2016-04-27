/**
 * This is based off work in thunderbird-stdlib by Jonathan Protz but is performed
 * in a synchronous manner instead of asynchronously.
 */

var EXPORTED_SYMBOLS = ['Storage']

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

const KEY_PROFILEDIR = "ProfD";
const FILE_SIMPLE_STORAGE = "simple_storage.sqlite";

function Storage(aTblName) {
    this.tableName = aTblName;
}

Storage.prototype.init = function() {
    this.dbConnection = Services.storage.openDatabase(
        FileUtils.getFile(KEY_PROFILEDIR, [FILE_SIMPLE_STORAGE])
    );
    if (!this.dbConnection.tableExists(this.tableName)) {
        this.dbConnection.executeSimpleSQL(
          "CREATE TABLE #1 (key TEXT PRIMARY KEY, value TEXT)".replace("#1", this.tableName)
        );
    }
}

Storage.prototype.set = function(aKey, aValue) {
    // TODO Later we can perform the update step if the user screws up their
    // registration
    let query = "INSERT INTO #1 (key, value) VALUES (:key, :value)";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.tableName));
    statement.params.key = aKey;
    statement.params.value = JSON.stringify({ value: aValue });
    // TODO figure out err handling or use SimpleSQL
    while (statement.executeStep()) {}
}

Storage.prototype.has = function(aKey) {
    var value = this.get(aKey);
    if (value == null) {
        return false;
    } else {
        return true;
    }
}

Storage.prototype.get = function(aKey) {
    let statement = this.dbConnection.createStatement(
        "SELECT value FROM #1 WHERE key = :key".replace("#1", this.tableName)
    );
    statement.params.key = aKey
    while (statement.executeStep()) {
        var value = statement.row.value;
    }
    statement.reset();
    return value;
}

Storage.prototype.remove = function(aKey) {
    let query = "DELETE FROM #1 WHERE key = :key";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.tableName));
    statement.params.key = aKey;
    // TODO need to figure out err handling. Or you can always just use SimpleSQL
    while (statement.executeStep()) {}
}
