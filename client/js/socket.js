'use strict';

import logger from '/js/logger.js'
import session from '/js/user-session.js'

var socket = io.connect();

export default {
    sendMessage(message) {
        logger.log(`Sending message: ${message}`);
        socket.emit('message', message);
    },
    join(roomName, username) {
        logger.log(`Joining room "${roomName}"`);
        socket.emit('join', { roomName, username });
    },
    leave(roomName, username) {
        logger.log(`Leaving room "${roomName}"`);
        socket.emit('leave', { roomName, username });
    },
    offer(receiver, sessionDescription) {
        logger.log(`Sending offer to user '${receiver}'`);
        socket.emit('offer', { sender: session.username, receiver, sessionDescription });
    },
    answer(receiver, sessionDescription) {
        logger.log(`Sending answer to user '${receiver}'`);
        socket.emit('answer', { sender: session.username, receiver, sessionDescription });
    },
    candidate(receiver, candidate) {
        logger.log(`Sending ice candidate to user '${receiver}'`);
        socket.emit('candidate', { sender: session.username, receiver, candidate });
    },
    on(event, listener) {
        socket.on(event, listener)
    }
}
