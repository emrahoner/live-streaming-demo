'use strict';

import eventEmitter from '/js/event-emitter.js'

export default eventEmitter.mixin({
    log() {
        console.log(...arguments)
        this.emit('log', { type: 'log', args: Array.from(arguments) })
    },
    error() {
        console.error(...arguments)
        this.emit('log', { type: 'error', args: Array.from(arguments) })
    }
})
