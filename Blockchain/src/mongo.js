const mongodb = require('mongodb').MongoClient;
const config = require('../config.json');
const db = config.database;
const url = 'mongodb://localhost:27017';
const gBlock = require('../genesisBlock.json');
const collectionName = "chain1";
module.exports = {
    connect: function (callback) {
        let self = this;
        mongodb.connect(url, (err, database) => {
            if (err) throw err;
            console.log("Connected to Database = " + db.dbname);
            self.obj = database.db(db.dbname);
            self.obj.collection(collectionName).count(function (err, result) {
                if (result >= 1) {
                    console.log("Chain Already Contains " + result + " Blocks");
                    console.log("Current Index = " + (result - 1) + "\n");
                    self.current_index = result - 1;
                    if (callback) callback();
                } else {

                    self.genesisBlock = gBlock;
                    console.log("Chain is Empty...");
                    self.addGenesisBlock(self.genesisBlock, function () {
                        if (callback) callback();
                    })
                }
            })
        });
    },

    addGenesisBlock: function (block, callback) {
        let self = this;
        self.obj.collection(collectionName).insertOne(block, function (err, result) {
            if (err) throw err;
            self.current_index = 0;
            console.log("Block Added to DB with index = " + self.current_index + "\n");
            if (callback) callback(true)
        })
    },

    addBlocktoChain: function (block, callback) {
        let self = this;
        self.obj.collection(collectionName).insertOne(block, function (err, result) {
            if (err) throw err;
            self.current_index += 1;
            console.log("Block Added to DB with index = " + self.current_index + "\n");
            if (callback) callback(true);
        })
    },

    getLatestBlock: function (callback) {
        let self = this;
        self.obj.collection(collectionName).findOne({index: self.current_index}, function (err, result) {
            if (err) throw err;
            console.log("Latest Block Found Returning It...\n");
            if (callback) {
                callback(result);
            } else {
                console.log("No CallBack Found, This Function Needs a CallBack\n");
            }
        })
    },

    // Returns Sorted Blockchain on the basis of index. Calls the callback
    // with the result array
    getBlockchain: function (callback) {
        let self = this;
        self.obj.collection(collectionName).find({}).toArray(function (err, result) {
            console.log("Found Blockchain...  Sorting");
            if (err) throw err;
            result.sort(function (a, b) {
                return a.index - b.index;
            });
            console.log("Sorted... \n");
            callback(result);
        })
    },

    // For Deleting Old Blockchain Not To be used outside this file
    deleteBlockchain: function (callback) {
        let self = this;
        self.obj.collection(collectionName).drop(function (err, result) {
            if (err) throw err;
            if (result) {
                console.log("Old Blockchain Deleted");
                callback();
            }
        });
    },

    // For Adding New Blockchain not to be used outside this file
    addNewBlockchain: function (array, callback) {
        let self = this;
        console.log("Inserting New Blockchain");
        self.obj.collection(collectionName).insertMany(array, function (err, result) {
            if (err) throw err;
            callback();
        })
    },

    // For replacing the old blockchain with new one to be used outside this file
    replaceOldBlockchain: function (newarray, callback) {
        let self = this;
        self.current_index = newarray.length - 1;
        console.log("Replace the old chain, New current_index = " + self.current_index);
        self.deleteBlockchain(function () {
            self.addNewBlockchain(newarray, function () {
                console.log("Replaced\n");
                callback();
            })
        });
    },

    getBlockchainForModel: function (callback) {
        let self = this;
        self.obj.collection(collectionName).find({}).toArray(function (err, result) {
            if(err) throw err;
            result.forEach(function (x) {
               delete x._id;
               delete x.index;
               delete x.previousHash;
               delete x.timestamp;
               x.crime = x.data.crime;
               x.lat = x.data.location[0];
               x.long = x.data.location[1];
               delete x.data;
               delete x.hash;
               delete x.difficulty;
               delete x.nonce;
            });
            if(callback) callback(result.splice(0));
        })
    }

};
