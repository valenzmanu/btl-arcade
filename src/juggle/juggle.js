const gamejs = require('gamejs')
const pixelcollision = require('gamejs/src/gamejs/pixelcollision')
const vectors = require('gamejs/src/gamejs/math/vectors')
const cameraUtils = require('@mediapipe/camera_utils');
const _pose = require('@mediapipe/pose');
const selfie = require('@mediapipe/selfie_segmentation')

import pose_landmark_full from "url:./lib/pose_landmark_full.tflite"
import pose_solution_packed_assets_loader from "url:./lib/pose_solution_packed_assets_loader.sj"
import pose_solution_simd_wasm_bin from "url:./lib/pose_solution_simd_wasm_bin.sj"
import pose_solution_simd_wasm_bin_wasm from "url:./lib/pose_solution_simd_wasm_bin.wasm"
import pose_web_binarypb from "url:./lib/pose_web.binarypb"
import pose_solution_packed_assets_data from "url:./lib/pose_solution_packed_assets.data"

import selfie_segmentation from "url:./lib/selfie_segmentation.binarypb"
import selfie_segmentation_landscape from "url:./lib/selfie_segmentation_landscape.tflite"
import selfie_segmentation_solution_simd_wasm_bin_js from "url:./lib/selfie_segmentation_solution_simd_wasm_bin.sj"
import selfie_segmentation_solution_simd_wasm_bin from "url:./lib/selfie_segmentation_solution_simd_wasm_bin.wasm"


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
  
  #winCallback = function() {}  
  #deathCallBack = function() {}


  constructor(config, resources) {
    this.config = config
    this.resources = resources
    this.#resetState()
  }

  #resetState() {
    this.state = {
      display: false,
      started: false,
      score: 0,
      ball: undefined,
      collider: undefined,
      colliderVisible: false,
      scorebg: undefined,
      scoreTitle: undefined,
      scoreDisplay: undefined,
      footer: undefined,
    }
  }

  setup() {
    this.display = gamejs.display.getSurface()
    this.size = this.display.getSize()

    let ballImg = gamejs.image.load(this.resources.ball).scale(this.config.ballSize)
    this.state.ball = {
      img: ballImg,
      pos: [(this.size[0] - this.config.ballSize[0]) / 2, 20],
      dir: [dir.NONE , dir.y.DOWN],
      size: this.config.ballSize,
      mask: new pixelcollision.Mask(ballImg)
    }

    this.state.scorebg = {
      img: gamejs.image.load(this.resources.scorebg).scale(this.config.scoreSize),
      pos: [(this.size[0] - this.config.scoreSize[0])/2, 10],
      size: this.config.scoreSize
    }

    let fontSize = this.config.scoreSize[1] * 0.24

    let scoreTitleFont = new gamejs.font.Font(`${fontSize}px QAB`)
    let rendered = scoreTitleFont.render('SCORE: ', '#ffff')
    this.state.scoreTitle = {
      font: scoreTitleFont,
      img: rendered,
      pos: [this.state.scorebg.pos[0] + (this.state.scorebg.size[0] * 0.15), (this.state.scorebg.size[1] * 0.8) - fontSize],
      size: rendered.getSize()
    }

    this.state.scoreDisplay = {
      font: new gamejs.font.Font(`${fontSize}px QAH`),
      pos: [this.state.scoreTitle.pos[0] + this.state.scoreTitle.size[0], this.state.scoreTitle.pos[1]],
    }

    this.state.footer = {
      img: gamejs.image.load(this.resources.footer).scale(this.config.footerSize),
      pos: [(this.size[0] - this.config.footerSize[0])/2, this.size[1] - this.config.footerSize[1]],
      size: this.config.footerSize
    }

    this.#setupCollider(this.size[0], [0,0])
  }

  #setupCollider(width, pos) {
    if(0 >= width) width = 10
    let collider = new gamejs.graphics.Surface([width, 10])
    if(this.state.colliderVisible)
      collider.fill('#ff0000')
    
    this.state.collider = {
      img: collider,
      pos: pos,
      size: [width, 10],
      mask: new pixelcollision.Mask(collider)
    }
  }

  start() {
    this.displayGame()
    
    setTimeout(() => {
      this.state.started = true
    }, this.config.gameStartDelay)
  }

  displayGame() {
    this.state.display = true
  }

  onTick(msDuration) {
    console.log(this.state)
    if(!this.state.display) return

    this.display.clear()
    
    this.display.blit(this.state.scorebg.img, this.state.scorebg.pos)
    
    this.display.blit(
      this.state.scoreTitle.font.render('SCORE: ', '#ffff'),
      this.state.scoreTitle.pos,
    )

    this.display.blit(
      this.state.scoreDisplay.font.render(`${this.state.score}`, '#ff0000'),
      this.state.scoreDisplay.pos,
    )

    this.display.blit(this.state.footer.img, this.state.footer.pos)
    
    this.display.blit(this.state.ball.img, this.state.ball.pos)
        
    this.display.blit(this.state.collider.img,  this.state.collider.pos)

    // If not started just display, do not move
    if(!this.state.started) return

    this.#ballTouched()

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
      return
    }


    if(0 >= this.state.ball.dir[1]) {
      // Check ball is going up
      let reachedTop = 0 >= yBall
      if(reachedTop) {
        this.state.ball.dir = vectors.multiply([1, -1], this.state.ball.dir)
      }
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
      let overlapRect = this.state.collider.mask.overlapRect(this.state.ball.mask, relativeOffset)
      if(overlapRect) {
        this.#triggerContact(relativeOffset)
      }
    }

    return false
  }

  #triggerContact(relativeOffset) {
    if(this.state.ball.dir[1] === dir.y.UP) return
    this.state.ball.dir[1] *= -1
    this.state.ball.dir[0] = relativeOffset[0] / this.size[0]

    this.state.score += 1
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
      ((1 - Math.max(l.x, r.x)) * this.size[0]) - this.config.colliderOffset.sides,
      (Math.max(l.y, r.y) * this.size[1]) - this.config.colliderOffset.top
    ]

    width = (this.size[0] * width) + (2 * this.config.colliderOffset.sides)

    this.#setupCollider(width, pos)
  }

  toggleColliderVisible() {
    this.state.colliderVisible = !this.state.colliderVisible
  }

}

gamejs.preload([resources.ball, resources.footer, resources.scorebg])

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const img = document.getElementById("vbackground");

canvasElement.width = img.width
canvasElement.height = img.height

let running = false

const gameConfig = loadConfig('juggle', config)

const game = new Juggle(gameConfig, resources)
const { controls, camera } = setupControls()

function drawImage(results) {
  canvasCtx.save();
  
  canvasCtx.translate(canvasElement.width, 0)
  canvasCtx.scale(-1, 1)
  
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.globalCompositeOperation = 'destination-over';
  canvasCtx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.restore();
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
    
  const selfieSegmentation = new selfie.SelfieSegmentation({locateFile: (file) => {
    switch(file) {
      case 'selfie_segmentation.binarypb':
        return selfie_segmentation
      case 'selfie_segmentation_landscape.tflite':
        return selfie_segmentation_landscape
      case 'selfie_segmentation_solution_simd_wasm_bin.js':
        return selfie_segmentation_solution_simd_wasm_bin_js
      case 'selfie_segmentation_solution_simd_wasm_bin.wasm':
        return selfie_segmentation_solution_simd_wasm_bin
    }
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  }});
  
  selfieSegmentation.setOptions({
    modelSelection: 1,
  });

  selfieSegmentation.onResults(drawImage);

  const camera = new cameraUtils.Camera(videoElement, {
    onFrame: async () => {
      await pose.send({image: videoElement});
      await selfieSegmentation.send({image: videoElement});
    },
    width: 1280,
    height: 720
  });

  return { controls: pose, camera: camera }
}

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

gamejs.ready(function() {
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

    if(event.key == gamejs.event.K_c){
      game.toggleColliderVisible()
    }

  })

  game.onDeath(function() {
    show('lose')
    hideGame()
    setTimeout(() => {
      show('idle')
      hide('lose')
      running = false
    }, gameConfig.loseCooldownMs)
  })

  game.onWin(function() {
    show('win')
    hideGame()
    setTimeout(() => {
      show('idle')
      hide('win')
      running = false
    }, gameConfig.winCooldownMs)
  })

  gamejs.onTick(function(msDuration) {
    game.onTick(msDuration)
  })
})

function startGame() {
  if(!running) {
    hide('idle')
    showGame()
    running = true
    game.start()
  }
}

function hideGame() {
  hide('game')
  hide('output_canvas')
}

function showGame() {
  show('game')
  show('output_canvas')
}

controls.initialize()
    .then(() => {
        camera.start()
          .then(() => {
            setTimeout(() => {
              destroy('loader')
              show('idle')
            }, 10000);
            ready = true
          })
      })

document.addEventListener('keyup', (e) => {
  switch(e.code) {
      case 'KeyS':
          startGame()
          break;
      case 'KeyR':
          if(!running)
              window.location = '/'
          else
              location.reload()
          break;
      case 'KeyP':
          configurator();
  }
});
