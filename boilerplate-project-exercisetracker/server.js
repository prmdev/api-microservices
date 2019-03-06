const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
// establish tables and schema for db
const { Schema } = mongoose;
const userSchema = new Schema({
  username: { type: String, unique: true, required: true, dropDups: true },
  userId: { type: String, unique: true, required: true, dropDups: true },
});
const userExercisesSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
var Users = mongoose.model("Users", userSchema);
var UserExercises = mongoose.model("UserExercises2", userExercisesSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// add new user or handle user being taken
app.post('/api/exercise/new-user', (req, res) => {
  // check if user exists and if not, write to db and add a userId
  let user = req.body.username;
  Users.findOne({ username: user }, (err, data) => {
    if (err) throw err;
    if (data != null) {
      res.json('Username already exists.');
    }
    // user should exist here so test it
    var addUser = new Users({ username: user, userId: shortid.generate() });
    addUser.save((err, data) => {
      if (err) throw err;
      res.json({ username: data.username, userId: data.userId });
    });
  });
});

// add exercises to users records
app.post('/api/exercise/add',  (req, res) => {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  // check if date is null or not toUTC
  let date = req.body.date;
  if (!date) { date = new Date().toDateString() }
  date = new Date(date);
  // model.findOne(userId: userId) => set username and userId == data.username && data.userId
  Users.findOne({ userId, userId }, (err, data) => {
    if (err) throw err;
    let info = data.username;
    let dbEntry = {
      userId: data.userId,
      description: description,
      duration: duration,
      date: date
    };
    var logEntry = new UserExercises(dbEntry)
    logEntry.save((err, log) => {
      if (err) console.log(err);
    });
  });
});

// log users exercise info and filter results with query parameters
app.get('/api/exercise/log?', (req, res) => {
  let userId = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = Number(req.query.limit) || 0;
  if (userId == null) { res.send("no userId given.") }
  
  Users.findOne({ userId: userId }, (err, data) => {
    let userId = data.userId;
    let user = data.username;
    
    // get and filter data where query parameters match and return results as logInfo
    UserExercises.find({ userId: userId }).where('date').gte(from ? new Date(from) : new Date(0)).lte(to ? new Date(to) : new Date()).limit(limit).exec((err, logInfo) => {
      if(err) throw err;
      let log = [];

      logInfo.forEach((item) => {
        let itemExercise = [];
        itemExercise.push(item.description);
        itemExercise.push(item.duration);
        itemExercise.push(item.date.toDateString());
        log.push(itemExercise);
      });
      let count = log.length;
      res.json({ username: user, userId: userId, exerciseLog: log, count: count });
    });
    
  });
});

// get user info
app.get('/api/exercise/users?:code', (req, res) => {
  let user = req.params.code
  Users.find({ username: user }, (err, data) => {
    if (err) throw err;
    res.json(data);
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
