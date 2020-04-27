'use strict';

export default {
    create(username, room) {
        this._username = username
        this._room = room
    },
    get username() {
        return this._username
    },
    get room() {
        return this._room
    },
    clear() {
        this._username = undefined
        this._room = undefined
    }
}