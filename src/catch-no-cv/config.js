const config = {
    catcherSize: [300, 200],
    livesSize: [200, 100],
    fallingItemsSize: [200, 150],
    game: {
        lives: 3,
        fallingItems: {
            initial: 1,
            step: 1,
            max: 1,
            levelUpStep: 0,
        },
        fallSpeed: {
            initial:6,
            step: 1,
            max: 10,
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