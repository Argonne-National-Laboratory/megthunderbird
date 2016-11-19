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

function Storage() {
    this.keyTableName = "megthunderbird_keys";
    this.searchSaltTableName = "megthunderbird_search_salts";
    this.searchTableName = "megthunderbird_search";
    this.init();
}

Storage.prototype.init = function() {
    this.dbConnection = Services.storage.openDatabase(
        FileUtils.getFile(KEY_PROFILEDIR, [FILE_SIMPLE_STORAGE])
    );
    if (!this.dbConnection.tableExists(this.keyTableName)) {
        this.dbConnection.executeSimpleSQL(
            "CREATE TABLE #1 (key TEXT PRIMARY KEY, value TEXT)".replace("#1", this.keyTableName)
        );
    }
    if (!this.dbConnection.tableExists(this.searchTableName)) {
        // XXX should probably have thread_id as and index
        this.dbConnection.executeSimpleSQL(
            "CREATE TABLE #1 (id INTEGER PRIMARY KEY NOT NULL, thread_id TEXT, search_term TEXT)".replace("#1", this.searchTableName)
        );
    }
    if (!this.dbConnection.tableExists(this.searchSaltTableName)) {
        this.dbConnection.executeSimpleSQL(
            "CREATE TABLE #1 (thread_id TEXT PRIMARY KEY, salt TEXT)".replace("#1", this.searchSaltTableName)
        );
    }
}

Storage.prototype.setKey = function(aKey, aValue) {
    let query = "INSERT INTO #1 (key, value) VALUES (:key, :value)";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.keyTableName));
    statement.params.key = aKey;
    statement.params.value = JSON.stringify({ value: aValue });
    while (statement.executeStep()) {}
}

Storage.prototype.setSalt = function(threadId, salt) {
    let query = "INSERT INTO #1 (thread_id, salt) VALUES (:key, :value)";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.searchSaltTableName));
    statement.params.key = threadId;
    statement.params.value = JSON.stringify({ value: salt });
    while (statement.executeStep()) {}
}

Storage.prototype.setSearchTerm = function(threadId, term) {
    let query = "INSERT INTO #1 (thread_id, search_term) VALUES (:key, :value)";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.searchTableName));
    statement.params.key = threadId;
    statement.params.value = term;
    while (statement.executeStep()) {}
}

Storage.prototype.hasKey = function(aKey) {
    var value = this.getKey(aKey);
    if (value == null) {
        return false;
    } else {
        return true;
    }
}

Storage.prototype.hasSearchSalt = function(threadId) {
    var value = this.getSearchSalt(threadId);
    if (value == null) {
        return false;
    } else {
        return true;
    }
}

Storage.prototype.hasSearchTerm = function(threadId, term) {
    var value = this.getSearchTerm(threadId, term);
    if (value == null) {
        return false;
    } else {
        return true;
    }
}

Storage.prototype.getKey = function(aKey) {
    let statement = this.dbConnection.createStatement(
        "SELECT value FROM #1 WHERE key = :key".replace("#1", this.keyTableName)
    );
    statement.params.key = aKey
    while (statement.executeStep()) {
        var value = statement.row.value;
    }
    statement.reset();
    return value;
}

Storage.prototype.getSearchSalt = function(threadId) {
    let statement = this.dbConnection.createStatement(
        "SELECT salt FROM #1 WHERE thread_id = :key".replace("#1", this.searchSaltTableName)
    );
    statement.params.key = threadId;
    while (statement.executeStep()) {
        var value = statement.row.salt;
    }
    statement.reset();
    return value;
}

Storage.prototype.getSearchSalts = function() {
    let statement = this.dbConnection.createStatement(
        "SELECT * FROM #1".replace("#1", this.searchSaltTableName)
    );
    var results = [];
    while (statement.executeStep()) {
        results.push({
            thread_id: statement.row.thread_id,
            salt: JSON.parse(statement.row.salt).value
        });
    }
    statement.reset();
    return results;
}

Storage.prototype.getSearchTerm = function(threadId, term) {
    let statement = this.dbConnection.createStatement(
        "SELECT search_term FROM #1 WHERE thread_id = :key AND search_term = :value".replace("#1", this.searchTableName)
    );
    statement.params.key = threadId;
    statement.params.value = term;
    while (statement.executeStep()) {
        var value = statement.row.search_term;
    }
    statement.reset();
    return value;
}

Storage.prototype.getSearchTerms = function() {
    let statement = this.dbConnection.createStatement(
        "SELECT search_term FROM #1".replace("#1", this.searchTableName)
    );
    var results = [];
    while (statement.executeStep()) {
        results.push(statement.row.search_term);
    }
    statement.reset();
    return results;
}

Storage.prototype.removeKey = function(aKey) {
    let query = "DELETE FROM #1 WHERE key = :key";
    let statement = this.dbConnection.createStatement(query.replace("#1", this.keyTableName));
    statement.params.key = aKey;
    // TODO need to figure out err handling. Or you can always just use SimpleSQL
    while (statement.executeStep()) {}
}

Storage.prototype.close = function() {
    this.dbConnection.close();
}
