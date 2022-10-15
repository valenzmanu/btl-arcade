const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')
const mpHands = require('@mediapipe/hands')
const cameraUtils = require('@mediapipe/camera_utils')
const drawingUtils = require('@mediapipe/drawing_utils')

import hand_landmark_full from "url:./lib/hand_landmark_full.tflite"
import hands_solution_packed_assets_loader from "url:./lib/hands_solution_packed_assets_loader.sj"
import hands_solution_simd_wasm_bin from "url:./lib/hands_solution_simd_wasm_bin.sj"
import hands_solution_packed_assetsData from "url:./lib/hands_solution_packed_assets.data"
import hands_solution_simd_wasm_binWasm from "url:./lib/hands_solution_simd_wasm_bin.wasm"
import handsBinarypb from "url:./lib/hands.binarypb"


class Catch {

    #deathCallback = function() {}
    #winCallback = function() {}
    #font = new gamejs.font.Font('200px monospace');

    constructor(config, resources) {
        this.config = config
        this.resources = resources
        this.#resetState()
    }

    #resetState() {
        this.state = {
            started: false,
            elapsedMs: 0,
            remainingLives: this.config.game.lives,
            background: undefined,
            catcher: undefined,
            lives: [],
            fallingItems: [],
            speed: this.config.game.fallSpeed.initial,
            score: 0,
            level: 1,
            itemsToSpawn: this.config.game.fallingItems.initial,
            lastItemSpawnLevelUp: 1,
        }
    }

    setup() {
        this.display = gamejs.display.getSurface()
        this.size = this.display.getSize()

        this.background = {
            bg: gamejs.image.load(this.resources.background).scale(this.size),
        }

        this.state.background = this.background.bg
    }

    start() {
        if(this.state.started) {
            console.warn('Game alredy started!')
            return
        }

        this.state.started = true

        let catcherImg = gamejs.image.load(this.resources.catcher).scale(this.config.catcherSize)
        this.state.catcher = {
            img: catcherImg,
            pos: [0, this.size[1] - 200],
            mask: new pixelcollision.Mask(catcherImg)
        }

        for(let i =  0; i < this.state.remainingLives; i++) {
            let x = (this.config.livesSize[1] * i) + 5
            this.state.lives.push({
                img: gamejs.image.load(this.resources.lives).scale(this.config.livesSize),
                pos: [x, 0]
            })
        }

        this.#spawnItem()
    }

    reset() {
        this.#resetState()
        this.setup()
    }
    
    #lastEpoch = new Date().getTime()

    onTick(msDuration) {
        let newEpoch = new Date().getTime()
        let diff = newEpoch - this.#lastEpoch
        this.#lastEpoch = newEpoch
    
        if(diff < 15) {
            return
        }

        this.state.elapsedMs += msDuration;
        this.display.clear()

        if(diff)
        
        
        this.display.blit(this.state.background, [0, 0])
        
        this.display.blit(this.#font.render(`${this.state.score}`, '#ffffff'), [this.size[0] - 200, 10]);

        if(this.state.started) {
            if(this.state.lives) {
                this.state.lives.forEach(live => {
                    this.display.blit(live.img, live.pos)    
                });
            }
    
            if(this.state.catcher) {
                this.display.blit(this.state.catcher.img, this.state.catcher.pos)
            }
    
            if(this.state.fallingItems) {

                this.state.fallingItems.forEach((item, idx) => {
                    item.pos = vectors.add(item.pos, [0, this.state.speed]);
                    this.display.blit(item.img, item.pos)
    
                    if(this.#reachBottom(item.pos)) {
                        this.state.fallingItems.splice(idx, 1)
                        this.#die()
                        if(this.state.remainingLives > 0) {
                            this.#spawnItem()
                        }
                    }

                    if(this.#recolected(item)) {
                        this.state.fallingItems.splice(idx, 1)
                        this.state.score++
                        
                        if(this.state.fallingItems.length === 0) {
                            this.#spawnItem()
                        }
                    }
                })
            }
    
            this.#maybeLevelUp()
            this.#checkWin()
        }
    }

    #reachBottom(pos) {
        return pos[1] >= this.size[1];
    }

    #recolected(item) {
        if(this.state.catcher) {
            let relativeOffset = vectors.subtract(this.state.catcher.pos, item.pos)
            let hasMaskOverlap = this.state.catcher.mask.overlap(item.mask, relativeOffset)

            return hasMaskOverlap
        }

        return false
    }

    #die() {
        if(this.state.lives.length)
            this.state.lives.splice(this.state.lives.length -1, 1)
        this.state.remainingLives -= 1;

        if(this.state.remainingLives === 0) {
            this.#kill()
        }
    }

    #spawnItem() {
        if(this.state.fallingItems.length >= this.config.game.fallingItems.max)
            return
        
        for(let i = 0; i < this.state.itemsToSpawn; i++) {
            if(this.state.fallingItems.length >= this.config.game.fallingItems.max)
                return

            let img = gamejs.image.load(
                this.resources.fallingItems[Math.floor(Math.random()*resources.fallingItems.length)]
            ).scale(this.config.fallingItemsSize)
    
            this.state.fallingItems.push({
                img: img,
                pos: [Math.floor(Math.random() * (this.size[0] - this.config.fallingItemsSize[0])), 0],
                mask: new pixelcollision.Mask(img)
            })
        }
    }

    #maybeLevelUp() {
        let minElapsed = this.state.level * this.config.game.levelUpMs

        let nextLevel = this.state.level + 1
        if(this.state.elapsedMs >= minElapsed) {
            this.state.level = nextLevel
            this.state.speed = Math.min(this.state.speed+this.config.game.fallSpeed.step, this.config.game.fallSpeed.max)
        }

        if((this.state.level - this.state.lastItemSpawnLevelUp) >= this.config.game.fallingItems.levelUpStep) {
            this.state.lastItemSpawnLevelUp = nextLevel
            this.state.itemsToSpawn = Math.min(this.state.itemsToSpawn+this.config.game.fallingItems.step, this.config.game.fallingItems.max)
        }
    }

    #kill() {
        this.started = false;
        this.#deathCallback()
        this.#resetState()
        this.setup()
    }

    #checkWin() {
        if(this.state.score >= this.config.game.winScore) {
            this.started = false;
            this.#winCallback()
            this.#resetState()
            this.setup()
        }
    }

    onDeath(fn) {
        this.#deathCallback = fn
    }

    onWin(fn) {
        this.#winCallback = fn
    }

    moveCatcher(avgXPos) {
        if(this.state.catcher)
            this.state.catcher.pos[0] = Math.floor(this.size[0] * (1 - avgXPos))
    }
}

let running = false;
let cameraVisible = false;
const controls = setupControls()

const outputCanvas = document.getElementById('output_canvas');
const outputCanvasCtx = outputCanvas.getContext('2d');

var canvas = document.getElementById('input_canvas');
var ctx = canvas.getContext('2d');

const game = new Catch(config, resources)

function hide(id) {
    document.getElementById(id)
        .classList.add("hidden")  
}

function show(id) {
    document.getElementById(id)
        .classList.remove("hidden")  
}

function destroy(id) {
    document.getElementById(id).remove()
}

function drawHands(results) {
    if(!cameraVisible) return

    outputCanvasCtx.save();
    outputCanvasCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputCanvasCtx.drawImage(results.image, 0, 0, outputCanvas.width, outputCanvas.height);
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {

        drawingUtils.drawConnectors(outputCanvasCtx, landmarks, mpHands.HAND_CONNECTIONS,
                        {color: '#00FF00', lineWidth: 5});
        drawingUtils.drawLandmarks(outputCanvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
        }
    }
    outputCanvasCtx.restore();
}

function startGame() {
    running = true;
    gamejs.preload([
        resources.background,
        resources.catcher,
        resources.lives,
        ...resources.fallingItems
    ])

    gamejs.ready(function () {
        hide('idle')
        show('game')

        controls.onResults(function(results) {
            if(results.multiHandLandmarks[0]) {
                let avgXPos = results.multiHandLandmarks[0]
                    .map(el => el.x)
                    .reduce((a,b) => a+b) / results.multiHandLandmarks[0].length
    
                    game.moveCatcher(avgXPos);
            }
            drawHands(results);
        })

        gamejs.onTick(function(msDuration) {
            game.onTick(msDuration)
        })
    
        game.onDeath(function() { died() })
        game.onWin(function() { win() })
    
        game.reset()
        game.start()
    })
}

function loadVideo(id) {
    document.getElementById(id).load();
}

function died() {
    show('lose')
    loadVideo('lose-video')
    hide('game')
    game.reset()

    setTimeout(() => {
        show('idle')
        hide('lose')
        running = false
    }, config.loseCooldownMs)
}

function win() {
    show('win')
    loadVideo('win-video')
    hide('game')
    
    game.reset()
    running = false

    setTimeout(() => {
        show('idle')
        hide('win')
        running = false
    }, config.winCooldownMs)
}

function toggleCamera() {
    if(!cameraVisible) {
        show('controls')
        show('output_canvas')
        cameraVisible = true;  
    } else {
        hide('controls')
        hide('output_canvas')
        cameraVisible = false
    }
}

function setupControls() {
    const hands = new mpHands.Hands({locateFile: (file) => {
        switch(file) {
            case 'hand_landmark_full.tflite':
                return hand_landmark_full
            case 'hands_solution_packed_assets_loader.js':
                return hands_solution_packed_assets_loader
            case 'hands_solution_simd_wasm_bin.js':
                return hands_solution_simd_wasm_bin
            case 'hands.binarypb':
                return handsBinarypb
            case 'hands_solution_packed_assets.data':
                return hands_solution_packed_assetsData
            case 'hands_solution_simd_wasm_bin.wasm':
                return hands_solution_simd_wasm_binWasm
        }
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(function(results) {
        drawHands(results)
    })

    const videoElement = document.getElementById('input_video');
    const camera = new cameraUtils.Camera(videoElement, {
        onFrame: async () => {
            ctx.drawImage(
                videoElement,
                config.camera.sx,
                config.camera.sy,
                config.camera.sw,
                config.camera.sh,
                0,
                0,
                canvas.width,
                canvas.height,
            );
            await hands.send({image: canvas});
        },
        width: config.camera.size[0],
        height: config.camera.size[1]
    });

    camera.start()
        .then(() => {
            show('idle')
            destroy('loader')
        })

    return hands
}

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyS':
            if(!running)
                startGame()
            break;
        case 'KeyC':
            toggleCamera()
            break;
        case 'KeyR':
            if(!running)
                window.location = '/'
            break;
    }
});