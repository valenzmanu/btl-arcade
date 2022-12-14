const gamejs = require('gamejs')
const cameraUtils = require('@mediapipe/camera_utils');
const _pose = require('@mediapipe/pose');
const drawingUtils = require('@mediapipe/drawing_utils')
const controlUtils = require('@mediapipe/control_utils')

import pose_landmark_full from "url:./lib/pose_landmark_full.tflite"
import pose_solution_packed_assets_loader from "url:./lib/pose_solution_packed_assets_loader.sj"
import pose_solution_simd_wasm_bin from "url:./lib/pose_solution_simd_wasm_bin.sj"
import pose_solution_simd_wasm_bin_wasm from "url:./lib/pose_solution_simd_wasm_bin.wasm"
import pose_web_binarypb from "url:./lib/pose_web.binarypb"
import pose_solution_packed_assets_data from "url:./lib/pose_solution_packed_assets.data"

const gameConfig = loadConfig('kick', config)

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
let yTrigger = canvasElement.height * gameConfig.game.triggerLineYPerc
let resetTimeout = undefined

const { controls, camera } = setupControls()

load_game()

function setupControls() {

    // Mediapipe Stuff
    const pose = new _pose.Pose({
        locateFile: (file) => {
            switch (file) {
                case 'pose_landmark_full.tflite':
                    return pose_landmark_full
                case 'pose_solution_packed_assets_loader.js':
                    return pose_solution_packed_assets_loader
                case 'pose_solution_simd_wasm_bin.js':
                    return pose_solution_simd_wasm_bin
                case 'pose_solution_simd_wasm_bin.wasm':
                    return pose_solution_simd_wasm_bin_wasm
                case 'pose_web.binarypb':
                    return pose_web_binarypb
                case 'pose_solution_packed_assets.data':
                    return pose_solution_packed_assets_data
            }
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

    const videoElement = document.getElementsByClassName('input_video')[0];
    const camera = new cameraUtils.Camera(videoElement, {
        onFrame: async () => {
            inputCanvasCtx.drawImage(
                videoElement,
                gameConfig.camera.sx,
                gameConfig.camera.sy,
                gameConfig.camera.sw,
                gameConfig.camera.sh,
                0,
                0,
                inputCanvasElement.width,
                inputCanvasElement.height,
            );
            await pose.send({ image: inputCanvasElement });
        },
        width: gameConfig.camera.size[0],
        height: gameConfig.camera.size[1]
    });

    return { controls: pose, camera: camera }

}


function onResults(results) {

    triggerKickFromResults(results)

    if (!cameraVisible) {
        return
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


    // Draw Trigger Line
    if (cameraVisible) {
        canvasCtx.beginPath()
        canvasCtx.moveTo(0, yTrigger)
        canvasCtx.lineTo(canvasElement.width, yTrigger)
        canvasCtx.lineWidth = 2
        canvasCtx.stroke()
    }

    canvasCtx.restore();
}

// Game Stuff
var current_screen = screens.start

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



document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyS':
            console.log("Pressed Start")
            start_game()
            break;
        case 'KeyK':
        case 'KeyA':
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
                if(resetTimeout != undefined){
                    clearTimeout(resetTimeout)
                }
            }
            break;
        case 'KeyC':
            toggleCamera()
            break;
        case 'KeyP':
            configurator();
    }
});

function onTick(msDuration) {
    display.clear()
    display.blit(accuracyBarImg, [0, 0])
    accuracyMovingObjectPos[1] = get_new_accuracy_y_pos(accuracyMovingObjectPos[1])
    display.blit(accuracyMovingObjectImg, accuracyMovingObjectPos)
}

function load_game() {
    hideAll()
    show("loader")
}

function idle_game() {
    hideAll()
    current_screen = screens.start
    show("idle-video")
    show("start-text")
    hide("bar-container")
}

function start_game() {
    hideAll()
    accuracyMovingObjectStopped = false
    loadVideo("start-video")
    setVideoPlaybackRate("start-video", 1.0)
    show("start-video")
    show("bar-container")
    current_screen = screens.waiting_kick
}

function reset_by_time() {
    resetTimeout = setTimeout(() => {
        if (current_screen != screens.waiting_kick && current_screen != screens.start) {
            idle_game()
        }
    }, gameConfig.winCooldownMs)
} 

function hideBar(debounceMs){
    setTimeout(() => {
        hide("bar-container")
    }, debounceMs)
}

function score_goal() {
    hideAll()
    accuracyMovingObjectStopped = true
    loadVideo("goal-video")
    setVideoPlaybackRate("goal-video", 1.2)
    show("goal-video")
    hideBar(1000)
    accuracyMovingObjectStopped = true
    current_screen = screens.goal
    reset_by_time()
}

function fail_goal() {
    hideAll()
    accuracyMovingObjectStopped = true
    loadVideo("fail-video")
    setVideoPlaybackRate("fail-video", 1.2)
    show("fail-video")
    hideBar(1000)
    current_screen = screens.fail
    reset_by_time()
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

function destroy(id) {
    document.getElementById(id).remove()
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
    accuracyBarImg = gamejs.image.load(resources.accuracyBarImg).scale(gameConfig.game.accuracyBarSize)
    accuracyMovingObjectImg = gamejs.image.load(resources.accuracyMovingObjectImg).scale(gameConfig.game.movingObjectSize)
    accuracyMovingObjectPos = [-25, 0]
    accuracyMovingObjectDir = 1 * gameConfig.game.movingObjectVelocity
    accuracyMovingObjectPosYUpperLimit = 0
    accuracyMovingObjectPosYLowerLimit = gameConfig.game.accuracyBarSize[1] - gameConfig.game.movingObjectSize[1]
}

function get_new_accuracy_y_pos(curPos) {
    if (accuracyMovingObjectStopped) {
        return curPos
    }
    if (curPos > accuracyMovingObjectPosYLowerLimit) {
        accuracyMovingObjectDir = -1 * gameConfig.game.movingObjectVelocity
    }
    else if (curPos < accuracyMovingObjectPosYUpperLimit) {
        accuracyMovingObjectDir = 1 * gameConfig.game.movingObjectVelocity
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

function triggerKickFromResults(results) {
    if (current_screen != screens.waiting_kick) {
        return
    }
    let leftFootY = results.poseLandmarks[31].y * canvasElement.height
    let rigthFootY = results.poseLandmarks[32].y * canvasElement.height
    //console.log(`left foot: ${leftFootY}, right foot: ${rigthFootY}, yTrigger: ${yTrigger}`)
    if (leftFootY > yTrigger && rigthFootY <= yTrigger) {
        kick()
    }
    if (rigthFootY > yTrigger && leftFootY <= yTrigger) {
        kick()
    }
}

let idleVideo = document.getElementById("idle-video")
idleVideo.addEventListener('loadeddata', (e) => {
    console.log(idleVideo.readyState)

    if (idleVideo.readyState > 3) {
        controls.initialize()
            .then(() => {
                camera.start()
                    .then(() => {
                        setTimeout(() => {
                            idle_game()
                            destroy('loader')
                        }, 10000)
                    })
            })
    }

});

