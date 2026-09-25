/* ============================================================
   RH — REAL HUMAN PRESENCE
   WebRTC FRONTEND
============================================================ */


/* ============================================================
   RH CONFIGURATION
============================================================ */

const RH_CONFIG = {

    signalingServer:
        "https://runic-kamdyn-dispersedly.ngrok-free.dev",

    websocketServer:
        "wss://runic-kamdyn-dispersedly.ngrok-free.dev/ws",

    defaultRoom:
        "RH-DEMO"
};


/* ============================================================
   DOM ELEMENTS
============================================================ */

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const localPlaceholder =
    document.getElementById("localPlaceholder");

const remotePlaceholder =
    document.getElementById("remotePlaceholder");

const remoteMessage =
    document.getElementById("remoteMessage");

const localState =
    document.getElementById("localState");

const remoteState =
    document.getElementById("remoteState");

const remoteLive =
    document.getElementById("remoteLive");

const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");

const roomInput =
    document.getElementById("roomInput");

const roomDisplay =
    document.getElementById("roomDisplay");

const connectionLog =
    document.getElementById("connectionLog");

const cameraButton =
    document.getElementById("cameraButton");

const muteButton =
    document.getElementById("muteButton");

const connectButton =
    document.getElementById("connectButton");

const joinButton =
    document.getElementById("joinButton");

const leaveButton =
    document.getElementById("leaveButton");


/* ============================================================
   APPLICATION STATE
============================================================ */

let localStream = null;

let peerConnection = null;

let websocket = null;

let roomId =
    RH_CONFIG.defaultRoom;

let connectionId = null;

let peerId = null;

let isMuted = false;

let isLeaving = false;


/* ============================================================
   WEBRTC CONFIGURATION
============================================================ */

const peerConfiguration = {

    iceServers: [

        {
            urls: [
                "stun:stun.l.google.com:19302"
            ]
        }

    ]
};


/* ============================================================
   LOGGING
============================================================ */

function log(message) {

    const line =
        document.createElement("div");

    line.className =
        "log-line";

    const time =
        document.createElement("span");

    time.className =
        "log-time";

    const now =
        new Date();

    time.textContent =
        now.toLocaleTimeString();

    const text =
        document.createElement("span");

    text.textContent =
        message;

    line.appendChild(time);
    line.appendChild(text);

    connectionLog.appendChild(line);

    connectionLog.scrollTop =
        connectionLog.scrollHeight;

    console.log("[RH]", message);
}


/* ============================================================
   STATUS
============================================================ */

function setStatus(
    state,
    message
) {

    statusDot.className =
        "status-dot " + state;

    statusText.textContent =
        message;
}


/* ============================================================
   INITIALIZE
============================================================ */

roomInput.value =
    RH_CONFIG.defaultRoom;

roomDisplay.textContent =
    `Room: ${RH_CONFIG.defaultRoom}`;

log(
    "Frontend configuration loaded."
);

log(
    `Signaling: ${RH_CONFIG.signalingServer}`
);


/* ============================================================
   CAMERA
============================================================ */

async function startCamera() {

    if (localStream) {

        log(
            "Camera is already running."
        );

        return;
    }

    try {

        log(
            "Requesting camera and microphone..."
        );

        localStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    facingMode:
                        "user"
                },

                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }

            });

        localVideo.srcObject =
            localStream;

        localPlaceholder.style.display =
            "none";

        localState.textContent =
            "Camera + microphone ready";

        cameraButton.innerHTML =
            "<span>✓</span><span>Camera Ready</span>";

        muteButton.disabled =
            false;

        connectButton.disabled =
            false;

        log(
            "Camera and microphone ready."
        );

    } catch (error) {

        console.error(error);

        log(
            `Camera error: ${error.message}`
        );

        alert(
            "RH needs access to your camera and microphone. " +
            "Please allow browser permissions and try again."
        );
    }
}


/* ============================================================
   CREATE PEER CONNECTION
============================================================ */

function createPeerConnection() {

    if (peerConnection) {

        return peerConnection;
    }

    log(
        "Creating WebRTC peer connection..."
    );

    peerConnection =
        new RTCPeerConnection(
            peerConfiguration
        );


    /* --------------------------------------------------------
       Add local media
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
       Receive remote media
    -------------------------------------------------------- */

    peerConnection.ontrack =
        event => {

            log(
                "Remote media received."
            );

            const [stream] =
                event.streams;

            if (!stream) {
                return;
            }

            remoteVideo.srcObject =
                stream;

            remotePlaceholder.style.display =
                "none";

            remoteLive.classList.remove(
                "hidden"
            );

            remoteState.textContent =
                "Live connection";

        };


    /* --------------------------------------------------------
       ICE candidate
    -------------------------------------------------------- */

    peerConnection.onicecandidate =
        event => {

            if (
                event.candidate &&
                websocket &&
                websocket.readyState ===
                    WebSocket.OPEN
            ) {

                sendSignal({

                    type: "ice_candidate",

                    candidate:
                        event.candidate
                });

            }

        };


    /* --------------------------------------------------------
       Connection state
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

                setStatus(
                    "online",
                    "Real people connected"
                );

                remoteState.textContent =
                    "Live connection";

            }

            if (
                state === "disconnected" ||
                state === "failed"
            ) {

                setStatus(
                    "offline",
                    "Connection interrupted"
                );

            }

            if (
                state === "closed"
            ) {

                setStatus(
                    "offline",
                    "Connection closed"
                );

            }

        };


    /* --------------------------------------------------------
       ICE state
    -------------------------------------------------------- */

    peerConnection.oniceconnectionstatechange =
        () => {

            log(
                `ICE state: ${
                    peerConnection.iceConnectionState
                }`
            );

        };


    return peerConnection;
}


/* ============================================================
   WEBSOCKET
============================================================ */

function connectSignaling() {

    if (
        websocket &&
        websocket.readyState ===
            WebSocket.OPEN
    ) {

        log(
            "Already connected to signaling."
        );

        return;
    }

    const cleanRoom =
        roomId.trim().toUpperCase();

    if (!cleanRoom) {

        alert(
            "Please enter an RH room name."
        );

        return;
    }

    roomId =
        cleanRoom;

    roomDisplay.textContent =
        `Room: ${roomId}`;

    const websocketUrl =
        `${RH_CONFIG.websocketServer}/${encodeURIComponent(roomId)}`;

    log(
        `Connecting to RH room ${roomId}...`
    );

    setStatus(
        "connecting",
        "Connecting..."
    );

    websocket =
        new WebSocket(websocketUrl);


    websocket.onopen =
        () => {

            log(
                "Signaling connection established."
            );

            setStatus(
                "online",
                "Signaling connected"
            );

            joinButton.disabled =
                true;

            roomInput.disabled =
                true;

            leaveButton.disabled =
                false;

            if (localStream) {

                connectButton.disabled =
                    false;

            }

        };


    websocket.onmessage =
        async event => {

            try {

                const message =
                    JSON.parse(event.data);

                await handleSignal(
                    message
                );

            } catch (error) {

                console.error(error);

                log(
                    `Message handling error: ${error.message}`
                );

            }

        };


    websocket.onerror =
        error => {

            console.error(
                "WebSocket error:",
                error
            );

            log(
                "WebSocket signaling error."
            );

            setStatus(
                "offline",
                "Signaling error"
            );

        };


    websocket.onclose =
        () => {

            log(
                "Signaling connection closed."
            );

            setStatus(
                "offline",
                "Not connected"
            );

            joinButton.disabled =
                false;

            roomInput.disabled =
                false;

            leaveButton.disabled =
                true;

        };
}


/* ============================================================
   SIGNAL MESSAGE HANDLER
============================================================ */

async function handleSignal(
    message
) {

    const type =
        message.type;


    /* --------------------------------------------------------
       Server connected
    -------------------------------------------------------- */

    if (
        type === "connected"
    ) {

        connectionId =
            message.connection_id;

        log(
            `Joined room ${message.room_id} as ${connectionId}.`
        );

        log(
            `Participants: ${message.participants}`
        );

        return;
    }


    /* --------------------------------------------------------
       Another person joined
    -------------------------------------------------------- */

    if (
        type === "peer_joined"
    ) {

        peerId =
            message.peer_id;

        log(
            `Another person joined: ${peerId}`
        );

        remoteMessage.textContent =
            "Family joined. Connecting...";

        remoteState.textContent =
            "Family joined";

        /*
         * The person who was already in the room
         * creates the WebRTC offer.
         */

        if (!peerConnection) {

            createPeerConnection();

        }

        await createOffer();

        return;
    }


    /* --------------------------------------------------------
       WebRTC offer
    -------------------------------------------------------- */

    if (
        type === "offer"
    ) {

        peerId =
            message.sender_id;

        log(
            "WebRTC offer received."
        );

        if (!peerConnection) {

            createPeerConnection();

        }

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

            answer: answer

        });

        log(
            "WebRTC answer sent."
        );

        return;
    }


    /* --------------------------------------------------------
       WebRTC answer
    -------------------------------------------------------- */

    if (
        type === "answer"
    ) {

        log(
            "WebRTC answer received."
        );

        if (!peerConnection) {
            return;
        }

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                message.answer
            )
        );

        log(
            "Remote description applied."
        );

        return;
    }


    /* --------------------------------------------------------
       ICE candidate
    -------------------------------------------------------- */

    if (
        type === "ice_candidate"
    ) {

        if (
            !peerConnection ||
            !message.candidate
        ) {

            return;
        }

        try {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    message.candidate
                )
            );

        } catch (error) {

            console.error(error);

            log(
                "Could not add ICE candidate."
            );

        }

        return;
    }


    /* --------------------------------------------------------
       Peer left
    -------------------------------------------------------- */

    if (
        type === "peer_left"
    ) {

        log(
            "The other person left the RH room."
        );

        remoteVideo.srcObject =
            null;

        remotePlaceholder.style.display =
            "flex";

        remoteMessage.textContent =
            "Waiting for family...";

        remoteLive.classList.add(
            "hidden"
        );

        remoteState.textContent =
            "Not connected";

        peerId =
            null;

        if (peerConnection) {

            peerConnection.close();

            peerConnection =
                null;

        }

        setStatus(
            "online",
            "Waiting for family"
        );

        return;
    }


    /* --------------------------------------------------------
       Server error
    -------------------------------------------------------- */

    if (
        type === "error"
    ) {

        log(
            `Server: ${message.message}`
        );

        alert(
            message.message
        );

        return;
    }

}


/* ============================================================
   CREATE OFFER
============================================================ */

async function createOffer() {

    if (!peerConnection) {

        createPeerConnection();

    }

    log(
        "Creating WebRTC offer..."
    );

    const offer =
        await peerConnection.createOffer({

            offerToReceiveAudio: true,

            offerToReceiveVideo: true

        });

    await peerConnection.setLocalDescription(
        offer
    );

    sendSignal({

        type: "offer",

        offer: offer

    });

    log(
        "WebRTC offer sent."
    );
}


/* ============================================================
   SEND SIGNAL
============================================================ */

function sendSignal(
    data
) {

    if (
        !websocket ||
        websocket.readyState !==
            WebSocket.OPEN
    ) {

        log(
            "Cannot send signal: WebSocket is not connected."
        );

        return;
    }

    websocket.send(
        JSON.stringify(data)
    );

}


/* ============================================================
   MUTE
============================================================ */

function toggleMute() {

    if (!localStream) {
        return;
    }

    const audioTracks =
        localStream.getAudioTracks();

    if (
        audioTracks.length === 0
    ) {

        return;
    }

    isMuted =
        !isMuted;

    audioTracks.forEach(
        track => {
            track.enabled =
                !isMuted;
        }
    );

    if (isMuted) {

        muteButton.innerHTML =
            "<span>🔇</span><span>Unmute</span>";

        localState.textContent =
            "Microphone muted";

        log(
            "Microphone muted."
        );

    } else {

        muteButton.innerHTML =
            "<span>🎙️</span><span>Mute</span>";

        localState.textContent =
            "Camera + microphone ready";

        log(
            "Microphone unmuted."
        );

    }

}


/* ============================================================
   LEAVE ROOM
============================================================ */

function leaveRoom() {

    if (isLeaving) {
        return;
    }

    isLeaving =
        true;

    log(
        "Leaving RH room..."
    );


    if (peerConnection) {

        peerConnection.close();

        peerConnection =
            null;

    }


    if (websocket) {

        websocket.close();

        websocket =
            null;

    }


    peerId =
        null;

    connectionId =
        null;

    remoteVideo.srcObject =
        null;

    remotePlaceholder.style.display =
        "flex";

    remoteMessage.textContent =
        "Waiting for family...";

    remoteLive.classList.add(
        "hidden"
    );

    remoteState.textContent =
        "Not connected";

    setStatus(
        "offline",
        "Not connected"
    );

    joinButton.disabled =
        false;

    roomInput.disabled =
        false;

    leaveButton.disabled =
        true;

    isLeaving =
        false;

}


/* ============================================================
   BUTTON EVENTS
============================================================ */

cameraButton.addEventListener(
    "click",
    startCamera
);

muteButton.addEventListener(
    "click",
    toggleMute
);

joinButton.addEventListener(
    "click",
    () => {

        roomId =
            roomInput.value
                .trim()
                .toUpperCase();

        if (!roomId) {

            alert(
                "Enter a room name."
            );

            return;
        }

        connectSignaling();

    }
);

connectButton.addEventListener(
    "click",
    () => {

        if (!localStream) {

            alert(
                "Start your camera first."
            );

            return;
        }

        if (
            !websocket ||
            websocket.readyState !==
                WebSocket.OPEN
        ) {

            connectSignaling();

            return;
        }

        log(
            "Ready for another person to join."
        );

        connectButton.innerHTML =
            "<span>✓</span><span>Waiting...</span>";

    }
);

leaveButton.addEventListener(
    "click",
    leaveRoom
);


/* ============================================================
   BEFORE PAGE CLOSE
============================================================ */

window.addEventListener(
    "beforeunload",
    () => {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

        }

        if (peerConnection) {

            peerConnection.close();

        }

        if (websocket) {

            websocket.close();

        }

    }
);


/* ============================================================
   STARTUP
============================================================ */

log(
    "RH WebRTC frontend initialized."
);

log(
    `Default room: ${RH_CONFIG.defaultRoom}`
);
