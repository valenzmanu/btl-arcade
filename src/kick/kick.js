const gamejs = require('gamejs')
const cameraUtils = require('@mediapipe/camera_utils');
const _pose = require('@mediapipe/pose');
const drawingUtils = require('@mediapipe/drawing_utils')
const controlUtils = require('@mediapipe/control_utils')

const screens = {
    start: "START",
    waiting_kick: "WAITING_KIK",
    goal: "GOAL",
    fail: "FAIL"
}
let cameraVisible = false;
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const inputCanvasElement = document.getElementsByClassName('input_canvas')[0];
const inputCanvasCtx = inputCanvasElement.getContext('2d');

// Mediapipe Stuff
const pose = new _pose.Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onResults);

function onResults(results) {
    if (!results.poseLandmarks) {
        grid.updateLandmarks([]);
        return;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.segmentationMask, 0, 0,
        canvasElement.width, canvasElement.height);

    // Only overwrite existing pixels.
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite missing pixels.
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-over';
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
        { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(canvasCtx, results.poseLandmarks,
        { color: '#FF0000', lineWidth: 2 });
    canvasCtx.restore();
}

const videoElement = document.getElementsByClassName('input_video')[0];
const camera = new cameraUtils.Camera(videoElement, {
    onFrame: async () => {
        inputCanvasCtx.drawImage(
            videoElement,
            config.camera.sx,
            config.camera.sy,
            config.camera.sw,
            config.camera.sh,
            0,
            0,
            inputCanvasElement.width,
            inputCanvasElement.height,
        );
        await pose.send({ image: inputCanvasElement });
    },
    width: config.camera.size[0],
    height: config.camera.size[1]
});
camera.start();

function onResults(results) {
    console.log(results)
    if (!results.poseLandmarks) {
        console.log("No results")
        return;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite existing pixels.
    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite missing pixels.
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-over';
    drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, _pose.POSE_CONNECTIONS,
        { color: '#00FF00', lineWidth: 4 });
    drawingUtils.drawLandmarks(canvasCtx, results.poseLandmarks,
        { color: '#FF0000', lineWidth: 2 });
    canvasCtx.restore();
}

// Game Stuff
var current_screen = screens.start
var kicking = false

// Game Js Stuff
gamejs.preload([resources.accuracyBarImg, resources.accuracyMovingObjectImg])
var display = undefined
var size = undefined
var accuracyBarImg = undefined
var accuracyMovingObjectImg = undefined
var accuracyMovingObjectPos = undefined
var accuracyMovingObjectPosYUpperLimit = undefined
var accuracyMovingObjectPosYLowerLimit = undefined
var accuracyMovingObjectDir = undefined
var accuracyMovingObjectStopped = false



document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyS':
            console.log("Pressed Start")
            start_game()
            break;
        case 'KeyK':
            if (current_screen != screens.waiting_kick) {
                break;
            }
            console.log("Kicking by key!!")
            score = getRandomInt(2)
            kick()
            break;
        case 'KeyR':
            if (current_screen == screens.waiting_kick || current_screen == screens.start) {
                document.location = "/"
            }
            else {
                start_game()
            }
            break;
        case 'KeyC':
            toggleCamera()
            break;
    }
});

function onTick(msDuration) {
    display.clear()
    display.blit(accuracyBarImg, [0, 0])
    accuracyMovingObjectPos[1] = get_new_accuracy_y_pos(accuracyMovingObjectPos[1])
    display.blit(accuracyMovingObjectImg, accuracyMovingObjectPos)
}

function start_game() {
    hideAll()
    accuracyMovingObjectStopped = false
    loadVideo("start-video")
    setVideoPlaybackRate("start-video", 4.0)
    show("start-video")
    show("bar-container")
    current_screen = screens.waiting_kick
}

function score_goal() {
    hideAll()
    accuracyMovingObjectStopped = true
    loadVideo("goal-video")
    setVideoPlaybackRate("goal-video", 2.0)
    show("goal-video")
    accuracyMovingObjectStopped = true
    current_screen = screens.goal
}

function fail_goal() {
    hideAll()
    accuracyMovingObjectStopped = true
    loadVideo("fail-video")
    setVideoPlaybackRate("fail-video", 2.0)
    show("fail-video")
    current_screen = screens.fail
}

function kick() {
    won = won_by_position(accuracyMovingObjectPos[1])
    if (won) {
        score_goal()
    }
    else {
        fail_goal()
    }
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

function hideAll() {
    hide("idle-video")
    hide("start-video")
    hide("goal-video")
    hide("fail-video")
    hide("start-text")
}

function start_accuracy_bar() {
    accuracyBarImg = gamejs.image.load(resources.accuracyBarImg).scale(config.game.accuracyBarSize)
    accuracyMovingObjectImg = gamejs.image.load(resources.accuracyMovingObjectImg).scale(config.game.movingObjectSize)
    accuracyMovingObjectPos = [20, 0]
    accuracyMovingObjectDir = 1 * config.game.movingObjectVelocity
    accuracyMovingObjectPosYUpperLimit = 0
    accuracyMovingObjectPosYLowerLimit = config.game.accuracyBarSize[1] - config.game.movingObjectSize[1]
}

function get_new_accuracy_y_pos(curPos) {
    if (accuracyMovingObjectStopped) {
        return curPos
    }
    if (curPos > accuracyMovingObjectPosYLowerLimit) {
        accuracyMovingObjectDir = -1 * config.game.movingObjectVelocity
    }
    else if (curPos < accuracyMovingObjectPosYUpperLimit) {
        accuracyMovingObjectDir = 1 * config.game.movingObjectVelocity
    }
    return (curPos + accuracyMovingObjectDir)
}

function won_by_position(curPos) {
    var won = (curPos >= (accuracyMovingObjectPosYLowerLimit - 80) && curPos <= (accuracyMovingObjectPosYLowerLimit + 50))
    console.log(`Won by position: ${won}`)
    return won
}

function setup_display() {
    display = gamejs.display.getSurface()
    size = display.getSize()
}

function toggleCamera() {
    if (!cameraVisible) {
        show('camera_container')
        cameraVisible = true;
    } else {
        hide('camera_container')
        cameraVisible = false
    }
}

gamejs.ready(function () {
    setup_display()
    start_accuracy_bar()
    gamejs.onTick(function (msDuration) {
        onTick(msDuration)
    })
})

