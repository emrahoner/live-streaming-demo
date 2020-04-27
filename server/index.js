const os = require('os');
const express = require('express')
const http = require('http');
const socketio = require('socket.io');
const roomService = require('./room-service')

const app = express();

const httpServer = http.createServer(app)
const io = socketio(httpServer)
httpServer.listen(process.env.PORT || 8080)

// const fs = require('fs');
// const https = require('https');
// const credentials = {
//   key: fs.readFileSync('.crt/localsigned.key', 'utf8'), 
//   cert: fs.readFileSync('.crt/localsigned.crt', 'utf8')
// }
// const httpsServer = https.createServer(credentials, app)
// const io = socketio(httpsServer)
// httpsServer.listen(process.env.HTTPS_PORT || 8081);

app.use(express.static('client'))

const sockets = {}

io.sockets.on('connection', function(socket) {

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
