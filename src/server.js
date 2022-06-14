import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import socketIo from 'socket.io';

import { validationErrorHandler } from 'validation';
import { errorHandler } from 'errors';
import {
  authRouter, userRouter, resourceRouter,
} from './routers';
import { gameRouter } from './routers/game_router';

import * as constants from './helpers/constants';

require('dotenv').config();

// initialize
const app = express();

// enable/disable cross origin resource sharing if necessary
app.use(cors({ credentials: true, origin: process.env.ORIGIN }));

// enable/disable http request logging
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// declare routers
app.use('/auth', authRouter); // NOTE: Not secured
app.use('/users', userRouter); // NOTE: Completely secured to users
app.use('/resources', resourceRouter); // NOTE: Partially secured to users

// default index route
app.get('/', (req, res) => {
  res.send('Welcome to backend!');
});

// DB Setup
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
  loggerLevel: 'error',
};

// Connect the database
mongoose.connect(process.env.MONGODB_URI, mongooseOptions).then(() => {
  mongoose.Promise = global.Promise; // configures mongoose to use ES6 Promises
  if (process.env.NODE_ENV !== 'test') console.info('Connected to Database');
}).catch((err) => {
  console.error('Not Connected to Database - ERROR! ', err);
});

// Custom 404 middleware
app.use((req, res) => {
  res.status(404).json({ message: 'The route you\'ve requested doesn\'t exist' });
});

// top level error handlers
app.use(validationErrorHandler);
app.use(errorHandler);

// Set mongoose promise to JS promise
mongoose.Promise = global.Promise;

// START THE SERVER
// =============================================================================
const server = app.listen(constants.PORT);
if (process.env.NODE_ENV !== 'test') console.log(`listening on: ${constants.PORT}`);

// start socket
const io = socketIo(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add messages when sockets open and close connections
io.on('connection', (socket) => {
  console.log(`[${socket.id}] socket connected`);

  socket.on('disconnect', (reason) => {
    console.log(`[${socket.id}] socket disconnected - ${reason}`);
  });

  socket.on('gameAction', (req) => {
    gameRouter(socket, io, req);
  });
});

/*
// Broadcast the current server time as global message, every 1s
setInterval(() => {
  io.sockets.emit('time-msg', { time: new Date().toISOString() });
}, 1000);
*/

export default server;
