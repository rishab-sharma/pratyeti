import * as CryptoJS from 'crypto-js';
import {hexToBinary} from './util';
const mongo = require('./mongo.js');
const p2p = require('./p2p.js');
const gBlock = require('../genesisBlock.json');

class Block {
  constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;

    this.hash = hash;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }
}
// in seconds
const BLOCK_GENERATION_INTERVAL = 2;

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 500;

const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => {
  return CryptoJS.SHA256(index.toString() + previousHash + timestamp.toString() + data+ difficulty.toString()+ nonce.toString()).toString();
};

const calculateHashForBlock = (block) =>{
  return calculateHash(block.index, block.previousHash, block.timestamp, JSON.stringify(block.data), block.difficulty,block.nonce)
};

const genesisBlock = gBlock;
// let block_chain = [genesisBlock]; //to be replaced with mongoDB;

const getLatestBlock = (callback) => {
  // console.log("block chain tsype",  block_chain.length);
  // console.log("**************************",block_chain[block_chain.length-1]);
  mongo.getLatestBlock(function (result) {
       callback(result);
  })

};

// var generateBlock = (block_data)=> {
//   var previousBlock = getLatestBlock();
//   var nextIndex = previousBlock.index + 1;
//   var nextTimestamp = new Date();  //convert this into human readable time
//   var nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
//   var newBlock = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, blockData);
//   return newBlock;
// }
//
//
// const getBlockchain = () => {
//   return block_chain;
// };

const isValidNewBlock = (newBlock,previousBlock)=> {
  // validate new block before adding it to blockchain
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log('Invalid Index');
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log('Invalid Previous Hash');
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
    console.log('Invalid Hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
    return false;
  }
  // validate block structure
  return true && typeof newBlock.index === 'number' && typeof newBlock.hash === 'string' && typeof newBlock.previousHash === 'string' && typeof newBlock.timestamp === 'number' && typeof newBlock.data === 'object';
};

const isValidChain = (blockchainToValidate) => {
  const isValidGenesis = (block) => {
      delete block._id;
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isValidGenesis(blockchainToValidate[0])) {
      console.log("false genesis");
    return false;
  }
  for (let i = 1; i < blockchainToValidate.length; i++) {
    if (!isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
        console.log("Block Invalid i = " + i +", i+1 = " + (i+1));
      return false;
    }
  }
  return true;
};

const hashMatchesDifficulty = (hash, difficulty) => {
  console.log("Required Prefix", '0'.repeat(difficulty));
  const hashInBinary = hexToBinary(hash);
  const requiredPrefix = '0'.repeat(difficulty);

  return hashInBinary.startsWith(requiredPrefix);
};

const getDifficulty = (aBlockchain, callback) => {
  const latestBlock = aBlockchain[mongo.current_index];
  if(latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0){
      callback(getAdjustedDifficulty(latestBlock, aBlockchain));
  }else{
      callback(latestBlock.difficulty);
  }

};

const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
  const previousAdjustmentBlock = aBlockchain[mongo.current_index - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken = latestBlock.timestamp - previousAdjustmentBlock.timestamp;
  if(timeTaken> timeExpected/2){
    return previousAdjustmentBlock.difficulty > 0 ? previousAdjustmentBlock.difficulty - 1 : previousAdjustmentBlock.difficulty;

  }else if (timeTaken< timeExpected/2) {
    return previousAdjustmentBlock.difficulty +1;
  }else{
    return previousAdjustmentBlock.difficulty;
  }
};

const isValidTimestamp = (newBlock, previousBlock) => {
  return ( previousBlock.timestamp - 60 < newBlock.timestamp ) && newBlock.timestamp - 60 < getCurrentTimestamp();
};

const getCurrentTimestamp = () => new Date();


const generateNextblock = (blockData, callback) => {
  getLatestBlock(function (previousBlock) {
      // console.log("chain",block_chain);
      console.log("PrevBlock = ",previousBlock);
      mongo.getBlockchain(function (block_chain) {
          getDifficulty(block_chain, function (difficulty) {
              console.log('difficulty: ' + difficulty);
              const nextIndex = previousBlock.index + 1;
              const nextTimestamp = getCurrentTimestamp(); // This returns the new date
              const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
              addBlock(newBlock);
              callback(newBlock);
          });

      });

  });

};

const findBlock = (index , previousHash, newDate, data, difficulty)=>{
  let nonce = 0;
  let timestamp = Math.round(newDate.getTime()/1000);
  while(true){
    var hash = calculateHash(index, previousHash, timestamp, JSON.stringify(data), difficulty, nonce);
    if(hashMatchesDifficulty(hash,difficulty)){
      return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    }
    nonce++;
  };
};

const addBlock = (newBlock, callback) =>{
  getLatestBlock(function (latestBlock) {
      if(isValidNewBlock(newBlock, latestBlock)) {
          // block_chain.push(newBlock);
          mongo.addBlocktoChain(newBlock, function () {
              console.log("A Block was Added to the Chain");
              console.log("Block : " , newBlock);
              p2p.broadcastLatestBlockMessage();
              if(callback) callback(true);
          });
      }
      if(callback) callback(false);
  });
};

const getAccumulatedDifficulty = (aBlockchain) => {
  return aBlockchain.map((block) => block.difficulty)
                    .map((difficulty) => Math.pow(2,difficulty))
                    .reduce((a,b) => (a+b))
};

const replaceChain = (new_block_chain) => {
  mongo.getBlockchain(function (block_chain) {
      if(isValidChain(new_block_chain) && (getAccumulatedDifficulty(new_block_chain) > getAccumulatedDifficulty(block_chain)) ){
          console.log("Blockchain is being replaced with a new Blockchain");
          mongo.replaceOldBlockchain(new_block_chain, function () {
              p2p.broadcastLatestBlockMessage();
          })
      }else{
          console.log("Invalid Blockchain Received, thus Rejected");
      }
  });
};
// why is this code in the file??? it matches addblock but is exported
// const addBlockToChain = (newBlock) => {
//     if (isValidNewBlock(newBlock, getLatestBlock())) {
//         blockchain.push(newBlock);
//         return true;
//     }
//     return false;
// };


export {Block, generateNextblock, replaceChain}
