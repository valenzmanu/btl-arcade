const config = {
    catcherSize: [200, 200],
    livesSize: [100, 100],
    fallingItemsSize: [150, 150],
    game: {
        lives: 3,
        fallingItems: {
            initial: 1,
            step: 1,
            max: 1,
            levelUpStep: 0,
        },
        fallSpeed: {
            initial:2,
            step: 1,
            max: 6,
        },
        levelUpMs: 2000,
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
    },
    override: true,
}