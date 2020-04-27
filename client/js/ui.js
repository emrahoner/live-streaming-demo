'use strict';

import socket from '/js/socket.js'
import session from '/js/user-session.js'
import rtc from '/js/rtc.js'
import logger from '/js/logger.js'

const pages = {
    roomSelection: {
        elem: document.getElementById('room-selection'),
        joinButton: document.getElementById('joinButton'),
        username: document.getElementById('username'),
        roomName: document.getElementById('roomName')
    },
    streamingRoom: {
        elem: document.getElementById('streaming-room'),
        videoStreams: document.getElementById('video-streams'),
        peerList: document.getElementById('peers-list'),
        usernameLabel: document.getElementById('username-label'),
        roomLabel: document.getElementById('room-label'),
        logs: document.getElementById('logs'),
        soundButton: document.getElementById('sound-on-off'),
        cameraButton: document.getElementById('camera-on-off'),
        changeLayoutButton: document.getElementById('change-layout'),
        leaveRoomButton: document.getElementById('leave-room'),
    }
}

const peerList = {}
let localStream

function addVideo(name, stream) {
    if(peerList[name] && peerList[name].video) {
        peerList[name].video.srcObject = stream
    } else {
        const container = document.createElement('div')
        container.classList.add('col-6')
        const video = document.createElement('video')
        video.setAttribute('autoplay', true)
        video.setAttribute('playsinline', true)
        video.srcObject = stream
        container.appendChild(video)

        pages.streamingRoom.videoStreams.appendChild(container)

        peerList[name] = { ...(peerList[name] || {}), name, video, container }
    }
}

function removeVideo(name) {
    if(peerList[name] && peerList[name].container) {
        pages.streamingRoom.videoStreams.removeChild(peerList[name].container)
        peerList[name].container = null
        peerList[name].video = null
    }
}

function addListItem(peer) {
    if(!peerList[peer] || !peerList[peer].listItem) {
        let listItem = document.createElement('li')
        listItem.classList.add('list-group-item')
        listItem.innerHTML = peer

        pages.streamingRoom.peerList.appendChild(listItem)

        peerList[peer] = { ...(peerList[peer] || {}), listItem }
    } 
}

function removeListItem(peer) {
    if(peerList[peer] && peerList[peer].listItem) {
        pages.streamingRoom.peerList.removeChild(peerList[peer].listItem)
        peerList[peer].listItem = null
    }
}

export default {
    init() {
        this.audio = true
        this.video = true

        for(let page in pages) {
            pages[page].elem.style.display = 'none'
        }
        pages.roomSelection.elem.style.display = 'block'

        pages.roomSelection.joinButton.addEventListener('click', this.joinRoom.bind(this))
        pages.streamingRoom.soundButton.addEventListener('click', this.toggleAudio.bind(this))
        pages.streamingRoom.cameraButton.addEventListener('click', this.toggleVideo.bind(this))
        pages.streamingRoom.leaveRoomButton.addEventListener('click', this.leaveRoom.bind(this))

        logger.on('log', log => {
            var result = `<div style="color: ${ log.type === 'error' ? 'red' : 'black' }">${ log.args.reduce((prev, curr) => prev === "" ? curr : prev + `<div style="padding-left: 20px">${ JSON.stringify(curr) }</div>`, "") }</div>`
            pages.streamingRoom.logs.innerHTML = result + pages.streamingRoom.logs.innerHTML
        })

        window.addEventListener('beforeunload', () => {
            if(session.room && session.username) {
                socket.leave(session.room, session.username)
            }
        })
        window.addEventListener('unload', () => {
            if(session.room && session.username) {
                socket.leave(session.room, session.username)
            }
        })
        window.addEventListener('pagehide', () => {
            if(session.room && session.username) {
                socket.leave(session.room, session.username)
            }
        })

        window.onerror = function(message, source, lineno, colno, error) {
            logger.error(message, source, lineno, colno, error)
        }

        socket.on('peers', (peers) => {
            peers.forEach(peer => {
                addListItem(peer.username)
            });
        })
        rtc.on('localStreamUpdated', ({ stream }) => {
            localStream = stream
            addVideo('local', localStream)
        })
        rtc.on('remoteStreamUpdated', ({ peer, stream }) => {
            addVideo(peer, stream)
            addListItem(peer)
        })
        rtc.on('closeConnection', ({ peer }) => {
            removeVideo(peer)
            removeListItem(peer)
        })
    },
    joinRoom() {
        const username = pages.roomSelection.username.value
        const roomName = pages.roomSelection.roomName.value
        if(!username || !roomName) {
            this.error('Enter username and room name')
            return
        }
        rtc.init()
        pages.streamingRoom.usernameLabel.innerText = username
        pages.streamingRoom.roomLabel.innerText = roomName
        this.goToPage('streamingRoom')
        session.create(username, roomName)
    },
    leaveRoom() {
        rtc.close()
        pages.roomSelection.username.value = ''
        pages.roomSelection.roomName.value = ''
        this.goToPage('roomSelection')
    },
    toggleAudio() {
        this.audio = !this.audio
        rtc.toggleAudio(this.audio)
        pages.streamingRoom.soundButton.innerHTML = this.audio ? "Sound On" : "Sound Off"
        pages.streamingRoom.soundButton.classList.remove(this.audio ? "btn-danger" : "btn-success")
        pages.streamingRoom.soundButton.classList.add(this.audio ? "btn-success" : "btn-danger")
    },
    toggleVideo() {
        this.video = !this.video
        rtc.toggleVideo(this.video)
        pages.streamingRoom.cameraButton.innerHTML = this.video ? "Camera On" : "Camera Off"
        pages.streamingRoom.cameraButton.classList.remove(this.video ? "btn-danger" : "btn-success")
        pages.streamingRoom.cameraButton.classList.add(this.video ? "btn-success" : "btn-danger")
        this.video ? addVideo('local', localStream) : addVideo('local', new MediaStream())
    },
    goToPage(page) {
        for(let page in pages) {
            pages[page].elem.style.display = 'none'
        }
        pages[page].elem.style.display = 'block'
    },
    error(message) {
        alert(message)
    }
}