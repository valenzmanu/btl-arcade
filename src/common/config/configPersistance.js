function configKey(k) {
    return `config-${k}`
}

function persistConfig(page, config) {
    console.log('persisting config')
    let configJson = JSON.stringify(config);
    localStorage.setItem(configKey(page), configJson)
}

function retrieveConfig(page) {
    let saved = localStorage.getItem(configKey(page))

    return saved ? JSON.parse(saved) : null
}

function loadConfig(page, existing) {
    console.log('Loading config')
    if(!existing) {
        console.log('Invalid existing config, loading from localStorage')
        return retrieveConfig(page)
    }
    
    if(existing.override) {
        console.log('Overriding saved config with existing')
        persistConfig(page, existing)
        return existing
    }

    let saved = retrieveConfig(page)

    if(!saved && existing)
        persistConfig(page, existing)

    return saved || existing
}

function configurator() {
    document.getElementById('configurator').click()
}

function buildConfigForm(config) {
    document.getElementById('config-json')
        .textContent = JSON.stringify(config, null, '\t')
}

function saveConfigForm(page) {
    let txt = document.getElementById('config-json').value

    if(!txt) {
        alert('No se pudede dejar vacia la configuracion!')
        return
    }

    try {
        let parsed = JSON.parse(txt)
        if(parsed)
            persistConfig(page, parsed)
    } catch (error) {
        alert('La configuracion no es valida!')
        return
    }

}