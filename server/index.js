const os = require('os');
const express = require('express')
const http = require('http');
const socketio = require('socket.io');
const roomService = require('./room-service')

function expressApp () {
  const app = express();
  app.use(express.static('client'))
  return app
}

function httpServer(app) {
  return http.createServer(app)
}

function httpsServer(app) {
  const fs = require('fs');
  const https = require('https');
  const credentials = {
    key: fs.readFileSync('.crt/localsigned.key', 'utf8'), 
    cert: fs.readFileSync('.crt/localsigned.crt', 'utf8')
  }
  return  https.createServer(credentials, app)
}

const https = false
const app = expressApp()
const server = https ? httpsServer(app) : httpServer(app)
const io = socketio(server)

server.listen(process.env.HTTPS_PORT || 8080);

io.sockets.on('connection', function(socket) {

  const sockets = {}

  // roomService.on('joined', function ({ room, username }) {
  //   let peers = roomService.getPeers(room.name, username)
  //   io.sockets.to(room.name).emit('peers', peers)
  // })

  // roomService.on('leaved', function ({ room, username }) {
  //   let peers = roomService.getPeers(room.name, username)
  //   io.sockets.to(room.name).emit('peers', peers)
  // })

  // convenience function to log server messages on the client
  function log(request, message) {
    console.log(message, request)
    // io.sockets.to(request.roomName).emit('log', { username: request.username, message: message });
  }
  
  socket.on('join', function(request) {
    log(request, `Received request to join room`)
    roomService.createOrJoinRoom(request.roomName, request.username)
    socket.join(request.roomName);
    sockets[request.username] = { socketId: socket.id, roomName: request.roomName }
    log(request, `Joined the room with socked id ${socket.id}`)
    socket.emit('peers', roomService.getPeers(request.roomName, request.username))
    log(request, `Sent the peer list to the joined peer`)
  });

  socket.on('offer', function(request) {
    log(request, `Received request to distribute offer`)
    io.to(sockets[request.receiver].socketId).emit('offer', request)
    log(request, `Sent the offers to all other peers`)
  });

  socket.on('answer', function(request) {
    log(request, `Received request to send answer`)
    io.to(sockets[request.receiver].socketId).emit('answer', request)
    log(request, `Sent the answer to the receiver`)
  });
 
  socket.on('candidate', function(request) {
    log(request, `Received ice candidate`)
    io.to(sockets[request.receiver].socketId).emit('candidate', request)
    log(request, `Sent ice candidate to the receiver`)
  });

  socket.on('leave', function(request) {
    log(request, `Received request to leave room`)
    roomService.leaveRoom(request.roomName, request.username)
    socket.to(request.roomName).broadcast.emit('leave', { peer: request.username })
    log(request, `Sent the leave message to other peers`)
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

});
