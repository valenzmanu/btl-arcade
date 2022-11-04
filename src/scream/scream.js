const gameConfig = loadConfig('scream', config)
let permission = false;
const screens = {
    start: "START",
    playing: "PLAYING",
    win: "WIN",
}
let gameScreen = screens.start

document.addEventListener('keyup', (event) => {

    switch (event.code) {
        case 'KeyS':
            if (gameScreen == screens.start) {
                console.log("Pressed Start")
                startListening()
                showGameScreen()
                setInterval(playGame, 50)
            }
            break;
        case 'KeyR':
            if (gameScreen == screens.start) {
                window.location = "/"
            }
            else {
                reset_game()
            }
            break;
        case 'KeyP':
            configurator();
    }

})

let showGameScreen = function () {
    show("game_container")
    hide("start_container")
    hide("win_container")
}

let playGame = function () {
    gameScreen = screens.playing
    imageWidthPerc = Math.min(1.0, getThrPercReached())
    console.log(`imageWidthPerc: ${imageWidthPerc}`)
    fillerImage = document.getElementById("filler")
    imageWidth = gameConfig.visuals.fillerMaxWidth * imageWidthPerc
    textIndicator = document.getElementById("filler_text")
    textIndicator.textContent = `${Math.round(110 * imageWidthPerc)}%`
    fillerImage.style.width = `${imageWidth}px`;
    if (100 * imageWidthPerc >= gameConfig.game.winThreshold) {
        win_game()
    }
}

let win_game = function () {
    gameScreen = screens.win
    hide("start_container")
    hide("game_container")
    show("win_container")
    setTimeout(reset_game, gameConfig.game.winTimeoutMs)
}

let reset_game = function () {
    location.reload()
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

function hide(id) {
    document.getElementById(id).setAttribute("style", "display: none;");
}
function show(id) {
    document.getElementById(id).setAttribute("style", "");
}