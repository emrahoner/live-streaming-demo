'use strict';

export class EventEmitter {
    on(event, handler) {
        if (!this.handlers) this.handlers = {}
        if (!this.handlers[event]) this.handlers[event] = []
        this.handlers[event].push(handler)
    }
    emit(event, data) {
        if (this.handlers && this.handlers[event]) {
            this.handlers[event].forEach(handler => {
                handler(data)
            })
        }
    }
}

export default {
    mixin (obj) {
        return Object.assign(new EventEmitter(), obj)
    }
}