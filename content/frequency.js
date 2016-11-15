var EXPORTED_SYMBOLS = ['Analysis']
var stopWords = [
	"i",
	"me",
	"my",
	"myself",
	"we",
	"our",
	"ours",
	"ourselves",
	"you",
	"your",
	"yours",
	"yourself",
	"yourselves",
	"he",
	"him",
	"his",
	"himself",
	"she",
	"her",
	"hers",
	"herself",
	"it",
	"its",
	"itself",
	"they",
	"them",
	"their",
	"theirs",
	"themselves",
	"what",
	"which",
	"who",
	"whom",
	"this",
	"that",
	"these",
	"those",
	"am",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"having",
	"do",
	"does",
	"did",
	"doing",
	"a",
	"an",
	"the",
	"and",
	"but",
	"if",
	"or",
	"because",
	"as",
	"until",
	"while",
	"of",
	"at",
	"by",
	"for",
	"with",
	"about",
	"against",
	"between",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"to",
	"from",
	"up",
	"down",
	"in",
	"out",
	"on",
	"off",
	"over",
	"under",
	"again",
	"further",
	"then",
	"once",
	"here",
	"there",
	"when",
	"where",
	"why",
	"how",
	"all",
	"any",
    "lot",
	"both",
	"each",
	"few",
	"more",
	"most",
	"other",
	"some",
	"such",
	"no",
	"nor",
	"not",
	"only",
	"own",
	"same",
	"so",
	"than",
	"too",
	"very",
	"s",
	"t",
	"can",
    "alot",
	"will",
	"just",
	"don",
	"should",
	"now",
	"d",
	"ll",
	"m",
	"o",
	"re",
	"ve",
	"y",
	"ain",
	"aren",
	"couldn",
	"didn",
	"doesn",
	"hadn",
	"hasn",
	"haven",
	"isn",
	"ma",
	"mightn",
	"mustn",
	"needn",
	"shan",
	"shouldn",
	"wasn",
	"weren",
	"won",
	"wouldn",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
]

function Analysis(text) {
    this.text = text.split(/[;:?!\t\s\n,\.]/);
    for (i=0; i < this.text.length; i++) {
        this.text[i] = this.text[i].toLowerCase();
    }
    this.counter = {};
}

Analysis.prototype.filter = function() {
	var re = new RegExp("\'[ts]");
    var toUse = [];
	for (i=0; i < this.text.length; i++) {
        // filter contractions
        this.text[i] = this.text[i].replace(re, "");
        if (stopWords.indexOf(this.text[i]) == -1 & this.text[i] != "") {
            toUse.push(this.text[i]);
        }
	}
    this.text = toUse;
}

// Eventually we can convert to tf-idf, but we need
// a corpus of documents with a db first. I think some
// of this is out of scope, so let's just do frequency analysis
// with stop words.
//
// will also be vulnerable to misspellings
Analysis.prototype.analyze = function() {
	this.filter();
    for (i=0; i < this.text.length; i++) {
        if (this.text[i] in this.counter) {
            this.counter[this.text[i]] += 1;
        } else {
            this.counter[this.text[i]] = 1;
        }
    }
}

Analysis.prototype.top3 = function() {
	this.analyze();
    var kv = [];
    for (key in this.counter) {
        kv.push([key, this.counter[key]]);
    }
    kv.sort(function(a, b){ return a[1] - b[1] });
    kv.reverse();
    var tmp = kv.slice(0, 3);
    var top3 = [];
    for (i=0; i < tmp.length; i++) {
        top3.push(tmp[i][0]);
    }
    return top3;
}
