const gamejs = require('gamejs')

const screens = {
    start: "START",
    waiting_kick: "WAITING_KIK",
    goal: "GOAL",
    fail: "FAIL"
}
var current_screen = screens.start
var kicking = false

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyS':
            console.log("Pressed Start")
            start_game()
            break;
        case 'KeyK':
            if(current_screen != screens.waiting_kick){
                break;
            }
            console.log("Kicking by key!!")
            score = getRandomInt(2)
            if (score > 0) {
                score_goal()
            }
            else {
                fail_goal()
            }
            break;
        case 'KeyR':
            if (current_screen == screens.waiting_kick || current_screen == screens.start) {
                document.location = "/"
            }
            else {
                start_game()
            }

            break;
    }
});

function start_game() {
    hideAll()
    loadVideo("start-video")
    setVideoPlaybackRate("start-video", 4.0)
    show("start-video")
    current_screen = screens.waiting_kick
}

function score_goal() {
    hideAll()
    loadVideo("goal-video")
    setVideoPlaybackRate("goal-video", 2.0)
    show("goal-video")
    current_screen = screens.goal
}

function fail_goal() {
    hideAll()
    loadVideo("fail-video")
    setVideoPlaybackRate("fail-video", 2.0)
    show("fail-video")
    current_screen = screens.fail
}

function kick() {
    kicking = true
}

function stop_kick() {
    kicking = false
}

function hide(id) {
    document.getElementById(id).setAttribute("style", "display: none;");
}
function show(id) {
    document.getElementById(id).setAttribute("style", "");
}

function loadVideo(id) {
    document.getElementById(id).load();
}

function setVideoPlaybackRate(id, playbackRate) {
    document.getElementById(id).playbackRate = playbackRate
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function hideAll(){
    hide("idle-video")
    hide("start-video")
    hide("goal-video")
    hide("fail-video")
    hide("start-text")
}