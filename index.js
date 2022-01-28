'use strict';

const res = require('express/lib/response');
const { cp } = require('fs/promises');

const Person = class {
  constructor(_name, _id) {
    this.name = _name;
    this.id = _id;
    this.choices = [];
  }
  
  isEmpty() {
    return this.choices.length === 0;
  }
  addChoice(one) {
    this.choices.push(one);
  }
  resetChoice() {
    this.choices = [];
  }
  isFullChoice() {
    return this.choices.length ===3;
  }
};

const copain = [new Person("Roman","4576184389177701"),new Person("Test","123456789")];

function getname(id) {
  return copain.find(o => o.id === id);
};

const
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () =>
  console.log('webhook is listening'));


// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
    let body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);
        if(getname(webhook_event.sender.id) !== undefined){
          if (webhook_event.message ) {
            handleMessage(webhook_event.sender.id, webhook_event.message);
          }
         else if (webhook_event.postback) {
          handlePostback(webhook_event.sender.id, webhook_event.postback);
          }
        }
        //else
      });
  
      
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });

  // Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = process.env.VERIFY_TOKEN
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
  });
console.log('NEW');


//curl -H "Content-Type: application/json" -X POST "172.20.32.1:1337/webhook" -d '{"object":"page","entry":[{"id":"12314986451231","time":1458692752478,"messaging":[{"sender":{"id":"123456789"},"recipient":{"id":"109863831597771"},"timestamp":1643208818234,"message":{"mid":"m_xRIdqid6tMwE87rHj2FfJkKmAqFsdxm80d_DF44ojXqjP4d9y79HBj2K3Fz5ukLH8hZ1HIuQTV5cDDHstqaCQA","text":"der"}}]}]}'                
// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;
  let person = getname(sender_psid);
  // Check if the message contains text
  if (received_message.quick_reply){
    handleQuick(sender_psid, received_message.quick_reply);
  }
  else{
    if ((received_message.text ==="Salut" || received_message.text ==="yo" ||received_message.text ==="salut" || received_message.text ==="reset")) {    
      // Create the payload for a basic text message
      response = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text":`Salut ${person.name},que veux-tu faire ?`,
              "buttons":[
                {
                  "type": "postback",
                  "title": "Mon solde",
                  "payload": "SOLD_CHECK"
                },
                {
                  "type": "postback",
                  "title": "Mon historique",
                  "payload": "MY_HISTORY"
                },
                {
                  "type": "postback",
                  "title": "Simulation",
                  "payload": "SIMUL"
                }
              ]
            }
          }
        }
      
    // Sends the response message
    callSendAPI(sender_psid, response);
    }  
  }
}
function handleQuick(sender_psid, quick_reply){
  let payload = quick_reply.payload;
  if (payload === 'BULLRUN' || payload === 'CRASHRUN' || payload === 'NORMAL'){
    handlePeriod(sender_psid,payload);
  }else if (payload === 'TRIX'){
    console.log("ALORS ? ")
    handleTrix(sender_psid,payload);
  }else if (payload === 'BTCUSDT'|| payload === 'AVAXUSDT'||payload === 'CHZUSDT'||payload === 'LINKUSDT'||payload === 'FTMUSDT'||payload === 'MANAUSDT'||payload === 'XPRUSDT'){
    handleCoins(sender_psid,payload);
  }
}
// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  // Get the payload for the postback
  let payload = received_postback.payload;
  // Set the response based on the postback payload
  if (payload === 'SOLD_CHECK') {
    handleSolde(sender_psid);
  } else if (payload === 'MY_HISTORY') {
    handleHistorique(sender_psid);
  } else if (payload === 'SIMUL') {
    handleSimul(sender_psid);
  }
}
function handleTrix(sender_psid,payload){
  console.log("lazebii ")
  let response;
  console.log("Ici zebii ")
  let bro =getname(sender_psid);
  bro.addChoice(payload)
 
  response = {
    "text": "Sur Quel type de perdiods veut-tu tester la simulation ?",
    "quick_replies":[
      {
        "content_type":"text",
        "title":"Bullrun",
        "payload":"BULLRUN",
        "image_url":"https://previews.123rf.com/images/asmati/asmati1602/asmati160203127/52184892-growing-signe-de-fl%C3%A8che-flat-ic%C3%B4ne-de-style-sur-fond-transparent.jpg"
      },{
        "content_type":"text",
        "title":"Crashrun",
        "payload":"CRASHRUN",
        "image_url":"https://previews.123rf.com/images/asmati/asmati1602/asmati160203126/52184888-la-baisse-de-signe-de-fl%C3%A8che-flat-ic%C3%B4ne-de-style-sur-fond-transparent.jpg"
      },{
        "content_type":"text",
        "title":"Normal(=2ans)",
        "payload":"NORMAL",
        "image_url":"http://www.publicdomainpictures.net/pictures/40000/velka/question-mark.jpg"
      }
    ]
  }
  console.log("Envoyed ")
  callSendAPI(sender_psid, response);
}


function handleSimul(sender_psid){
  let response;

  response = {
    "text": "Quel Stategie veux-tu essayer?",
    "quick_replies":[
      {
        "content_type":"text",
        "title":"TRIX ",
        "payload":"TRIX",
        "image_url":"https://iconape.com/wp-content/png_logo_vector/trix-logo.png"
      }
    ]
  }
  callSendAPI(sender_psid, response);
}

function handlePeriod(sender_psid,payload){
  let response;
  let bro =getname(sender_psid);
  bro.addChoice(payload)
  response = {
    "text": "Quel coins veux-tu simuler ?",
    "quick_replies":[
      {
        "content_type":"text",
        "title":"BTC/USD",
        "payload":"BTCUSDT",
        "image_url":"https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/1024/Bitcoin-BTC-icon.png"
      },{
        "content_type":"text",
        "title":"AVAX/USD",
        "payload":"AVAXUSDT",
        "image_url":"https://usethebitcoin.com/wp-content/uploads/2021/11/Avalanche-Crypto-Logo.jpeg"
      },{
        "content_type":"text",
        "title":"CHZ/USD",
        "payload":"CHZUSDT",
        "image_url":"https://s2.coinmarketcap.com/static/img/coins/200x200/4066.png"
      },{
        "content_type":"text",
        "title":"LINK/USD",
        "payload":"LINKUSDT",
        "image_url":"https://cdn-icons-png.flaticon.com/512/189/189688.png"
      },{
        "content_type":"text",
        "title":"FTM/USD",
        "payload":"FTMUSDT",
        "image_url":"https://icoholder.com/files/img/14d6c55d8f4100303ab82e62baf21b83.png"
      },{
        "content_type":"text",
        "title":"MANA/USD",
        "payload":"MANAUSDT",
        "image_url":"https://s2.coinmarketcap.com/static/img/coins/200x200/1966.png"
      },{
        "content_type":"text",
        "title":"XPR/USD",
        "payload":"XPRUSDT",
        "image_url":"https://www.shareicon.net/data/2016/07/08/117526_ripple_512x512.png"
      }
    ]
  }
  callSendAPI(sender_psid, response);

}
function handleCoins(sender_psid,payload){
  let response;
  let bro =getname(sender_psid);
  bro.addChoice(payload)
  if( bro.isFullChoice){
    response = {"text": "Simulation en cours ça arrive en légende"};
    callSendAPI(sender_psid, response);
    call_python(sender_psid);
  }
  else{
    response = {"text": "Zebi y'a un probleme,renvoye:salut"};
    callSendAPI(sender_psid, response);
    bro.clearChoice();
  }
}

//CALL FOR ALL 
function callSendAPI(sender_psid, response) {
  // Construct the message body 
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    //"uri": "http://192.168.0.102:1339/",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
    console.log(res.body);
  }); 

}


/// PART SOLD
function handleSolde(sender_psid){
  let response;
  callSendAPI(sender_psid, response);
}
function handleHistorique(sender_psid){
  let response;
  response = {
    "recipient":{
      "id": `${sender_psid}`
    },
    "message":{
    }
  }
  callSendAPI(sender_psid, response);
}

async function handleCalculation(sender_psid){

}
function call_python (sender_psid) {
  let bro = getname(sender_psid);
  let response;
  const promise = new Promise((resolve,reject)=>{
    const {spawn}= require("child_process");
    console.log("Lancement python")
    const pypro =spawn('python', ["vavav.py",bro.choices[2],bro.choices[1],bro.choices[0]]);
    pypro.stdout.on('data', (data)=> {
      resolve(data.toString());
  })
  pypro.stderr.on('data', (data)=> {
    reject(data.toString());
  })
  }).then(value=> {
    response = {"text": value};
    bro.resetChoice();
    callSendAPI(sender_psid, response);
    
  }).catch(err=> {
    console.log(err);
  })
  
}
