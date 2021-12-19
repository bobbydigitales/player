let playlistInput: HTMLInputElement = document.getElementById('playlistInput') as HTMLInputElement;
let playlistGoButton: HTMLButtonElement = document.getElementById('playlistSubmit') as HTMLButtonElement;
let playerAudio: HTMLAudioElement = document.getElementById('playerAudio') as HTMLAudioElement;
let consoleDiv: HTMLDivElement = document.getElementById('console') as HTMLDivElement;

playlistInput.value = `http://nasbox:9999/music/work/FearOfDark/Fearofdark%20-%20The%20Coffee%20Zone/playlist.pls`

playerAudio.controls = true;
let playlist: { fullPath: string, filename: string }[] = [];
let currentTrackIndex = 0;

interface WebFileSystemEntry {
    name: string,
    type: "directory" | "file",
    mtime: number
}

async function BuildMusicTree(root: string) {
    let listing = await (await fetch(root)).json() as WebFileSystemEntry[];

    for (let entry of listing) {
        if (entry.type === 'directory') {
            console.log("directory!");
        }
    }

}

// @ts-ignore
navigator.mediaSession.setActionHandler('previoustrack', function () {
    changeTrack(-1);
});

// @ts-ignore
navigator.mediaSession.setActionHandler('nexttrack', function () {
    changeTrack(1);
});

function dropHandler(event: DragEvent) {
    event.preventDefault();
    playlistInput.value = event.dataTransfer!.getData("text");
    onPlaylistGoButtonClicked();
}

function preventDefault(event: Event) {
    event.preventDefault();
}

window.addEventListener('drop', dropHandler);
window.addEventListener('dragenter', preventDefault);
window.addEventListener('dragover', preventDefault);

function onPlaylistNextButtonClicked() {
    changeTrack(1);
}

function onPlaylistPreviousButtonClicked() {
    changeTrack(-1);
}


function changeTrack(change: number) {
    currentTrackIndex += change;

    if (currentTrackIndex >= playlist.length) {
        currentTrackIndex = 0;
    }

    if (currentTrackIndex < 0) {
        currentTrackIndex = playlist.length - 1;
    }


    let track = playlist[currentTrackIndex];
    log("Playing " + track.filename);

    playerAudio.volume = 0.25;
    playerAudio.src = track.fullPath;
    playerAudio.play();
}

function playNextTrack() {
    changeTrack(1);
}

playerAudio.addEventListener('ended', () => {
    playNextTrack();
});

let maxConsoleLogLines = 20;
let consoleLogLines: string[] = [];

function log(message: string) {
    consoleLogLines.unshift(message);
    if (consoleLogLines.length > maxConsoleLogLines) {
        consoleLogLines.pop();
    }

    consoleDiv.innerHTML = consoleLogLines.join('<br>');
}


log("Ready! ");

BuildMusicTree(`http://nasbox:9999/muz/`);

async function onPlaylistGoButtonClicked() {
    let playlistURI = playlistInput.value;
    let playlistPathMatches = playlistURI.match("^.*/");

    if (!playlistPathMatches) {
        return;
    }

    let playlistPath = playlistPathMatches[0];



    let response = await fetch(playlistURI);
    let playlistData = await response.text();

    if (!playlistData) {
        return;
    }

    log("Loaded playlist " + playlistURI);

    // console.log(playlistPath);
    // console.log(playlistData);

    playlist = [];
    currentTrackIndex = -1;
    playlistData.split('\n').forEach((entry) => {
        playlist.push({ filename: entry, fullPath: playlistPath + (encodeURIComponent(entry.trim())) });
    });



    playNextTrack();
}

// http://nasbox:9999/music/work/FearOfDark/Fearofdark%20-%20The%20Coffee%20Zone/playlist.pls", index: 0, input: "http://nasbox:9999/music/work/FearOfDark/Fearofdark%20-%20The%20Coffee%20Zone/playlist.pls