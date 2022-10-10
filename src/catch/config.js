const config = {
    catcherSize: [200, 200],
    livesSize: [100, 100],
    fallingItemsSize: [150, 150],
    game: {
        lives: 3,
        maxFallingItems: 3,
        fallSpeed: {
            initial: 5,
            step: 1,
            max: 10,
        },
        levelUpMs: 5000,
        winScore: 10,
    },
    loseCooldownMs: 10000,
    winCooldownMs: 10000,
    camera: {
        size: [500, 500],
        sx: 0,
        sy: 0,
        sw: 500,
        sh: 500,
    }
}