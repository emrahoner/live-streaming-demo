import { EventEmitter } from '/js/event-emitter.js'
import logger from '/js/logger.js'

export class LSMediaTrack extends EventEmitter {
    constructor(track) {
        super()
        this.track = track
        this.enabled = true
        this.type = track.kind
        logger.log(`${track.kind} track is ${track.muted ? 'muted' : 'unmuted'}`)
    }

    toggle (enabled) {
        this.enabled = enabled === undefined ? !this.enabled : !!enabled
        this.track.enabled = this.enabled
        // this.emit('stateChanged', { type: this.type, enabled: this.enabled, track: this })
    }
}
