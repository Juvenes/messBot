'use strict';

var Person = function (_name,_id) {
  this.name = _name;
  this.id = _id;
};
const copain = [new Person("Roman","4576184389177701"),new Person("Test","123456789")];



function getname(id) {
  let mmas = "ERROR";
  copain.forEach(el  =>  id===el.id ? mmas = el.name :console.log("User not found"));
  return mmas;
};

const
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));


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
        if(getname(webhook_event.sender.id) !== "ERROR"){
          if (webhook_event.message) {
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
  let name_res = getname(sender_psid);
  // Check if the message contains text
  if (received_message.text) {    
    

    // Create the payload for a basic text message
    response = {
      "recipient":{
        "id": `"${sender_psid}"`
      },
      "message":{
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text":`Salut ${name_res},que veux-tu faire ?`,
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
                "title": "Changer % Solde",
                "payload": "CHANGE_SOLD"
              },
              {
                "type": "postback",
                "title": "Simulation",
                "payload": "SIMULATION"
              }
            ]
          }
        }
      }
    }
  }  
  
  // Sends the response message
  callSendAPI(sender_psid, response);

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}


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
  }); 
}