const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const User = require('./models/user');
const Exercise = require('./models/exercise');
mongoose.set('useCreateIndex', true);
const app = express();
const port = process.env.PORT;
const mongoDB = `mongodb+srv://${process.env.MUSER}:${process.env.MPASS}${process.env.CLUSTER}`
mongoose.connect(mongoDB, {useNewUrlParser: true});
const db = mongoose.connection;

db.on('error', (err) => { console.log('MongoDB connection error', err); 
}
 
);
db.once('open', () => { console.log('MongoDB connected.'); });

app.use(cors({ optionSuccessStatus: 200 }));  // some legacy browsers choke on 204

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

// Create new User route
app.post('/api/exercise/new-user', (req, res) => {
  const username = req.body.username;
  if (username === '') {
    res.send('Username must not be blank');
  } else {
    const newUser = new User({
      username,
    });
    console.log("newUser is " + newUser);
    newUser.save((err, data) => {
      if (err) {
        if (err.name === 'MongoError' && err.code === 11000) { // Duplicate key error
          res.send('Duplicate username, try a different username');
        } else {
          console.log(err);
          res.send({"error":'Error occurred while saving user'});
        }
      } else {
        res.json(data);
      }
    });
  }
});
app.post('/api/exercise/add', (req, res) => {
  const description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  let userId = req.body.userId;
  if (userId === undefined || description === undefined || duration === undefined) {
    res.send('Required Field(s) are missing.');
  } else if (userId === '' || description === '' || duration === '') {
    res.send('Required Field(s) are blank.');
  } else if (isNaN(duration)) {
    res.send('Duration must be a number');
  } else {
    // Find userId 
      User.findById( userId , (err, user) => {
        if (err) {
          res.send('Error while searching for userId, try again');
        } else if (!user) {
          res.send(`User : ${userId}  not found`);
        } else {
      // Valiidations passed, convert duration
        duration = Number(duration);
      // Valiidations passed, convert date
        if (date === '') {
          date = new Date();
        } else {
          date = Date.parse(date);
        }

        const newExercise = new Exercise({
          userId,
          description,
          duration,
          date,
        });

        newExercise.save((errSave, data) => {
          if (errSave) {
            res.send('Error occurred while saving exercise');
          } else {
            res.json(data);
          }
        });
      }
    });
  }
});

app.get('/api/exercise/users', (req, res) => {
  User.find( ).exec((err, users) =>{
    if(err) {
      res.send("Error");
    }else{
      res.json(users);
    }
  });
});

app.get('/api/exercise/:log', (req, res) => {
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  let userId = req.query.userId;
  const query = {};

  if (userId === undefined) {
    res.send('Required Field(s) are missing....');
  } else if (userId === '') {
    res.send('Required Field(s) are blank.');
  } else if (from !== undefined && isNaN(Date.parse(from)) === true) {
    res.send("'From date' is not a valid date");
  } else if (to !== undefined && isNaN(Date.parse(to)) === true) {
    res.send("'To date' is not a valid date");
  } else if (limit !== undefined && isNaN(limit) === true) {
    res.send('Limit is not a valid number');
  } else if (limit !== undefined && Number(limit) < 1) {
    res.send('Limit must be greater than 0');
  } else {
    // Find userId 
      User.findById( userId , (err, user) => {
      if (err) {
        res.send('Error while searching for User');
      } else if (!user) {
        res.send('User not found');
      } else {
        query.userId = userId;
        if (from !== undefined) {
          from = new Date(from);
          query.date = { $gte: from};
        }

        if (to !== undefined) {
          to = new Date(to);
          to.setDate(to.getDate() + 1); // Add 1 day to include date
          query.date = { $lt: to};
        }

        if (limit !== undefined) {
          limit = Number(limit);
        }

        Exercise.find(query).select('userId description date duration ').limit(limit).exec((errExercise, exercises) => {
          if (err) {
            res.send('Error while searching for exercises, try again');
          } else if (!user) {
            res.send('Exercises not found');
          } else {
            res.json(exercises);
          }
        });
      }
    });
  }
});




app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
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

const listener = app.listen(process.env.PORT || 5000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
