/* ============================================================
   RH — REAL HUMAN PRESENCE
   WebRTC + shared place + live movement
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const RH_CONFIG = {

    signalingServer:
        "https://runic-kamdyn-dispersedly.ngrok-free.dev",

    websocketServer:
        "wss://runic-kamdyn-dispersedly.ngrok-free.dev/ws",

    defaultRoom:
        "RH-DEMO",

    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        },
        {
            urls: "stun:stun1.l.google.com:19302"
        }
    ]
};


/* ============================================================
   PLACE DEFINITIONS
============================================================ */

const PLACES = {

    park: {
        name: "Park",
        worldName: "PARK",
        description:
            "A quiet place to walk together."
    },

    devotional: {
        name: "Peace",
        worldName: "PEACE",
        description:
            "A quiet shared place for reflection."
    },

    shopping: {
        name: "Shopping",
        worldName: "SHOPPING",
        description:
            "Walk through the stores together."
    },

    school: {
        name: "School",
        worldName: "SCHOOL",
        description:
            "Be there for the everyday moments."
    },

    home: {
        name: "Home",
        worldName: "HOME",
        description:
            "Sit together, even from different places."
    },

    meet: {
        name: "Meet",
        worldName: "MEET",
        description:
            "Meet somewhere in the middle."
    }
};


/* ============================================================
   DOM
============================================================ */

const welcomeScreen =
    document.getElementById("welcomeScreen");

const setupScreen =
    document.getElementById("setupScreen");

const rhWorld =
    document.getElementById("rhWorld");

const setupPlaceName =
    document.getElementById("setupPlaceName");

const setupPlaceDescription =
    document.getElementById("setupPlaceDescription");

const setupPreviewScene =
    document.getElementById("setupPreviewScene");

const roomInput =
    document.getElementById("roomInput");

const setupStatus =
    document.getElementById("setupStatus");

const enterRhBtn =
    document.getElementById("enterRhBtn");

const backToPlaces =
    document.getElementById("backToPlaces");

const worldPlace =
    document.getElementById("worldPlace");

const activeRoom =
    document.getElementById("activeRoom");

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const localPresence =
    document.getElementById("localPresence");

const remotePresence =
    document.getElementById("remotePresence");

const waitingState =
    document.getElementById("waitingState");

const walkMessage =
    document.getElementById("walkMessage");

const consolePanel =
    document.getElementById("consolePanel");

const consoleOutput =
    document.getElementById("consoleOutput");

const consoleToggle =
    document.getElementById("consoleToggle");

const consoleClose =
    document.getElementById("consoleClose");

const muteBtn =
    document.getElementById("muteBtn");

const cameraBtn =
    document.getElementById("cameraBtn");

const walkBtn =
    document.getElementById("walkBtn");

const recenterBtn =
    document.getElementById("recenterBtn");

const exitRhBtn =
    document.getElementById("exitRhBtn");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");


/* ============================================================
   STATE
============================================================ */

let selectedPlace = "park";

let roomId =
    RH_CONFIG.defaultRoom;

let localStream = null;

let remoteStream = null;

let socket = null;

let peerConnection = null;

let dataChannel = null;

let connectionId = null;

let remotePeerId = null;

let isOfferer = false;

let isMuted = false;

let cameraEnabled = true;

let walkMode = true;

let socketConnected = false;

let peerConnected = false;


/* ============================================================
   PRESENCE POSITION
============================================================ */

const localPosition = {

    x: 35,
    y: 67,
    z: 0.5
};

const remotePosition = {

    x: 65,
    y: 67,
    z: 0.5
};


/* ============================================================
   PLACE SELECTION
============================================================ */

document
    .querySelectorAll(".place-card")
    .forEach(card => {

        card.addEventListener("click", () => {

            selectedPlace =
                card.dataset.place;

            showSetupScreen();
        });
    });


function showSetupScreen() {

    const place =
        PLACES[selectedPlace];

    setupPlaceName.textContent =
        place.name;

    setupPlaceDescription.textContent =
        place.description;

    setupPreviewScene.className =
        `preview-scene ${selectedPlace}`;

    welcomeScreen.classList.remove("active");

    setupScreen.classList.add("active");

    setTimeout(() => {
        roomInput.focus();
    }, 400);
}


/* ============================================================
   BACK
============================================================ */

backToPlaces.addEventListener("click", () => {

    setupScreen.classList.remove("active");

    welcomeScreen.classList.add("active");

});


/* ============================================================
   MORE PLACES
============================================================ */

document
    .getElementById("morePlacesBtn")
    .addEventListener("click", () => {

        alert(
            "RH is designed to expand into more shared places — beaches, campuses, restaurants, neighborhoods, travel destinations, family homes and custom places."
        );

    });


/* ============================================================
   LOGGING
============================================================ */

function log(message, type = "") {

    const line =
        document.createElement("div");

    line.className =
        `console-line ${type}`;

    const time =
        new Date().toLocaleTimeString();

    line.textContent =
        `[${time}] ${message}`;

    consoleOutput.appendChild(line);

    consoleOutput.scrollTop =
        consoleOutput.scrollHeight;

    console.log(`[RH] ${message}`);
}


/* ============================================================
   CONNECTION UI
============================================================ */

function setConnectionState(
    state,
    message
) {

    connectionText.textContent =
        message;

    connectionDot.classList.toggle(
        "connected",
        state === "connected"
    );

    if (state === "connected") {

        rhWorld.classList.add("connected");

    } else {

        rhWorld.classList.remove("connected");
    }
}


/* ============================================================
   ENTER RH
============================================================ */

enterRhBtn.addEventListener(
    "click",
    enterRh
);


roomInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            enterRh();
        }

    }
);


async function enterRh() {

    roomId =
        roomInput.value
            .trim()
            .toUpperCase();

    if (!roomId) {

        setupStatus.textContent =
            "Please enter a room name.";

        return;
    }

    setupStatus.textContent =
        "Requesting camera and microphone…";

    enterRhBtn.disabled = true;

    try {

        await startLocalMedia();

        setupScreen.classList.remove("active");

        rhWorld.className =
            `rh-world ${selectedPlace}`;

        rhWorld.classList.add("connected");

        worldPlace.textContent =
            PLACES[selectedPlace].worldName;

        activeRoom.textContent =
            roomId;

        await connectSignaling();

    } catch (error) {

        console.error(error);

        setupStatus.textContent =
            `Could not start RH: ${error.message}`;

        enterRhBtn.disabled = false;
    }
}


/* ============================================================
   CAMERA + MICROPHONE
============================================================ */

async function startLocalMedia() {

    if (localStream) {
        return;
    }

    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    },
                    facingMode: "user"
                },

                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

        localVideo.srcObject =
            localStream;

        await localVideo.play();

        log(
            "Camera and microphone ready.",
            "good"
        );

        setConnectionState(
            "waiting",
            "CONNECTING"
        );

    } catch (error) {

        log(
            `Media permission error: ${error.message}`,
            "warn"
        );

        throw new Error(
            "Camera/microphone permission was not granted."
        );
    }
}


/* ============================================================
   WEBSOCKET SIGNALING
============================================================ */

function connectSignaling() {

    return new Promise(
        (resolve, reject) => {

            const url =
                `${RH_CONFIG.websocketServer}/${encodeURIComponent(roomId)}`;

            log(
                `Connecting to ${url}`
            );

            socket =
                new WebSocket(url);

            let opened = false;

            socket.onopen = () => {

                opened = true;

                socketConnected = true;

                setConnectionState(
                    "waiting",
                    "ROOM CONNECTED"
                );

                log(
                    `Joined room ${roomId}.`,
                    "good"
                );

                resolve();
            };


            socket.onmessage = async event => {

                try {

                    const message =
                        JSON.parse(event.data);

                    await handleSignal(message);

                } catch (error) {

                    log(
                        `Signal handling error: ${error.message}`,
                        "warn"
                    );
                }
            };


            socket.onerror = () => {

                log(
                    "WebSocket connection error.",
                    "warn"
                );

                if (!opened) {

                    reject(
                        new Error(
                            "Could not connect to RH signaling server."
                        )
                    );
                }
            };


            socket.onclose = () => {

                socketConnected = false;

                peerConnected = false;

                setConnectionState(
                    "waiting",
                    "DISCONNECTED"
                );

                log(
                    "Signaling connection closed.",
                    "warn"
                );
            };
        }
    );
}


/* ============================================================
   SIGNAL HANDLER
============================================================ */

async function handleSignal(message) {

    switch (message.type) {

        case "connected":

            connectionId =
                message.connection_id;

            log(
                `You are ${connectionId}.`,
                "good"
            );

            if (
                message.participants >= 2
            ) {

                log(
                    "Another participant is already in the room."
                );
            }

            break;


        case "peer_joined":

            remotePeerId =
                message.peer_id;

            log(
                "Another real person joined the place.",
                "good"
            );

            waitingState.classList.add(
                "hidden"
            );

            createPeerConnection();

            isOfferer = true;

            await createOffer();

            break;


        case "offer":

            remotePeerId =
                message.sender_id;

            log(
                "Receiving live connection request."
            );

            if (!peerConnection) {
                createPeerConnection();
            }

            isOfferer = false;

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    message.offer
                )
            );

            const answer =
                await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
                answer
            );

            sendSignal({
                type: "answer",
                answer: peerConnection.localDescription
            });

            log(
                "Answer sent.",
                "good"
            );

            break;


        case "answer":

            if (!peerConnection) {
                return;
            }

            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    message.answer
                )
            );

            log(
                "Connection answer accepted.",
                "good"
            );

            break;


        case "ice-candidate":

            if (
                peerConnection &&
                message.candidate
            ) {

                try {

                    await peerConnection.addIceCandidate(
                        new RTCIceCandidate(
                            message.candidate
                        )
                    );

                } catch (error) {

                    log(
                        `ICE candidate error: ${error.message}`,
                        "warn"
                    );
                }
            }

            break;


        case "peer_left":

            log(
                "The other person left the place.",
                "warn"
            );

            handlePeerLeft();

            break;


        case "error":

            log(
                message.message || "Server error.",
                "warn"
            );

            break;


        default:

            break;
    }
}


/* ============================================================
   PEER CONNECTION
============================================================ */

function createPeerConnection() {

    if (peerConnection) {
        return peerConnection;
    }

    peerConnection =
        new RTCPeerConnection({
            iceServers:
                RH_CONFIG.iceServers
        });


    /* --------------------------------------------------------
       LOCAL MEDIA
    -------------------------------------------------------- */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(track => {

                peerConnection.addTrack(
                    track,
                    localStream
                );

            });
    }


    /* --------------------------------------------------------
       REMOTE MEDIA
    -------------------------------------------------------- */

    peerConnection.ontrack =
        event => {

            if (
                !remoteStream
            ) {

                remoteStream =
                    new MediaStream();
            }

            const track =
                event.track;

            if (
                !remoteStream
                    .getTracks()
                    .some(
                        t =>
                            t.id === track.id
                    )
            ) {

                remoteStream.addTrack(
                    track
                );
            }

            remoteVideo.srcObject =
                remoteStream;

            remoteVideo.play()
                .catch(() => {});

            remotePresence
                .classList
                .remove("hidden");

            waitingState
                .classList
                .add("hidden");

            log(
                "Live video/audio received.",
                "good"
            );
        };


    /* --------------------------------------------------------
       ICE
    -------------------------------------------------------- */

    peerConnection.onicecandidate =
        event => {

            if (
                event.candidate
            ) {

                sendSignal({

                    type:
                        "ice-candidate",

                    candidate:
                        event.candidate
                });
            }
        };


    /* --------------------------------------------------------
       CONNECTION STATE
    -------------------------------------------------------- */

    peerConnection.onconnectionstatechange =
        () => {

            const state =
                peerConnection.connectionState;

            log(
                `WebRTC state: ${state}`
            );

            if (
                state === "connected"
            ) {

                peerConnected = true;

                setConnectionState(
                    "connected",
                    "TOGETHER"
                );

                rhWorld.classList.add(
                    "connected"
                );

                waitingState
                    .classList
                    .add("hidden");

                walkMessage
                    .classList
                    .remove("dismissed");

            }


            if (
                state === "failed" ||
                state === "disconnected"
            ) {

                peerConnected = false;

                setConnectionState(
                    "waiting",
                    "RECONNECTING"
                );
            }
        };


    /* --------------------------------------------------------
       DATA CHANNEL
    -------------------------------------------------------- */

    peerConnection.ondatachannel =
        event => {

            dataChannel =
                event.channel;

            configureDataChannel();

            log(
                "Presence movement channel received.",
                "good"
            );
        };


    /* --------------------------------------------------------
       OFFERER CREATES DATA CHANNEL
    -------------------------------------------------------- */

    if (isOfferer) {

        dataChannel =
            peerConnection.createDataChannel(
                "rh-presence",
                {
                    ordered: true
                }
            );

        configureDataChannel();
    }


    return peerConnection;
}


/* ============================================================
   DATA CHANNEL
============================================================ */

function configureDataChannel() {

    if (!dataChannel) {
        return;
    }

    dataChannel.onopen =
        () => {

            log(
                "Shared movement is live.",
                "good"
            );

            sendPresence();

        };


    dataChannel.onmessage =
        event => {

            try {

                const data =
                    JSON.parse(event.data);

                handlePresenceData(data);

            } catch (error) {

                console.warn(
                    "Presence data error",
                    error
                );
            }
        };


    dataChannel.onclose =
        () => {

            log(
                "Movement channel closed.",
                "warn"
            );
        };
}


/* ============================================================
   OFFER
============================================================ */

async function createOffer() {

    if (!peerConnection) {
        createPeerConnection();
    }

    try {

        const offer =
            await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
            offer
        );

        sendSignal({

            type: "offer",

            offer:
                peerConnection.localDescription
        });

        log(
            "Live connection offer sent.",
            "good"
        );

    } catch (error) {

        log(
            `Offer error: ${error.message}`,
            "warn"
        );
    }
}


/* ============================================================
   SEND SIGNAL
============================================================ */

function sendSignal(message) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        log(
            "Signaling socket is not open.",
            "warn"
        );

        return;
    }

    socket.send(
        JSON.stringify(message)
    );
}


/* ============================================================
   PRESENCE MOVEMENT
============================================================ */

function sendPresence() {

    if (
        !dataChannel ||
        dataChannel.readyState !== "open"
    ) {
        return;
    }

    dataChannel.send(
        JSON.stringify({

            type:
                "presence_position",

            x:
                localPosition.x,

            y:
                localPosition.y,

            z:
                localPosition.z,

            place:
                selectedPlace
        })
    );
}


function handlePresenceData(data) {

    if (
        data.type !==
        "presence_position"
    ) {
        return;
    }

    remotePosition.x =
        clamp(data.x, 12, 88);

    remotePosition.y =
        clamp(data.y, 42, 78);

    remotePosition.z =
        clamp(data.z, 0.1, 1);

    updatePresence(
        remotePresence,
        remotePosition
    );


    if (
        data.place &&
        data.place !== selectedPlace
    ) {

        /*
         * Both users should normally choose
         * the same place before entering.
         *
         * This protects the visual experience
         * if one side sends a place value.
         */

        log(
            `Remote presence is in ${data.place}.`
        );
    }
}


/* ============================================================
   UPDATE VISUAL PRESENCE
============================================================ */

function updatePresence(
    element,
    position
) {

    const scale =
        0.72 +
        (
            (position.y - 42) /
            (78 - 42)
        ) * 0.45;

    element.style.setProperty(
        "--x",
        `${position.x}%`
    );

    element.style.setProperty(
        "--y",
        `${position.y}%`
    );

    element.style.setProperty(
        "--scale",
        scale.toFixed(3)
    );
}


/* ============================================================
   MOVE LOCAL PERSON
============================================================ */

function moveLocalTo(
    x,
    y
) {

    if (!walkMode) {
        return;
    }

    localPosition.x =
        clamp(x, 12, 88);

    localPosition.y =
        clamp(y, 43, 78);

    updatePresence(
        localPresence,
        localPosition
    );

    sendPresence();

    walkMessage
        .classList
        .add("dismissed");
}


/* ============================================================
   WORLD CLICK WALKING
============================================================ */

rhWorld.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                ".control-dock, .world-header, .room-chip, .console-panel, .console-toggle, button"
            )
        ) {
            return;
        }

        const rect =
            rhWorld.getBoundingClientRect();

        const x =
            (
                (event.clientX -
                    rect.left) /
                rect.width
            ) * 100;

        const y =
            (
                (event.clientY -
                    rect.top) /
                rect.height
            ) * 100;

        if (
            y < 40 ||
            y > 84
        ) {
            return;
        }

        moveLocalTo(
            x,
            y
        );
    }
);


/* ============================================================
   KEYBOARD MOVEMENT
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (!walkMode) {
            return;
        }

        const active =
            document.activeElement;

        if (
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA"
            )
        ) {
            return;
        }

        const key =
            event.key.toLowerCase();

        const step = 2.2;

        let moved = false;


        if (
            key === "arrowleft" ||
            key === "a"
        ) {

            localPosition.x -= step;

            moved = true;
        }


        if (
            key === "arrowright" ||
            key === "d"
        ) {

            localPosition.x += step;

            moved = true;
        }


        if (
            key === "arrowup" ||
            key === "w"
        ) {

            localPosition.y -= step;

            moved = true;
        }


        if (
            key === "arrowdown" ||
            key === "s"
        ) {

            localPosition.y += step;

            moved = true;
        }


        if (moved) {

            event.preventDefault();

            localPosition.x =
                clamp(
                    localPosition.x,
                    12,
                    88
                );

            localPosition.y =
                clamp(
                    localPosition.y,
                    43,
                    78
                );

            updatePresence(
                localPresence,
                localPosition
            );

            sendPresence();

            walkMessage
                .classList
                .add("dismissed");
        }

    }
);


/* ============================================================
   RECENTER / MEET
============================================================ */

recenterBtn.addEventListener(
    "click",
    () => {

        moveLocalTo(
            50,
            62
        );

        if (
            peerConnected &&
            remotePresence &&
            !remotePresence.classList.contains("hidden")
        ) {

            /*
             * We don't force the other person's position.
             * We simply move ourselves toward the
             * shared meeting point.
             */

            log(
                "Moving toward the shared meeting point.",
                "good"
            );
        }
    }
);


/* ============================================================
   WALK MODE
============================================================ */

walkBtn.addEventListener(
    "click",
    () => {

        walkMode =
            !walkMode;

        walkBtn.classList.toggle(
            "active-control",
            walkMode
        );

        if (walkMode) {

            walkMessage
                .classList
                .remove("dismissed");

            log(
                "Walk mode enabled.",
                "good"
            );

        } else {

            walkMessage
                .classList
                .add("dismissed");

            log(
                "Walk mode paused."
            );
        }
    }
);


/* ============================================================
   MUTE
============================================================ */

muteBtn.addEventListener(
    "click",
    () => {

        if (!localStream) {
            return;
        }

        isMuted =
            !isMuted;

        localStream
            .getAudioTracks()
            .forEach(
                track => {
                    track.enabled =
                        !isMuted;
                }
            );

        muteBtn.classList.toggle(
            "active-control",
            isMuted
        );

        muteBtn.querySelector(
            ".control-text"
        ).textContent =
            isMuted
                ? "Unmute"
                : "Mute";

        muteBtn.querySelector(
            ".control-icon"
        ).textContent =
            isMuted
                ? "🔇"
                : "🎙";

        log(
            isMuted
                ? "Microphone muted."
                : "Microphone unmuted."
        );
    }
);


/* ============================================================
   CAMERA
============================================================ */

cameraBtn.addEventListener(
    "click",
    () => {

        if (!localStream) {
            return;
        }

        cameraEnabled =
            !cameraEnabled;

        localStream
            .getVideoTracks()
            .forEach(
                track => {
                    track.enabled =
                        cameraEnabled;
                }
            );

        cameraBtn.classList.toggle(
            "active-control",
            cameraEnabled
        );

        cameraBtn.querySelector(
            ".control-text"
        ).textContent =
            cameraEnabled
                ? "Camera"
                : "Off";

        cameraBtn.querySelector(
            ".control-icon"
        ).textContent =
            cameraEnabled
                ? "◉"
                : "○";

        log(
            cameraEnabled
                ? "Camera enabled."
                : "Camera disabled."
        );
    }
);


/* ============================================================
   COPY ROOM
============================================================ */

copyRoomBtn.addEventListener(
    "click",
    async () => {

        try {

            await navigator.clipboard.writeText(
                roomId
            );

            copyRoomBtn.textContent =
                "✓";

            setTimeout(() => {

                copyRoomBtn.textContent =
                    "⧉";

            }, 1200);

            log(
                `Room ${roomId} copied.`,
                "good"
            );

        } catch {

            log(
                "Could not copy room name.",
                "warn"
            );
        }
    }
);


/* ============================================================
   CONSOLE
============================================================ */

consoleToggle.addEventListener(
    "click",
    () => {

        consolePanel.classList.remove(
            "hidden"
        );

        consoleToggle.classList.add(
            "hidden"
        );
    }
);


consoleClose.addEventListener(
    "click",
    () => {

        consolePanel.classList.add(
            "hidden"
        );

        consoleToggle.classList.remove(
            "hidden"
        );
    }
);


/* ============================================================
   EXIT
============================================================ */

exitRhBtn.addEventListener(
    "click",
    exitRh
);


function exitRh() {

    if (dataChannel) {

        try {
            dataChannel.close();
        } catch {}
    }

    if (peerConnection) {

        try {
            peerConnection.close();
        } catch {}
    }

    if (socket) {

        try {
            socket.close();
        } catch {}
    }

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );
    }

    localStream = null;

    remoteStream = null;

    socket = null;

    peerConnection = null;

    dataChannel = null;

    connectionId = null;

    remotePeerId = null;

    peerConnected = false;

    socketConnected = false;

    localVideo.srcObject =
        null;

    remoteVideo.srcObject =
        null;

    remotePresence
        .classList
        .add("hidden");

    waitingState
        .classList
        .remove("hidden");

    setConnectionState(
        "waiting",
        "NOT CONNECTED"
    );

    rhWorld.classList.remove(
        "connected"
    );

    setupScreen.classList.remove(
        "active"
    );

    welcomeScreen.classList.add(
        "active"
    );

    enterRhBtn.disabled = false;

    setupStatus.textContent =
        "Camera and microphone will be requested by your browser.";

    log(
        "Exited RH."
    );
}


/* ============================================================
   PEER LEFT
============================================================ */

function handlePeerLeft() {

    remotePresence
        .classList
        .add("hidden");

    waitingState
        .classList
        .remove("hidden");

    peerConnected = false;

    if (remoteStream) {

        remoteStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );
    }

    remoteStream = null;

    remoteVideo.srcObject =
        null;

    if (peerConnection) {

        try {
            peerConnection.close();
        } catch {}
    }

    peerConnection = null;

    dataChannel = null;

    setConnectionState(
        "waiting",
        "WAITING"
    );

    log(
        "The shared place is waiting for your person."
    );
}


/* ============================================================
   UTILITY
============================================================ */

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        Math.max(
            Number(value),
            min
        ),
        max
    );
}


/* ============================================================
   INITIALIZE
============================================================ */

roomInput.value =
    RH_CONFIG.defaultRoom;

consolePanel.classList.add(
    "hidden"
);

updatePresence(
    localPresence,
    localPosition
);

updatePresence(
    remotePresence,
    remotePosition
);

log(
    "RH frontend initialized.",
    "good"
);

log(
    "Choose a place to begin."
);
