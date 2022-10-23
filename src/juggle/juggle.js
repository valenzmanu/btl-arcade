const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')
const draw = require('gamejs/src/gamejs/graphics');
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


const dir = {
  NONE: 0,
  y: {
    DOWN: 1,
    UP: -1,
  },
  x: {
    LEFT: -1,
    RIGTH: 1,
  }
}

class Juggle {
  
  #font = new gamejs.font.Font('200px san-serif')
  #winCallback = function() {}  
  #deathCallBack = function() {}


  constructor(config, resources) {
    this.config = config
    this.resources = resources
    this.#resetState()
  }

  #resetState() {
    this.state = {
      started: false,
      score: 0,
      ball: undefined,
      collider: undefined,
    }
  }

  setup() {
    this.display = gamejs.display.getSurface()
    this.size = this.display.getSize()

    let ballImg = gamejs.image.load(this.resources.ball).scale(this.config.ballSize)
    this.state.ball = {
      img: ballImg,
      pos: [(this.size[0] - this.config.ballSize[0]) / 2, 0],
      dir: [dir.NONE , dir.y.DOWN],
      size: this.config.ballSize,
      mask: new pixelcollision.Mask(ballImg)
    }

    this.#setupCollider(this.size[0], [0,0])
  }

  #setupCollider(width, pos) {
    let collider = new gamejs.graphics.Surface([width, 10])
    draw.line(collider, '#ff0000', [0, 0], [width, 0], 10);
    
    this.state.collider = {
      img: collider,
      pos: pos,
      size: [width, 10],
      mask: new pixelcollision.Mask(collider)
    }
  }

  start() {
    this.state.started = true
  }

  onTick(msDuration) {
    if(!this.state.started) return
    this.display.clear()
    
    this.display.blit(this.#font.render(`${this.state.score}`, '#00000'), [this.size[0] - 200, -75]);
    this.display.blit(this.state.ball.img, this.state.ball.pos)
        
    this.display.blit(this.state.collider.img,  this.state.collider.pos)

    if(this.#ballTouched()) {
      this.state.started = false
      this.triggerContact(dir.x.NONE)
    }


    this.#gravity()
    this.#checkBorderBounce()

    this.#checkWinner()
  }

  #gravity() {
    let ballDelta = vectors.multiply([this.config.game.fallSpeed, this.config.game.fallSpeed], this.state.ball.dir)
    this.state.ball.pos = vectors.add(this.state.ball.pos, ballDelta)
  }

  #checkBorderBounce() {
    let yLimit = this.size[1]
    let yBall = this.state.ball.pos[1]

    let reachedBottom = (yBall + this.state.ball.size[1]) >= yLimit
    if(reachedBottom) {
      this.#kill()
      //this.state.ball.dir = vectors.multiply([1, -1], this.state.ball.dir)
      return
    }

    let reachedTop = 0 >= yBall
    if(reachedTop) {
      this.state.ball.dir = vectors.multiply([1, -1], this.state.ball.dir)
    }

    let xLimit = this.size[0]
    let xBall = this.state.ball.pos[0]

    let reachedRight = (xBall + this.state.ball.size[0]) >= xLimit
    let reachedLeft = 0 >= xBall

    if(reachedRight || reachedLeft) {
      this.state.ball.dir = vectors.multiply([-1, 1], this.state.ball.dir)
      return
    }
  }

  #kill() {
    this.#deathCallBack()
    this.#resetState()
    this.setup()
  }

  #checkWinner() {
    if(this.state.score >= this.config.game.winScore) {
      this.state.started = false
      this.#winCallback()
      this.#resetState()
      this.setup()
    }
  }

  #ballTouched() {
    if(this.state.ball.dir[1] === dir.y.UP) return false
    if(this.state.ball && this.state.collider) {
      let relativeOffset = vectors.subtract(this.state.ball.pos, this.state.collider.pos)
      let hasMaskOverlap = this.state.ball.mask.overlapRect(this.state.collider.mask, relativeOffset)


      return hasMaskOverlap
    }

    return false
  }

  triggerContact(xDir) {
    if(this.state.ball.dir[1] === dir.y.UP) return

    this.state.ball.dir[1] *= -1
    this.state.ball.dir[0] = xDir
    
    this.state.score += 1
  }

  onDeath(fn) {
    this.#deathCallBack = fn
  }
  
  onWin(fn) {
    this.#winCallback = fn;
  }

  updateCollider(l, r) {
    let width = Math.abs(l.x - r.x);

    if(!width) {
      console.error('Invalid points for collider')
      return
    }

    let pos = [
      (Math.min(l.x, r.x) * this.size[0]) - this.config.colliderOffset.sides,
      (Math.max(l.y, r.y) * this.size[1]) - this.config.colliderOffset.top
    ]

    width = (this.size[0] * width) + (2 * this.config.colliderOffset.sides)

    this.#setupCollider(width, pos)
  }

}

gamejs.preload([resources.ball])

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const { controls, camera } = setupControls()

function drawImage(results) {
  if(!results.poseLandmarks) return
  
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

  /*canvasCtx.globalCompositeOperation = 'source-over';
  drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, _pose.POSE_CONNECTIONS,
      { color: '#00FF00', lineWidth: 4 });
  drawingUtils.drawLandmarks(canvasCtx, results.poseLandmarks,
      { color: '#FF0000', lineWidth: 2 });*/
}

function setupControls() {
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
  
  pose.onResults(drawImage);
  
  const camera = new cameraUtils.Camera(videoElement, {
    onFrame: async () => {
      await pose.send({image: videoElement});
    },
    width: 1280,
    height: 720
  });

  return { controls: pose, camera: camera }
}

gamejs.ready(function() {
  const game = new Juggle(config, resources)
  game.setup()

  controls.onResults(function(results) {
    if(!results.poseLandmarks) return
    let leftEar = results.poseLandmarks[7]
    let rightEar = results.poseLandmarks[8]

    game.updateCollider(leftEar, rightEar)
    drawImage(results)
  })

  gamejs.event.onKeyDown(function(event) {
    const controlDirs = {}
    controlDirs[gamejs.event.K_DOWN] = dir.NONE
    controlDirs[gamejs.event.K_LEFT] = dir.x.LEFT
    controlDirs[gamejs.event.K_RIGHT] = dir.x.RIGTH

    let selectedDir = controlDirs[event.key]

    if(selectedDir !== undefined) {
      game.triggerContact(selectedDir)
    }
  })

  game.onDeath(function() {
    console.log('Died!')
  })

  game.onWin(function() {
    console.log('Won!')
  })

  controls.initialize()
  .then(() => {
    camera.start()
      .then(() => {
        console.log('ready')
        game.start()
      })
  })
  gamejs.onTick(function(msDuration) {
    game.onTick(msDuration)
  })
})
