import { LSMediaTrack } from '/js/media-track.js'

export class LSMediaStream {
    constructor(stream) {
        this.stream = stream
        this.audioTracks = stream.getAudioTracks().reduce((result, track) => {
            return [...result, new LSMediaTrack(track)]
        }, []);
        this.videoTracks = stream.getVideoTracks().reduce((result, track) => {
            return [...result, new LSMediaTrack(track)]
        }, []);
    }

    toggleAudio (enabled) {
        this.audioTracks.forEach(track => {
            track.toggle(enabled)
        });
    }

    toggleVideo (enabled) {
        this.videoTracks.forEach(track => {
            track.toggle(enabled)
        });
    }

    getTracks() {
        return [...this.audioTracks, ...this.videoTracks]
    }
}
