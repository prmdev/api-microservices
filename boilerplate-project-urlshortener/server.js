'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const validUrl = require('valid-url');
const shortid = require('shortid');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGO_URI);
const { Schema } = mongoose;
const urlShortenSchema = new Schema({
  originalUrl: String,
  shortUrl: String
});
var UrlShorten = mongoose.model("UrlShorten", urlShortenSchema);


app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// after record is created search for entry and return redirect from get request from specific URL
app.get("/shortUrl/:code", function (req, res) {
  // this will search db for items and return corresponding originalUrl or err out
  let shortCode = req.params.code
  UrlShorten.findOne({ shortUrl: shortCode }, function(err, data) {
    if (err) { res.json(err) }
    let OGUrl = data.originalUrl
    res.redirect(OGUrl)
  });
});

app.post("/api/shorturl/new", function(req, res) {
    // store the forms url in variable for testing
    let originalUrl = req.body.url;
    // check if valid url to begin with
    if (!validUrl.isUri(originalUrl)) { 
      res.json({"error": "invalid URL"});
    }
    // handle data submission to mongo and shortened url here
    UrlShorten.findOne({ originalUrl: originalUrl }, function(err, data) {
      if (err) { res.json(err) }
      if (data == null) {
        // insert record into mongodb document
        let shortId = shortid.generate();
        var shortenMe = new UrlShorten({ originalUrl: originalUrl, shortUrl: shortId });
        shortenMe.save(function (err) {
          if (err) { res.json(err) }
        });
        res.write('<p>Record saved for ' + originalUrl + '</p>');
        res.write('<p>Please go to <a href="' + originalUrl + '">' + (req.headers.host + '/shortUrl/' + shortId) + '</a> to be redirected to ' + originalUrl + '</p>'); 
        res.end();
      } else {
        res.write('<p>go to <a href="' + data.originalUrl + '">' + (req.headers.host + '/shortUrl/' + data.shortUrl) + '</a> to be redirected to ' + data.originalUrl + '</p>');
        res.write('<p>Doesnt seem to shorten it that much :P</p>');  
        res.end();
      }
    });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});