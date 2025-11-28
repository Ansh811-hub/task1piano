
const keymap = {
    "a": "key - a",
    "b": "key - b",
    "c": "key - c",
    "d": "key - d",
    "e": "key - e",
    "f": "key - f",
    "g": "key - g",
    "h": "key - h",
    "i": "key - i",
    "j": "key - j",
    "k": "key - k",
    "l": "key - l",
    "m": "key - m",
    "n": "key - n",
    "o": "key - o",
    "p": "key - p",
    "q": "key - q",
    "r": "key - r",
    "s": "key - s",
    "t": "key - t",
    "u": "key - u",
    "v": "key - v",
    "w": "key - w",
    "x": "key - x",
    "y": "key - y",
    "z": "key - z",
    "1": "key - 1",
    "2": "key - 2",
    "3": "key - 3",
    "4": "key - 4",
    "5": "key - 5",
    "6": "key - 6",
    "7": "key - 7",
    "8": "key - 8",
    "9": "key - 9",
    "0": "key - 0",
};

const soundmap = {
    "a": "a.wav",
    "b": "d.wav",
    "c": ";.wav",
    "d": "f.wav",
    "e": "g.wav",
    "f": "h.wav",
    "g": "j.wav",
    "h": "k.wav",
    "i": "l.wav",
    "j": "a.wav",
    "k": "d.wav",
    "l": ";.wav",
    "m": "f.wav",
    "n": "g.wav",
    "o": "a.wav",
    "p": "j.wav",
    "q": "k.wav",
    "r": "l.wav",
    "s": "a.wav",
    "t": "d.wav",
    "u": ";.wav",  
    "v": "f.wav",
    "w": "g.wav",
    "x": "h.wav",
    "y": "j.wav",
    "z": "k.wav",
    "1": "l.wav",
    "2": "a.wav",
    "3": "d.wav",
    "4": ";.wav",
    "5": "f.wav",
    "6": "g.wav",
    "7": "h.wav",
    "8": "j.wav",
    "9": "k.wav",
    "0": "l.wav",
};
// audio + recorder stuff
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// main volume
const masterGain = audioContext.createGain();
masterGain.gain.value = 1;

// recorder will take output from the app (not mic)
const dest = audioContext.createMediaStreamDestination();
masterGain.connect(audioContext.destination);
masterGain.connect(dest);

// storing recording chunks
let mediaRecorder = new MediaRecorder(dest.stream);
let recordedChunks = [];
let recordedBlob = null;

// save audio chunks
mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
};

// after recording, create audio file
mediaRecorder.onstop = () => {
    recordedBlob = new Blob(recordedChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(recordedBlob);

    const link = document.getElementById("downloadLink");
    if (link) {
        link.href = url;
        link.download = "piano-recording.webm";
        link.style.display = "inline-block";
        link.textContent = "Download Recording";
    }

    // enable play btn after recording
    const playBtn = document.getElementById("playRecord");
    if (playBtn) playBtn.disabled = false;
};

// storing loaded audio buffers
const audioBuffers = {};

// load one key sound
async function loadSoundForKey(key) {
    const fileName = soundmap[key];
    if (!fileName) return;

    const response = await fetch(`tunes/${fileName}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    audioBuffers[key] = audioBuffer;
}

// load all sound files
async function loadAllSounds() {
    for (const key of Object.keys(soundmap)) {
        try {
            await loadSoundForKey(key);
        } catch (err) {
            console.error("Couldn't load:", key, err);
        }
    }
    console.log("sounds loaded");
}

loadAllSounds();

// play sound when key pressed
function playSound(key, keyElement) {
    const buffer = audioBuffers[key];
    if (!buffer) {
        console.warn("no audio for:", key);
        return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);

    // remove highlight after sound ends
    if (keyElement) {
        source.onended = () => keyElement.classList.remove("active");
    }

    source.start(0);
}

// keyboard controls
document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key in keymap) {
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (keyElement) {
            keyElement.classList.add("active");

            if (audioContext.state === "suspended") audioContext.resume();

            playSound(key, keyElement);
        }
    }
});

document.addEventListener("keyup", (event) => {
    const keyElement = document.querySelector(`[data-key="${event.key.toLowerCase()}"]`);
    if (keyElement) keyElement.classList.remove("active");
});

// building the piano UI (24 keys)
const totalkeys = 24;
const piano = document.querySelector(".piano");
const keylist = Object.keys(keymap).slice(0, totalkeys);

// pattern for white/black keys in an octave
const octavePattern = [
    "white","black","white","black","white","white",
    "black","white","black","white","black","white"
];

const whiteKeyWidth = 50;
let whiteIndex = 0;

// create keys visually
for (let i = 0; i < totalkeys; i++) {
    const k = keylist[i];
    const div = document.createElement("div");
    const type = octavePattern[i % 12];

    div.className = "key " + type + " " + keymap[k];
    div.dataset.key = k;
    div.textContent = k.toUpperCase();

    if (type === "white") {
        div.style.position = "relative";
        whiteIndex++;
    } else {
        // approx position for black keys
        const leftPos = whiteIndex * whiteKeyWidth - 18;
        div.style.position = "absolute";
        div.style.left = leftPos + "px";
        div.style.zIndex = 10;
    }

    piano.appendChild(div);
}

// recording buttons
const startBtn = document.getElementById("startRecord");
const stopBtn = document.getElementById("stopRecord");
const playBtn = document.getElementById("playRecord");
const downloadLink = document.getElementById("downloadLink");

if (startBtn && stopBtn && playBtn) {

    stopBtn.disabled = true;
    playBtn.disabled = true;
    if (downloadLink) downloadLink.style.display = "none";

    // start recording
    startBtn.addEventListener("click", () => {
        if (mediaRecorder.state === "recording") return;

        recordedChunks = [];
        recordedBlob = null;

        if (downloadLink) downloadLink.style.display = "none";

        audioContext.resume();
        mediaRecorder.start();
        console.log("recording...");

        startBtn.disabled = true;
        stopBtn.disabled = false;
        playBtn.disabled = true;
    });

    // stop recording
    stopBtn.addEventListener("click", () => {
        if (mediaRecorder.state === "inactive") return;

        mediaRecorder.stop();
        console.log("stopped");

        stopBtn.disabled = true;
        startBtn.disabled = false;
    });

    // play recorded audio
    playBtn.addEventListener("click", () => {
        if (!recordedBlob) {
            console.warn("no recording yet");
            return;
        }

        const url = URL.createObjectURL(recordedBlob);
        new Audio(url).play();
        console.log("playing...");
    });
}
