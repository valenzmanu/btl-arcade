const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')
const mpHands = require('@mediapipe/hands')
const cameraUtils = require('@mediapipe/camera_utils')

class Catch {

    #deathCallback = function() {}
    #winCallback = function() {}

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

    onTick(msDuration) {
        this.state.elapsedMs += msDuration;
        this.display.clear()
        
        this.display.blit(this.state.background, [0, 0])
        
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
                        this.#spawnItem()
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
        if(this.state.fallingItems.length >= this.config.game.maxFallingItems)
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

    #maybeLevelUp() {
        if((this.state.elapsedMs % this.config.game.levelUpMs) === 0) {
            this.state.speed = Math.min(this.state.speed+this.config.game.fallSpeed.step, this.config.game.fallSpeed.max)
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

function startGame() {
    running = true;
    gamejs.preload([
        resources.background,
        resources.catcher,
        resources.lives,
        ...resources.fallingItems
    ])
    
    const game = new Catch(config, resources)
    
    gamejs.ready(function () {
        hide('idle-video')
        show('game-container')

        controls.onResults(function(results) {
            if(results.multiHandLandmarks[0]) {
                let avgXPos = results.multiHandLandmarks[0]
                    .map(el => el.x)
                    .reduce((a,b) => a+b) / results.multiHandLandmarks[0].length
    
                    game.moveCatcher(avgXPos);
            }
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

function hide(id) {
    document.getElementById(id)
        .setAttribute('style', 'display: none;')
}

function show(id) {
    document.getElementById(id)
        .setAttribute('style', '')    
}

function loadVideo(id) {
    document.getElementById(id).load();
}

function died() {
    show('lose-video')
    loadVideo('lose-video')
    hide('game-container')

    setTimeout(() => {
        location.reload()
    }, config.loseCooldownMs)
}

function win() {
    show('win-video')
    loadVideo('win-video')
    hide('game-container')

    setTimeout(() => {
        location.reload()
    }, config.winCooldownMs)
}

function toggleCamera() {
    if(!cameraVisible) {
        show('input_video')
        cameraVisible = true;  
    } else {
        hide('input_video')
        cameraVisible = false
    }
}

function setupControls() {
    //TODO: Fix do not use jsdelivr
    const hands = new mpHands.Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    const videoElement = document.getElementsByClassName('input_video')[0];
    const camera = new cameraUtils.Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: config.cameraSize[0],
        height: config.cameraSize[1]
    });

    camera.start()

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
    }
});