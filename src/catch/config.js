const config = {
    catcherSize: [200, 200],
    livesSize: [100, 100],
    fallingItemsSize: [150, 150],
    game: {
        lives: 3,
        maxFallingItems: 6,
        fallSpeed: {
            initial: 15,
            step: 4,
            max: 30,
        },
        levelUpMs: 5000,
        winScore: 10,
    },
    loseCooldownMs: 10000,
    winCooldownMs: 10000,
    camera: {
        size: [1280, 720],
        sx: 400,
        sy: 0,
        sw: 480,
        sh: 360,
    }
}