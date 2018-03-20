'use strict';
import {Block, generateNextblock} from './blockchain';
const CryptoJS = require("crypto-js");
const express = require("express");
var Client = require('node-rest-client').Client;
const bodyParser = require('body-parser');
const path = require('path');
const p2p = require('./p2p.js');
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
    apiKey : '0b54e6fd',
    apiSecret : 'N6pIufLt7OcTrL8B'
});


const http_port = process.env.HTTP_PORT || 3001;
const p2p_port = process.env.P2P_PORT || 6001;
const mongo = require('./mongo.js');
const client = new Client();

const initHttpServer =(myHttpPort) =>{
  const app = express();
    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: false }));

    // parse application/json
    app.use(bodyParser.json());

    app.post('/send', function (req, res) {
        let phoneNumber = req.body.number;
        console.log(phoneNumber);
        nexmo.verify.request({number: phoneNumber, brand: 'Pratyati'}, (err, result) => {
            if(err) throw err;
            res.send(result);
        });
    });

    app.post('/verify', function (req, res) {
        let pin = req.body.code;
        let requestId = req.body.requestId;

        console.log(req.body);
        nexmo.verify.check({request_id: requestId, code: pin}, (err, result) => {
            if(err) {
                if(err) throw err;
            } else {
                res.send(result);
            }
        });
    });

    app.post('/smsRequest', function (req, res) {
       console.log(req.body);
    });

    app.use('/', express.static(path.join(__dirname, '../public_static')));

    app.get('/lodge_fir', (req,res)=>{
      res.sendFile(path.join(__dirname, '../public_static/user.html'));
    });

    app.get('/getBlockchain', (req,res) => {
      mongo.getBlockchain(function (result) {
          res.send(result);
      })
  });

    app.post('/mineBlock',(req,res) => {

    console.log("req body data",req.body.data);
        let obj = JSON.parse(req.body.data);

        console.log(obj);

        if(obj == null){
            console.log("empty data could not create block");
        }else{
            generateNextblock(obj, function (newBlock) {
                res.send(newBlock);
                mongo.getBlockchainForModel(function (result) {
                var args = {
                    data: {result: result},
                    headers: { "Content-Type": "application/json" }
                };
                // client.post("http://172.20.10.2:5000/bc",args,function(data,response){
                //     console.log("Blockchain sent to flask");
                //   });
                });
            });
        }

    });

    app.get('/peers', (req, res) => {
      res.send(p2p.sockets.map((s) => s._socket.remoteAddress + ':' + s._socket.remotePort));
    });

    app.post('/addPeer', (req, res) => {
      console.log(req.body);
      p2p.connectPeers(req.body.peer);
      res.send();
  });

    app.post('/testing', (req,res) => {
    // console.log(req.body);
    console.log("i got the blockchain");
    res.send();
  });

    app.listen(myHttpPort, () => {
        mongo.connect(function () {
            console.log('Listening http on port: ' + myHttpPort);
        });
    });

};

initHttpServer(http_port);
p2p.initp2pServer(p2p_port);
