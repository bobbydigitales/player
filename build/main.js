"use strict";
class PlaylistEntry {
    constructor(filename, fullPath) {
        this.filename = filename;
        this.fullPath = fullPath;
    }
}
class SaveData {
    constructor(playlist, currentTrackIndex, currentTime) {
        this.playlist = playlist;
        this.currentTrackIndex = currentTrackIndex;
        this.currentTime = currentTime;
    }
}
class UI {
    setIntialPlaylistURL(url) {
        this.playlistInput.value = url;
    }
    constructor(playlistInput, playlistGoButton, playlistPrevious, playlistNext, player, logger) {
        this.playlistInput = playlistInput;
        this.playlistGoButton = playlistGoButton;
        this.playlistPrevious = playlistPrevious;
        this.playlistNext = playlistNext;
        this.player = player;
        this.logger = logger;
        this.player.playerAudio.controls = true;
        this.playlistGoButton.addEventListener("click", (e) => {
            this.onPlaylistGoButtonClicked();
        });
        this.playlistPrevious.addEventListener("click", (e) => {
            this.player.changeTrack(-1);
        });
        this.playlistNext.addEventListener("click", (e) => {
            this.player.changeTrack(1);
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
            this.player.changeTrack(-1);
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
            this.player.changeTrack(1);
        });
        window.addEventListener("drop", (e) => {
            this.dropHandler(e);
        });
        window.addEventListener("dragenter", (e) => {
            this.preventDefault(e);
        });
        window.addEventListener("dragover", (e) => {
            this.preventDefault(e);
        });
        window.addEventListener("keydown", (e) => {
            this.keyboardHandler(e);
        });
    }
    dropHandler(event) {
        event.preventDefault();
        this.playlistInput.value = event.dataTransfer.getData("text");
        // onPlaylistGoButtonClicked();
        let playlistURI = this.playlistInput.value;
        this.player.loadAndPlayNewPlaylist(playlistURI);
    }
    preventDefault(event) {
        event.preventDefault();
    }
    keyboardHandler(e) {
        let amount = 0;
        switch (e.key) {
            case "ArrowRight":
                this.player.changeTrack(1);
                break;
            case "ArrowLeft":
                this.player.changeTrack(-1);
                break;
            case "ArrowUp":
                amount = 10;
                if (e.shiftKey) {
                    amount *= 10;
                }
                this.player.changeTrack(amount);
                break;
            case "ArrowDown":
                amount = -10;
                if (e.shiftKey) {
                    amount *= 10;
                }
                this.player.changeTrack(amount);
                break;
        }
    }
    onPlaylistNextButtonClicked() {
        this.player.changeTrack(1);
    }
    onPlaylistPreviousButtonClicked() {
        this.player.changeTrack(-1);
    }
    async onPlaylistGoButtonClicked() {
        let playlistURI = this.playlistInput.value;
        this.player.loadAndPlayNewPlaylist(playlistURI);
    }
}
class Player {
    // consoleDiv: HTMLDivElement
    constructor(playerAudio, logger) {
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.playPromise = null;
        this.saveData = null;
        this.playerAudio = playerAudio;
        this.logger = logger;
        this.playerAudio.addEventListener("ended", () => {
            this.playNextTrack();
        });
    }
    async changeTrack(change) {
        if (this.playPromise) {
            return;
        }
        if (!(this.playlist.length > 0)) {
            this.logger.log("No this.playlist to play!");
            return;
        }
        this.currentTrackIndex += change;
        if (this.currentTrackIndex >= this.playlist.length) {
            this.currentTrackIndex = 0;
        }
        if (this.currentTrackIndex < 0) {
            this.currentTrackIndex = this.playlist.length - 1;
        }
        let track = this.playlist[this.currentTrackIndex];
        this.logger.log(`Playing [${this.currentTrackIndex + 1}/${this.playlist.length}] ${track.filename}`);
        this.playerAudio.volume = 0.25;
        this.playerAudio.src = track.fullPath;
        this.playPromise = this.playerAudio.play();
        try {
            await this.playPromise;
        }
        catch (e) {
            console.log(e);
        }
        this.playPromise = null;
        this.save();
    }
    playNextTrack() {
        this.changeTrack(1);
    }
    startAutosave() {
        globalThis.setInterval(() => {
            this.save();
        }, 1000);
    }
    save() {
        localStorage.setItem(Player.localStorageKey, JSON.stringify(new SaveData(this.playlist, this.currentTrackIndex, this.playerAudio.currentTime)));
    }
    async load() {
        this.logger.log("Loading...");
        let saveDataText = localStorage.getItem(Player.localStorageKey);
        if (!saveDataText) {
            console.log("No saved playlist...");
            return;
        }
        this.saveData = JSON.parse(saveDataText);
        if (!this.saveData) {
            return;
        }
        this.playlist = this.saveData.playlist;
        this.currentTrackIndex = this.saveData.currentTrackIndex - 1;
        await this.changeTrack(1);
        if (this.saveData) {
            this.playerAudio.currentTime = this.saveData.currentTime;
        }
    }
    async loadAndPlayNewPlaylist(playlistURI) {
        await this.loadPlaylist(playlistURI);
        this.playNextTrack();
    }
    async loadPlaylist(playlistURI) {
        this.saveData = null;
        let isSingleFile = false;
        this.currentTrackIndex = -1;
        for (let filetype of Player.filetypes) {
            if (playlistURI.includes(filetype)) {
                isSingleFile = true;
                break;
            }
        }
        if (isSingleFile) {
            this.playlist = [new PlaylistEntry(playlistURI, playlistURI)];
            return;
        }
        let response = await fetch(playlistURI);
        let playlistData = await response.text();
        if (!playlistData) {
            return;
        }
        let playlistPathMatches = playlistURI.match("^.*/");
        if (!playlistPathMatches) {
            return;
        }
        let playlistPath = playlistPathMatches[0];
        this.logger.log("Loaded playlist " + playlistURI);
        this.playlist = [];
        playlistData.split("\n").forEach((entry) => {
            this.playlist.push(new PlaylistEntry(entry, playlistPath + encodeURIComponent(entry.trim())));
        });
        this.save();
    }
}
Player.localStorageKey = "bobbydigitales_player";
Player.filetypes = ["mp3", "opus", "ogg", "wav", "flac"];
class Logger {
    constructor(consoleDiv) {
        this.maxConsoleLogLines = 50;
        this.consoleLogLines = [];
        this.consoleDiv = consoleDiv;
    }
    log(message) {
        this.consoleLogLines.unshift(message);
        if (this.consoleLogLines.length > this.maxConsoleLogLines) {
            this.consoleLogLines.pop();
        }
        this.consoleDiv.innerHTML = this.consoleLogLines.join("<br>");
    }
}
async function main() {
    let playlistInput = document.getElementById("playlistInput");
    let playlistGoButton = document.getElementById("playlistGoButton");
    let playlistPrevious = document.getElementById("playlistPrevious");
    let playlistNext = document.getElementById("playlistNext");
    let playerAudio = document.getElementById("playerAudio");
    let consoleDiv = document.getElementById("console");
    let logger = new Logger(consoleDiv);
    let player = new Player(playerAudio, logger);
    let ui = new UI(playlistInput, playlistGoButton, playlistPrevious, playlistNext, player, logger);
    ui.setIntialPlaylistURL(`http://localhost:8000/music/miss_monique/playlist.pls`);
    logger.log("Ready! ");
    await player.load();
    player.startAutosave();
}
main();
// interface WebFileSystemEntry {
//   name: string;
//   type: "directory" | "file";
//   mtime: number;
// }
// async function BuildMusicTree(root: string) {
//   let listing = (await (await fetch(root)).json()) as WebFileSystemEntry[];
//   for (let entry of listing) {
//     if (entry.type === "directory") {
//       console.log("directory!");
//     }
//   }
// }
// BuildMusicTree(`http://nasbox:9999/muz/`);
// http://nasbox:9999/music/work/FearOfDark/Fearofdark%20-%20The%20Coffee%20Zone/playlist.pls", index: 0, input: "http://nasbox:9999/music/work/FearOfDark/Fearofdark%20-%20The%20Coffee%20Zone/playlist.pls
