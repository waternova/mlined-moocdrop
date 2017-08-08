var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var https = require('https');
var http = require('http');
var fs = require('fs');
var auth = require('basic-auth');
var nodemailer = require('nodemailer');
var $ = jQuery = require('jquery');
require(process.cwd() + '/jquery.csv.min.js');

var Policy     = require(process.cwd() + '/app/models/policy');

var mongoose   = require('mongoose');
mongoose.connect('mongodb://cahl.berkeley.edu:1303/policies'); // ******put a /events after port to save into that db


// NEED TO CHANGE MASTER to get actual, copy over
var csvWeekly = '../MASTER_user_info.csv';  // change this to location of email csv
// var csvDaily = process.cwd() + '../studentPredictions.csv'; // change this to location of prediction csv
var csvDaily = '/deepedu/research/moocdrop/live-data/new_prediction.csv';
console.log(process.cwd());
var gmailUsername = 'berkeleyx.communications%40gmail.com'; // change to the account you want to have sending emails, escape @ as '%40'
var gmailPassword = 'AGfsdj45j&2jkfasdbjk$309vshadjkfhsadschsd32jhkjh!';
//change to match
var secretUsername = 'john';  // change: must be shared with client.html
var secretPassword = 'secret'; // change: must be shared with client.html

// making anonID to email dict
var index_csv = csvWeekly;
var anon_to_email = {};
fs.readFile(index_csv, 'UTF-8', function(err, csv) {
  $.csv.toArrays(csv, {}, function(err, data) {
    for(var i=1 , len=data.length; i<len; i++) {
      console.log(data[i][1]);
      if (data[i][1]) {
          anon_to_email[data[i][6]] = {'email': data[i][2]};
          if (data[i][3]) {
            anon_to_email[data[i][6]]['first'] = data[i][3];
          }
          if (data[i][4]) {
            anon_to_email[data[i][6]]['last'] = data[i][4];
          }
      }
      else {
        continue;
      }
    }
  });
});

// making policy dictionary
// var policy_dict = {};
// policy_dict['test'] = {'ids': ['12','54'], 'subject' : 'hello world', 'body': 'this is a test', 'name': '07/23/17 hello world', 'comp' : [15,22], 'attr' : [50,60], 'cert' : [78, 90], 'auto' : true};
// policy_dict['test2'] = {'ids': ['82','54'], 'subject' : 'hello world88', 'body': '888this is a te8st', 'name': '07/23/17 h8e8l8l8o world', 'comp' : [5,82], 'attr' : [50,80], 'cert' : [78, 80], 'auto' : false};


var transporter = nodemailer.createTransport('smtps://' + gmailUsername + ':' + encodeURI(gmailPassword) + '@smtp.gmail.com');

// These should exist on your server to use https
var pkey = fs.readFileSync('/etc/ssl/cahl.key').toString();
var pcert = fs.readFileSync('/etc/ssl/cahl.crt').toString();
var gd = [fs.readFileSync('/etc/ssl/gd_bundle.crt').toString()];

var options = {
    key: pkey,
    cert: pcert,
    ca: gd
};

// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// set our port
var port = process.env.PORT || 1336;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Accept, X-CSRFToken, chap, seq, vert");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST");
  next();
});

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
    next();
});


function checkCredentials(credentials) {
  if (!credentials || credentials.name !== secretUsername || credentials.pass !== secretPassword) {
    return false;
  } else {
    return true;
  }
}

 // on routes that end in /email
 // ----------------------------------------------------
router.route('/email')
    // get the ids for emails
    .post(function(req, res) {
      if (req.body.pass === 'sadfvkn88asVLS891') {
        for (var j = 0; j < req.body.ids.length; j++) {
          var id = req.body.ids[j];
          if (id in anon_to_email) {
              var body = req.body.body;
              body = body.replace('[:firstname:]', anon_to_email[id].first);
              body = body.replace('[:lastname:]', anon_to_email[id].last);
              body = body.replace('[:fullname:]', anon_to_email[id].first + " " + anon_to_email[id].last);
              sendEmail(anon_to_email[id].email, req.body.subject, req.body.body, req.body.reply, function (err) {
                  if (err) {
                      console.log(err);
                      console.log("email send failed");
                  }
                });
          }
          else {
            continue;
          }
        }

        res.send('sent');
      }
      else {
        res.send('Access Denied');
        res.end('Access denied');
      }
    });

function sendEmail(email, subject, content, reply, cb) {
    var mailOptions = {
        from: gmailUsername, // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        text: content, // plaintext body
        replyTo: reply
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error) {
            cb(error);
        }
        cb(null);
    });
}

router.route('/predictions').get(function(req, res) {
  var credentials = auth(req);
  if (!checkCredentials(credentials)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="cahl.berkeley.edu"');
    res.end('Access denied');
    return;
  }
  res.sendFile(csvDaily);
});

router.route('/interventions').get(function(req, res) {
  query = Policy.find({"intervention": "true" }).sort("timestamp");

  query.exec(function (err, output) {
      if (err) {
        return next(err);
      }
      else {
        res.json(output);
      }
    });
});

router.route('/announcements').get(function(req, res) {
  policy_dict = Policy.find({"intervention":"false"}).sort({"timestamp":1});
  res.json(policy_dict);
});

router.route('/save').post(function(req, res) {
  var policy = new Policy();
  console.log(req.body.name, req.body.ids, req.body.subject, req.body.body, req.body.reply, req.body.comp, req.body.attr, req.body.cert, req.body.auto, req.body.timestamp, req.body.intervention);
  if (req.body.intervention === 'true') {
    policy.ids = req.body.ids;
    policy.comp = req.body.comp;
    policy.attr = req.body.attr;
    policy.cert = req.body.cert;
    policy.auto = req.body.auto;
  }
  else {
    policy.ids = ''
    policy.comp = [];
    policy.attr = [];
    policy.cert = [];
    policy.auto = 'false'
  }
  policy.name = req.body.name;
  policy.subject = req.body.subject;
  policy.body = req.body.body;
  policy.reply = req.body.reply;
  policy.timestamp = req.body.timestamp;
  policy.intervention = req.body.intervention;

  policy.save(function(err) {
    if (err) {
      console.log("error when saving policy");
      res.end();
      return;
    }
  });
});

router.route('/delete').post(function(req, res) {
  console.log(req.body.name);
  Policy.remove({"name":req.body.name}).exec();
  res.json({ message: 'Successfully deleted' });
});

// This route exists only for testing your password
router.route('/').get(function(req, res) {
  var credentials = auth(req);
  if (!checkCredentials(credentials)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="cahl.berkeley.edu"');
    res.end('Access denied');
    return;
  }
  res.send("You logged in");
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);
//app.use(express.static('public'));
// START THE SERVER
// =============================================================================
https.createServer(options, app).listen(port);
//http.createServer(app).listen(port);
console.log('Node server start on port: ' + port);
