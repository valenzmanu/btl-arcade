var AudioContext;
var audioContent;
var audioDB = 0;
var sampleFreq = config.audio.sampleFreqMs
let debug = config.audio.debug
let maxThreshold = config.audio.maxThresholdDB

var listenAudio = function (stream) {
    console.log("Running sound allowed")
    var audioStream = audioContent.createMediaStreamSource(stream);
    var analyser = audioContent.createAnalyser();
    var fftSize = 1024;

    analyser.fftSize = fftSize;
    audioStream.connect(analyser);

    var bufferLength = analyser.frequencyBinCount;
    var frequencyArray = new Uint8Array(bufferLength);

    var showVolume = function () {
        setTimeout(showVolume, sampleFreq);
        analyser.getByteFrequencyData(frequencyArray);
        var total = 0
        for (var i = 0; i < 255; i++) {
            var x = frequencyArray[i];
            total += x * x;
        }
        var rms = Math.sqrt(total / bufferLength);
        audioDB = 20 * (Math.log(rms) / Math.log(10));
        audioDB = Math.max(audioDB, 0); // sanity check
        if (debug) {
            console.log(`Audio level at ${Math.floor(audioDB)} dB`)
        }
    }
    showVolume();
}

var handleAudioNotAllowed = function (error) {
    console.log("You must allow your microphone.")
    console.log(error);
}

var getVolume = function () {
    return audioDB
}

var getThrPercReached = function () {
    return 100 * (audioDB / maxThreshold)
}