const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')


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
            lastSpawn: null
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
            pos: [0, this.size[1] - 300],
            mask: new pixelcollision.Mask(catcherImg)
        }

        for(let i =  0; i < this.state.remainingLives; i++) {
            let x = (this.config.livesSize[1] * i) + 400
            this.state.lives.push({
                img: gamejs.image.load(this.resources.lives).scale(this.config.livesSize),
                pos: [x, 20]
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

        this.display.blit(this.state.background, [0, 0])
        
        this.display.blit(this.#font.render(`${this.state.score}`, '#fcecd3'), [this.size[0] - 200, 120]);

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
    
            this.#spawnItem()
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
        
        let now = new Date().getTime()
        
        if(this.state.lastSpawn) {
            let diff = now - this.state.lastSpawn
            if(this.config.game.fallingItems.newSpawnOffsetMs >= diff) return
        }

        for(let i = 0; i < this.state.itemsToSpawn; i++) {
            if(this.state.fallingItems.length >= this.config.game.fallingItems.max)
                return

            this.state.lastSpawn = new Date().getTime()

            let imgR = this.resources.fallingItems[Math.floor(Math.random()*this.resources.fallingItems.length)]
        
            let img = gamejs.image.load(imgR).scale(this.config.fallingItemsSize)
    
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
            //this.state.itemsToSpawn = Math.min(this.state.itemsToSpawn+this.config.game.fallingItems.step, this.config.game.fallingItems.max)
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

    moveCatcherStep(step) {
        if(this.state.catcher) {
            let newPos = Math.min(Math.max(0, this.state.catcher.pos[0] + step), this.size[0] - this.config.catcherSize[0])
            this.state.catcher.pos[0] = newPos
        }
    }

    moveCatcherMotion(pos) {
        if(this.display.rect.collidePoint(pos)) {
            this.state.catcher.pos[0] =  Math.min(Math.max(0, pos[0]), this.size[0] - this.config.catcherSize[0])
        }
    }
}

const gameConfig = loadConfig('catch-no-cv', config);

let running = false;

const game = new Catch(gameConfig, resources)

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

function startGame() {
    running = true;
    gamejs.preload([
        resources.background,
        resources.catcher,
        resources.lives,
        ...resources.fallingItems
    ])

    gamejs.event.onKeyDown(function(event) {
        if(event.key === gamejs.event.K_LEFT) {
            game.moveCatcherStep(-20)
        }

        if(event.key === gamejs.event.K_RIGHT) {
            game.moveCatcherStep(20)
        }
    })

    gamejs.event.onMouseMotion(function(event) {
        game.moveCatcherMotion(event.pos)
    })

    gamejs.event.onTouchMotion(function(event) {
        game.moveCatcherMotion(event.touches[0].pos)
    })

    gamejs.ready(function () {
        hide('idle')
        show('game')

        gamejs.onTick(function(msDuration) {
            game.onTick(msDuration)
        })
    
        game.onDeath(function() { died() })
        game.onWin(function() { win() })
    
        game.reset()
        game.start()
    })
}

function died() {
    show('lose')
    hide('game')
    game.reset()

    setTimeout(() => {
        location.reload()
    }, config.loseCooldownMs)
}

function win() {
    show('win')
    hide('game')
    
    game.reset()
    running = false

    setTimeout(() => {
        location.reload()
    }, gameConfig.winCooldownMs)
}

document.getElementById('start').addEventListener('click', (e) => {
    if(!running)
        startGame()
});

document.getElementById('start-text').addEventListener('click', (e) => {
    if(!running)
        startGame()
});

