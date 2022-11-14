let gameListVisible = true

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyE':
            document.location = "./catch/index.html"
            break;
        case 'KeyA':
            document.location = "./kick/index.html"
            break;
        case 'KeyB':
            document.location = "./juggle/index.html"
            break;
        case 'KeyC':
            document.location = "./scream/index.html"
            break;
        case 'KeyD':
            document.location = "./trivia/index.html"
            break;
        case 'KeyS':
            toggleGameList()
            break;
    }
});

function toggleGameList() {
    if (!gameListVisible) {
        show('list-container')
        gameListVisible = true;
    } else {
        hide('list-container')
        gameListVisible = false
    }
}

function hide(id) {
    document.getElementById(id)
        .setAttribute('style', 'display: none;')
}

function show(id) {
    document.getElementById(id)
        .setAttribute('style', '')
}