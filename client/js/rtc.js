'use strict';

import session from '/js/user-session.js'
import logger from '/js/logger.js'
import socket from '/js/socket.js';
import eventEmitter from '/js/event-emitter.js'

const config = {
    'iceServers': [{
            'urls': 'stun:stun.l.google.com:19302'
        }
        // ,
        // {
        //     'urls': 'turn:live-streaming-coturn.australiaeast.azurecontainer.io:3478/?transport=udp',
        //     'credential': 'pass',
        //     'username': 'user'
        // },
        // {
        //     'urls': 'turn:live-streaming-coturn2.australiaeast.azurecontainer.io:3478/?transport=tcp',
        //     'credential': 'pass',
        //     'username': 'user'
        // }
        // ,
        // {
        //     'urls': 'turn:live-streaming-ice.australiaeast.azurecontainer.io:3478/?transport=udp'
        // },
        // {
        //     'urls': 'turn:live-streaming-ice.australiaeast.azurecontainer.io:3478/?transport=tcp'
        // }
    ]
};

const peerConnections = {}

function createPeerConnections(rtc, peers, localStream) {
    logger.log(`Creating peer connections for the received peers`)
    peers.forEach(peer => {
        if (peer.username !== session.username) {
            if (peerConnections[peer.username]) {
                peerConnections[peer.username].close()
                logger.log(`Closed peer connection for user '${peer.username}'`)
            }
            peerConnections[peer.username] = createPeerConnection(rtc, peer.username, localStream)
            createOffer(peer.username, peerConnections[peer.username])
        }
    });
}

function createPeerConnection(rtc, peer, localStream) {
    const conn = new RTCPeerConnection(config)
    conn.onicecandidate = (event) => {
        logger.log(`Triggered ice candidate event`, event)
        if (event.candidate) {
            socket.candidate(peer, event.candidate)
        }
    }
    conn.onaddstream = (event) => {
        logger.log(`Added remote stream for user '${peer}'`);
        rtc.emit('remoteStreamCreated', { peer, stream: event.stream })
    }
    conn.onremovestream = (event) => {
        logger.log(`Removed remote stream for user '${peer}'`, event);
    }
    conn.onconnectionstatechange = (event) => {
        logger.log(`Changed connection state for user '${peer}'`, event);
        if(event.target.connectionState === 'disconnected') {
            peerConnections[peer].close()
            logger.log(`Closed peer connection for user '${peer}'`)

            rtc.emit('closeConnection', { peer })
        }
    }
    logger.log(`Created peer connection for the user '${ peer }'`)
    conn.addStream(localStream)
    logger.log(`Set the local stream for the user '${ peer }'`)
    return conn
}

function createOffer(peer, conn) {
    conn.createOffer()
        .then(sessionDescription => {
            conn.setLocalDescription(sessionDescription)
            logger.log(`Created offer for the user '${ peer }'`)
            socket.offer(peer, sessionDescription)
        })
        .catch(error => {
            logger.error('Error during createOffer', e)
        })
}

function createAnswer(peer, conn) {
    conn.createAnswer()
        .then(sessionDescription => {
            conn.setLocalDescription(sessionDescription)
            logger.log(`Created answer for the user '${ peer }'`)
            socket.answer(peer, sessionDescription)
        })
        .catch(error => {
            logger.error('Error during createAnswer', error)
        })
}

export default eventEmitter.mixin({
    init() {
        navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            })
            .then(stream => {
                logger.log('Local stream is created')
                this.localStream = stream
                this.emit('localStreamCreated', { stream })
                socket.join(session.room, session.username)
            })
            .catch(e => {
                logger.error('Error during getUserMedia', e)
            });

        socket.on('candidate', response => {
            let candidate = new RTCIceCandidate({
                sdpMLineIndex: response.candidate.sdpMLineIndex,
                candidate: response.candidate.candidate
            })
            peerConnections[response.sender].addIceCandidate(candidate);
        })

        socket.on('peers', (peers) => {
            createPeerConnections(this, peers, this.localStream)
        })

        socket.on('offer', (response) => {
            if (response.receiver !== session.username) {
                logger.error(`Offer is delivered to wrong user. Actual receiver is '${ response.receiver }' from '${ response.sender }'`)
                return
            }
            if (!response || !response.sender || !response.sessionDescription) {
                logger.error(`Invalid response for offer`, response)
                return
            }
            if (peerConnections[response.sender]) {
                peerConnections[response.sender].close()
            }
            peerConnections[response.sender] = createPeerConnection(this, response.sender, this.localStream)
            peerConnections[response.sender].setRemoteDescription(new RTCSessionDescription(response.sessionDescription));
            createAnswer(response.sender, peerConnections[response.sender])
        })

        socket.on('answer', (response) => {
            if (response.receiver !== session.username) {
                logger.error(`Answer is delivered to wrong user. Actual receiver is '${ response.receiver }' from '${ response.sender }'`)
                return
            }
            if (!response || !response.sender || !response.sessionDescription) {
                logger.error(`Invalid response for answer`, response)
                return
            }
            if (!peerConnections[response.sender]) {
                logger.error(`Doesn't have peer connection to get answer for user '${response.sender}'`)
            }
            
            logger.log(`Got answer for session description from user '${response.sender}'`)
            peerConnections[response.sender].setRemoteDescription(new RTCSessionDescription(response.sessionDescription))
            logger.log(`Set remote session description for user '${response.sender}'`)
        })

        socket.on('leave', (response) => {
            if (response.peer === session.username) {
                logger.error(`Leave message is delivered to me as me.`)
                return
            }
            if (!peerConnections[response.peer]) {
                logger.error(`Doesn't have peer connection to close for user '${response.peer}'`)
            }

            logger.log(`Got leave message from user '${response.peer}'`)
            peerConnections[response.peer].close()
            logger.log(`Closed peer connection for user '${response.peer}'`)

            this.emit('closeConnection', { peer: response.peer })
        })
    }
})
