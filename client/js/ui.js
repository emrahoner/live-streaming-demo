'use strict';

import socket from '/js/socket.js'
import session from '/js/user-session.js'
import rtc from '/js/rtc.js'

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
        peerList: document.getElementById('peers-list')
    }
}

const peerList = {}

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
        for(let page in pages) {
            pages[page].elem.style.display = 'none'
        }
        pages.roomSelection.elem.style.display = 'block'

        pages.roomSelection.joinButton.addEventListener('click', this.joinRoom.bind(this))

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

        socket.on('peers', (peers) => {
            peers.forEach(peer => {
                addListItem(peer.username)
            });
        })
        rtc.on('localStreamCreated', ({ stream }) => {
            addVideo('local', stream)
        })
        rtc.on('remoteStreamCreated', ({ peer, stream }) => {
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
        this.goToPage('streamingRoom')
        session.create(username, roomName)
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