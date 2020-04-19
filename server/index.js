
const port = process.env.PORT || 8080

const os = require('os');
const express = require('express')
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const roomService = require('./room-service')

server.listen(port);

app.use(express.static('client'))

const sockets = {}

io.sockets.on('connection', function(socket) {

  roomService.on('joined', function ({ room, username }) {
    let peers = roomService.getPeers(room.name, username)
    io.sockets.to(room.name).emit('peers', peers)
  })

  roomService.on('leaved', function ({ room, username }) {
    let peers = roomService.getPeers(room.name, username)
    io.sockets.to(room.name).emit('peers', peers)
  })

  // convenience function to log server messages on the client
  function log(request, message) {
    console.log(message, request)
    // io.sockets.to(request.roomName).emit('log', { username: request.username, message: message });
  }

  // socket.on('message', function(message) {
  //   log('Client said: ', message);
  //   // for a real app, would be room-only (not broadcast)
  //   socket.broadcast.emit('message', message);
  // });

  socket.on('join', function(request) {
    log(request, `Received request to join room`);
    roomService.createOrJoinRoom(request.roomName, request.username)
    sockets[request.username] = { socketId: socket.id, roomName: request.roomName }
    log(request, `Joined the room with socked id ${socket.id}`);
    socket.emit('peers', roomService.getPeers(request.roomName, request.username))
    log(request, `Sent the peer list to the joined peer`);
  });

  socket.on('offer', function(request) {
    log(request, `Received request to distribute offer`);
    io.to(sockets[request.receiver].socketId).emit('offer', request)
    log(request, `Sent the offers to all other peers`);
  });

  socket.on('answer', function(request) {
    log(request, `Received request to send answer`);
    io.to(sockets[request.receiver].socketId).emit('answer', request)
    log(request, `Sent the answer to the receiver`);
  });
 
  socket.on('candidate', function(request) {
    log(request, `Received ice candidate`);
    io.to(sockets[request.receiver].socketId).emit('candidate', request)
    log(request, `Sent ice candidate to the receiver`);
  });

  socket.on('leave', function(request) {
    log(request, `Received request to leave room`);
    roomService.leaveRoom(request.roomName, request.username)
    log(request, `Sent the answer to the receiver`);
    socket.broadcast.emit('leave', { peer: request.username })
    
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
