'use strict';
import {isValidChain, replaceChain} from "./blockchain";

const WebSocket = require("ws");
const mongo = require("./mongo.js");

module.exports = {
    sockets : [],

    messageType : {
      QUERY_LATEST: 0,
      QUERY_ALL: 1,
      RESPONSE_BLOCKCHAIN: 2
    },

    initp2pServer : function (port) {
      let self = this;
      let server = new WebSocket.Server({port : port});
      console.log("P2P Server Listening on Port = " , port);
      server.on('connection', function (ws) {
          self.initConnection(ws);
      })
    },

    connectPeers : function (newPeer) {
        let self = this;
        const ws = new WebSocket(newPeer);
        ws.on('open', () => {
            self.initConnection(ws);
        });
        ws.on('error', () => {
            console.log('connection failed');
        });
    },

    initConnection : function (connected_ws) {
      let self = this;
      self.sockets.push(connected_ws);
      self.initMessageHandler(connected_ws);
      self.initErrorHandler(connected_ws);
      let msgtbsent = {'type': self.messageType.QUERY_LATEST};
      self.messageSend(connected_ws, msgtbsent);
    },

    initMessageHandler : function (connected_ws) {
        let self = this;
        connected_ws.on('message', function (data) {
            let JSON_Data = JSON.parse(data);
            let message_type = JSON_Data.type;
            switch (message_type){
                case self.messageType.QUERY_LATEST :
                    self.responseLatestBlock(connected_ws);
                    break;
                case self.messageType.QUERY_ALL :
                    self.responseBlockchain(connected_ws);
                    break;
                case self.messageType.RESPONSE_BLOCKCHAIN :
                    self.handleResponseBlockchain(JSON_Data);
                    break;
            }
        });
    },
    
    initErrorHandler : function (connected_ws) {
        let self = this;
        connected_ws.on('close', function () {
            self.sockets.splice(self.sockets.indexOf(connected_ws), 1);
            console.log("\n\n\n\nConnection to Socket = " + connected_ws.url + " Broken\n\n\n\n");
        });
        connected_ws.on('error', function () {
            self.sockets.splice(self.sockets.indexOf(connected_ws), 1);
            console.log("\n\n\n\nConnection to Socket = " + connected_ws.url + " Broken\n\n\n\n");
        })
    },
    
    messageSend : function (receiver, message) {
        receiver.send(JSON.stringify(message));
    },
    
    responseLatestBlock : function (receiver) {
        let self = this;
        mongo.getLatestBlock(function (latest_block) {
            let msg = {
                'type' : self.messageType.RESPONSE_BLOCKCHAIN,
                'data' : JSON.stringify([latest_block])
            };
            self.messageSend(receiver, msg);
        })
    },

    responseBlockchain : function (receiver) {
        let self = this;
        mongo.getBlockchain(function (chain) {
            let msg = {
                'type' : self.messageType.RESPONSE_BLOCKCHAIN,
                'data' : JSON.stringify(chain)
            };
            self.messageSend(receiver, msg);
        })
    },

    handleResponseBlockchain : function (message) {
        let self = this;
        let receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
        let latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        mongo.getLatestBlock(function (latest_block) {
           if(latestBlockReceived.index > latest_block.index){
               console.log("Received Block chain May be Longer... We Got : " + latest_block.index + " & Peer Got : " + latestBlockReceived.index);
               if(latest_block.hash === latestBlockReceived.previousHash){
                   console.log("Block Received is Correct, We Can Append it...");
                   mongo.addBlocktoChain(latestBlockReceived, function () {
                      self.broadcastLatestBlockMessage();
                   });
               }else if(receivedBlocks.length === 1){
                   console.log("There Looks Some Discrepency... We have to query the chain from our peer");
                   self.broadcastQueryAllMessage();
               }else{
                   console.log("Received blockchain is longer than current blockchain, We May Replace It...");
                   replaceChain(receivedBlocks);
               }
           }else{
               console.log('received blockchain is not longer than current blockchain. Do nothing');
           }
        });
    },

    // checkAndReplaceChain : function (chain, current_chain_length) {
    //     let self = this;
    //
    //     if(isValidChain(chain) && chain.length > current_chain_length){
    //         console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
    //         mongo.replaceOldBlockchain(chain, function () {
    //            self.broadcastLatestBlockMessage();
    //         });
    //     }else{
    //         console.log('Received blockchain invalid');
    //     }
    // },

    broadcastLatestBlockMessage : function () {
        let self = this;
        self.sockets.forEach(socket => self.responseLatestBlock(socket));
    },

    broadcastQueryAllMessage : function () {
        let self = this;
        let message_to_be_sent = {'type': self.messageType.QUERY_ALL};
        self.sockets.forEach(socket => self.messageSend(socket, message_to_be_sent));
    }
};