const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')

class GameManager  {
    
    constructor(emitCallback) {
        this.emitCallback = emitCallback;
        this.level = 1;
        this.currentScore = 0;
        this.elapsedSeconds = 0;
    }

    score() {
        this.currentScore++
        this.emit()
    }

    ontick() {
        if(this.elapsedSeconds % 5 === 0) {
            this.levelup()
        }

        if(this.level > 3) {
            let emitQty = Math.floor(Math.random() * 3);
            for(let i = 0; i < emitQty; i++) {
                this.emit()
            }
        }

    }

    getScore() { return this.currentScore; }

    levelup() { this.level++ }

    emit() {
        let cb = this.emitCallback
        cb(this.level)
    }

    outofsight() {
        this.emit()
    }

    start() {
        this.emit()
        setInterval(() => {
            this.elapsedSeconds++;
            this.ontick()
        }, 1000);
    }
}

const resources = {
    background: './images/background.jpg',
    bag: './images/santa_bag.png',
    bottles: ['./images/bottle1.png', './images/bottle2.png']
}

gamejs.preload([resources.background, resources.bag, ...resources.bottles]);

const font = new gamejs.font.Font('200px monospace');

gamejs.ready(function() {
    /* Controls */
    const hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    const videoElement = document.getElementsByClassName('input_video')[0];
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 1280,
        height: 720
    });


    const display = gamejs.display.getSurface();
    const size = display.getSize();
    const bg = gamejs.image.load(resources.background).scale(size)
    const bottles = [];
    let currentSpeed = 0;

    //Load bag at bottom left corner
    const bagImg = gamejs.image.load(resources.bag).scale([200, 200])
    const bagMask = new pixelcollision.Mask(bagImg)
    let bagPosition = [0, size[1] - 200]
        
    function spawnBottle(speed) {
        let bottleImg = gamejs.image.load(resources.bottles[Math.floor(Math.random()*resources.bottles.length)]).scale([100, 200])
        let bottleMask = new pixelcollision.Mask(bottleImg)
        let bottlePosition = [Math.floor(Math.random() * (size[0] - 250)), 0]

        if(bottles.length >= 5) {
            return;
        }

        currentSpeed = speed
        bottles.push({
            img: bottleImg,
            mask: bottleMask,
            pos: bottlePosition
        });
    }
    
    const game = new GameManager(spawnBottle)

    // Move bag
    function onResults(results) {
        if(results.multiHandLandmarks[0]) {
            let avgXPos = results.multiHandLandmarks[0]
                .map(el => el.x)
                .reduce((a,b) => a+b) / results.multiHandLandmarks[0].length

                bagPosition[0] = Math.floor(size[0] * (1 - avgXPos));
        }
    }
    hands.onResults(onResults);

    game.start()
    
    camera.start();

    gamejs.onTick(function(msDuration) {
        display.clear();

        // Load background and set it to whole display
        display.blit(bg, [0, 0]);

        //Show score
        display.blit(font.render(`${game.getScore()}`, '#ff0000'), [0, 0]);

        //Load bag
        display.blit(bagImg, bagPosition);
        
        bottles.forEach((bottle, index) => {
            bottle.pos = vectors.add(bottle.pos, [0, 10]);
            display.blit(bottle.img, bottle.pos);

            //Check if reached bottom of screen
            if(bottle.pos[1] >= size[1]) {
                bottles.splice(index, 1);

                if(bottles.length === 0) {
                    spawnBottle();
                }

            }

            let relativeOffset = vectors.subtract(bagPosition, bottle.pos);
            let hasMaskOverlap = bagMask.overlap(bottle.mask, relativeOffset);
            if (hasMaskOverlap) {
                game.score();
                bottles.splice(index, 1);
            }

        });
    });
});