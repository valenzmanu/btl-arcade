const config = {
    catcherSize: [200, 200],
    livesSize: [80, 80],
    fallingItemsSize: [150, 150],
    game: {
        lives: 3,
        fallingItems: {
            initial: 2,
            step: 1,
            max: 2,
            levelUpStep: 1,
            newSpawnOffsetMs: 400,
        },
        fallSpeed: {
            initial:5,
            step: 1,
            max: 15,
        },
        levelUpMs: 2000,
        winScore: 30,
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