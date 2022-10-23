let permission = false;
const screens = {
    start: "START",
    waiting_kick: "PLAYING",
    goal: "WIN",
    fail: "LOSE"
}
let gameScreen = screens.start

document.addEventListener('keyup', (event) => {

    switch (event.code) {
        case 'KeyS':
            console.log("Pressed Start")
            startListening()
            break;
    }

})

let startGame = function() {
    audioDB = getVolume()
    console.log(`Audio level is ${audioDB} dB`)
}

let startListening = function () {

    if (!permission) {
        console.log("Getting user media")
        permission = true;
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(listenAudio)
            .catch(handleAudioNotAllowed);

        AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContent = new AudioContext();
    }

};