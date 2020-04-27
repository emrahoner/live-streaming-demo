class RoomService {
    constructor() {
        this.rooms = {}
        this.events = {}
    }

    on(type, func) {
        if (!this.events[type]) {
            this.events[type] = []
        }
        this.events[type].push(func)
    }

    emit(type, data) {
        const events = this.events[type]
        if (events) {
            events.forEach(x => x(data))
        }
    }

    createOrJoinRoom(roomName, username) {
        this.createRoom(roomName, username)
        this.joinRoom(roomName, username)
    }

    createRoom(roomName, username) {
        if(!this.rooms[roomName]) {
            this.rooms[roomName] = {
                name: roomName,
                createdBy: username,
                peers: []
            }

            this.emit('created', { room: this.rooms[roomName], username })
        }
    }

    joinRoom(roomName, username) {
        this.rooms[roomName].peers.push({ username })
        this.emit('joined', { room: this.rooms[roomName], username })
    }

    leaveRoom(roomName, username) {
        if(!this.rooms[roomName] || !this.rooms[roomName].peers) return
        let index = this.rooms[roomName].peers.findIndex(x => x.username === username)
        this.rooms[roomName].peers.splice(index, 1)
        this.emit('leaved', { room: this.rooms[roomName], username })
    }

    getPeers(roomName, username) {
        let room = this.rooms[roomName]
        if (room && room.peers.find(x => x.username === username)) {
            return room.peers.filter(x => x.username !== username)
        }
        return []
    }

    disposeRoom(username) {
        let room = this.rooms[roomName]
        if (room.createdBy === username) {
            this.rooms[roomName] = undefined
            this.emit('disposed', { room })
        }
    }
}

module.exports = new RoomService()
