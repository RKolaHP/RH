/* ============================================================
   RH — REAL HUMAN PRESENCE
   Complete frontend application

   Architecture:

   GitHub Pages
        ↓
   Browser
        ├── Camera
        ├── Microphone
        ├── MediaPipe segmentation
        ├── Three.js environment
        └── WebRTC
                 ↕
          Colab / ngrok
                 ↕
             Other user

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
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


/* ============================================================
   APPLICATION STATE
============================================================ */

const state = {

    selectedPlace:
        "park",

    roomId:
        RH_CONFIG.defaultRoom,

    localStream:
        null,

    remoteStream:
        null,

    websocket:
        null,

    peerConnection:
        null,

    dataChannel:
        null,

    connectionId:
        null,

    remotePeerId:
        null,

    isOfferer:
        false,

    connected:
        false,

    cameraEnabled:
        true,

    microphoneEnabled:
        true,

    walking:
        true,

    localPosition: {

        x: 50,
        y: 55

    },

    remotePosition: {

        x: 60,
        y: 55

    },

    targetLocalPosition: {

        x: 50,
        y: 55

    },

    targetRemotePosition: {

        x: 60,
        y: 55

    },

    lastPresenceSend:
        0,

    keys:
        {},

    lastFrame:
        0,

    segmentation:
        null,

    segmentationReady:
        false,

    remoteSegmentation:
        null,

    remoteSegmentationReady:
        false,

    audioContext:
        null,

    remotePanner:
        null,

    remoteGain:
        null,

    three: {

        scene:
            null,

        camera:
            null,

        renderer:
            null,

        localHuman:
            null,

        remoteHuman:
            null,

        localTexture:
            null,

        remoteTexture:
            null,

        localShadow:
            null,

        remoteShadow:
            null,

        clock:
            null

    }

};


/* ============================================================
   DOM
============================================================ */

const dom = {

    welcome:
        document.getElementById("rhWelcome"),

    setup:
        document.getElementById("rhSetup"),

    world:
        document.getElementById("rhWorld"),

    enterRhBtn:
        document.getElementById("enterRhBtn"),

    startRhBtn:
        document.getElementById("startRhBtn"),

    roomInput:
        document.getElementById("roomInput"),

    placeCards:
        document.querySelectorAll(".place-card"),

    localVideo:
        document.getElementById("localVideo"),

    remoteVideo:
        document.getElementById("remoteVideo"),

    localCanvas:
        document.getElementById("localCanvas"),

    remoteCanvas:
        document.getElementById("remoteCanvas"),

    localPresence:
        document.getElementById("localPresence"),

    remotePresence:
        document.getElementById("remotePresence"),

    placeName:
        document.getElementById("placeName"),

    worldRoom:
        document.getElementById("worldRoom"),

    waitingMessage:
        document.getElementById("waitingMessage"),

    connectionDot:
        document.getElementById("connectionDot"),

    connectionText:
        document.getElementById("connectionText"),

    muteBtn:
        document.getElementById("muteBtn"),

    cameraBtn:
        document.getElementById("cameraBtn"),

    walkBtn:
        document.getElementById("walkBtn"),

    meetBtn:
        document.getElementById("meetBtn"),

    copyWorldRoomBtn:
        document.getElementById("copyWorldRoomBtn"),

    exitBtn:
        document.getElementById("exitBtn"),

    movementHint:
        document.getElementById("movementHint"),

    debugHttps:
        document.getElementById("debugHttps"),

    debugCamera:
        document.getElementById("debugCamera"),

    debugSignal:
        document.getElementById("debugSignal"),

    debugWebrtc:
        document.getElementById("debugWebrtc"),

    toast:
        document.getElementById("rhToast"),

    toastText:
        document.getElementById("toastText"),

    rhCanvas:
        document.getElementById("rhCanvas")

};


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeRH
);


function initializeRH() {

    setupUI();

    updateHttpsDebug();

    updateConnectionStatus(
        "waiting",
        "Ready"
    );

    console.log(
        "[RH] Real Human Presence initialized."
    );
}


/* ============================================================
   UI SETUP
============================================================ */

function setupUI() {


    /* --------------------------------------------------------
       Enter RH
    -------------------------------------------------------- */

    dom.enterRhBtn.addEventListener(
        "click",
        async () => {

            showScreen(
                "setup"
            );

            await initializeAudio();

        }
    );


    /* --------------------------------------------------------
       Place selection
    -------------------------------------------------------- */

    dom.placeCards.forEach(
        card => {

            card.addEventListener(
                "click",
                () => {

                    dom.placeCards.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );

                    card.classList.add(
                        "active"
                    );

                    state.selectedPlace =
                        card.dataset.place;

                }
            );

        }
    );


    /* --------------------------------------------------------
       Start RH
    -------------------------------------------------------- */

    dom.startRhBtn.addEventListener(
        "click",
        startRH
    );


    /* --------------------------------------------------------
       Controls
    -------------------------------------------------------- */

    dom.muteBtn.addEventListener(
        "click",
        toggleMicrophone
    );


    dom.cameraBtn.addEventListener(
        "click",
        toggleCamera
    );


    dom.walkBtn.addEventListener(
        "click",
        toggleWalking
    );


    dom.meetBtn.addEventListener(
        "click",
        moveCloserToPerson
    );


    dom.copyWorldRoomBtn.addEventListener(
        "click",
        copyRoom
    );


    dom.exitBtn.addEventListener(
        "click",
        exitRH
    );


    /* --------------------------------------------------------
       Keyboard
    -------------------------------------------------------- */

    window.addEventListener(
        "keydown",
        handleKeyDown
    );


    window.addEventListener(
        "keyup",
        handleKeyUp
    );


    /* --------------------------------------------------------
       Click-to-walk
    -------------------------------------------------------- */

    dom.rhCanvas.addEventListener(
        "click",
        handleWorldClick
    );


    /* --------------------------------------------------------
       Resize
    -------------------------------------------------------- */

    window.addEventListener(
        "resize",
        handleResize
    );

}


/* ============================================================
   SCREEN MANAGEMENT
============================================================ */

function showScreen(screen) {

    dom.welcome.classList.add(
        "hidden"
    );

    dom.setup.classList.add(
        "hidden"
    );

    dom.world.classList.add(
        "hidden"
    );


    if (screen === "welcome") {

        dom.welcome.classList.remove(
            "hidden"
        );

    }


    if (screen === "setup") {

        dom.setup.classList.remove(
            "hidden"
        );

    }


    if (screen === "world") {

        dom.world.classList.remove(
            "hidden"
        );

    }

}


/* ============================================================
   START RH
============================================================ */

async function startRH() {

    state.roomId =
        sanitizeRoom(
            dom.roomInput.value
        );


    if (!state.roomId) {

        showToast(
            "Please enter an RH room name."
        );

        return;

    }


    dom.roomInput.value =
        state.roomId;


    dom.worldRoom.textContent =
        state.roomId;


    prepareWorld();


    showScreen(
        "world"
    );


    updateConnectionStatus(
        "waiting",
        "Starting"
    );


    try {

        await startCamera();

        await initializeSegmentation();

        connectSignaling();

    }

    catch (error) {

        console.error(
            "[RH] Startup error:",
            error
        );

        showToast(
            "Camera setup could not start."
        );

        enterOfflineDemoMode();

    }

}


/* ============================================================
   ROOM SANITIZATION
============================================================ */

function sanitizeRoom(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(
            /[^A-Z0-9-_]/g,
            ""
        )
        .slice(
            0,
            32
        );

}


/* ============================================================
   CAMERA + MICROPHONE
============================================================ */

async function startCamera() {

    updateDebug(
        dom.debugCamera,
        "Requesting"
    );


    if (
        !window.isSecureContext &&
        location.hostname !== "localhost"
    ) {

        updateDebug(
            dom.debugCamera,
            "HTTPS required"
        );

        showToast(
            "RH needs HTTPS for camera access."
        );

        throw new Error(
            "Secure context required."
        );

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        updateDebug(
            dom.debugCamera,
            "Unavailable"
        );

        throw new Error(
            "getUserMedia unavailable."
        );

    }


    try {

        const stream =
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

                    echoCancellation:
                        true,

                    noiseSuppression:
                        true,

                    autoGainControl:
                        true

                }

            });


        state.localStream =
            stream;


        dom.localVideo.srcObject =
            stream;


        await dom.localVideo.play();


        state.cameraEnabled =
            true;

        state.microphoneEnabled =
            true;


        updateDebug(
            dom.debugCamera,
            "OK"
        );


        updateControls();


        console.log(
            "[RH] Camera and microphone ready."
        );

    }

    catch (error) {

        console.error(
            "[RH] getUserMedia error:",
            error
        );


        updateDebug(
            dom.debugCamera,
            error.name || "Denied"
        );


        if (
            error.name ===
            "NotAllowedError"
        ) {

            showToast(
                "Camera/microphone permission was denied."
            );

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            showToast(
                "No camera or microphone was found."
            );

        }

        else {

            showToast(
                "Unable to access your camera."
            );

        }


        throw error;

    }

}


/* ============================================================
   MEDIAPIPE SELFIE SEGMENTATION
============================================================ */

async function initializeSegmentation() {

    if (
        typeof SelfieSegmentation ===
        "undefined"
    ) {

        console.warn(
            "[RH] MediaPipe SelfieSegmentation unavailable."
        );

        showToast(
            "Human cutout engine unavailable. Live video will still work."
        );

        return;

    }


    try {

        state.segmentation =
            new SelfieSegmentation({

                locateFile:
                    file => {

                        return (
                            "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/" +
                            file
                        );

                    }

            });


        state.segmentation.setOptions({

            modelSelection:
                1

        });


        state.segmentation.onResults(
            handleLocalSegmentationResults
        );


        state.segmentationReady =
            true;


        console.log(
            "[RH] Local segmentation ready."
        );

    }

    catch (error) {

        console.warn(
            "[RH] Segmentation initialization failed:",
            error
        );

    }

}


/* ============================================================
   LOCAL SEGMENTATION RESULTS
============================================================ */

function handleLocalSegmentationResults(
    results
) {

    renderTransparentPerson(
        dom.localCanvas,
        results.image,
        results.segmentationMask,
        true
    );

}


/* ============================================================
   PROCESS LOCAL CAMERA FRAME
============================================================ */

async function processLocalSegmentation() {

    if (
        !state.segmentationReady ||
        !state.segmentation
    ) {

        drawFallbackVideo(
            dom.localCanvas,
            dom.localVideo
        );

        return;

    }


    if (
        dom.localVideo.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        return;

    }


    try {

        await state.segmentation.send({

            image:
                dom.localVideo

        });

    }

    catch (error) {

        console.warn(
            "[RH] Segmentation frame error:",
            error
        );

    }

}


/* ============================================================
   TRANSPARENT HUMAN RENDERING
============================================================ */

function renderTransparentPerson(
    canvas,
    image,
    mask,
    mirror
) {

    if (
        !canvas ||
        !image ||
        !mask
    ) {

        return;

    }


    const width =
        canvas.width =
        640;

    const height =
        canvas.height =
        480;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    ctx.save();


    if (mirror) {

        ctx.translate(
            width,
            0
        );

        ctx.scale(
            -1,
            1
        );

    }


    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );


    ctx.restore();


    /* --------------------------------------------------------
       Apply mask.

       We need the mask aligned with the same image transform.
    -------------------------------------------------------- */

    const maskCanvas =
        document.createElement(
            "canvas"
        );


    maskCanvas.width =
        width;

    maskCanvas.height =
        height;


    const maskCtx =
        maskCanvas.getContext(
            "2d"
        );


    maskCtx.save();


    if (mirror) {

        maskCtx.translate(
            width,
            0
        );

        maskCtx.scale(
            -1,
            1
        );

    }


    maskCtx.drawImage(
        mask,
        0,
        0,
        width,
        height
    );


    maskCtx.restore();


    const personPixels =
        ctx.getImageData(
            0,
            0,
            width,
            height
        );


    const maskPixels =
        maskCtx.getImageData(
            0,
            0,
            width,
            height
        );


    for (
        let i = 0;
        i < personPixels.data.length;
        i += 4
    ) {

        const maskValue =
            maskPixels.data[i];


        if (
            maskValue < 100
        ) {

            personPixels.data[i + 3] =
                0;

        }

        else {

            const alpha =
                Math.min(
                    255,
                    Math.max(
                        0,
                        (maskValue - 60) * 1.5
                    )
                );


            personPixels.data[i + 3] =
                alpha;

        }

    }


    ctx.putImageData(
        personPixels,
        0,
        0
    );

}


/* ============================================================
   FALLBACK VIDEO
============================================================ */

function drawFallbackVideo(
    canvas,
    video
) {

    if (
        !video ||
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        return;

    }


    canvas.width =
        640;

    canvas.height =
        480;


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.save();


    ctx.translate(
        canvas.width,
        0
    );


    ctx.scale(
        -1,
        1
    );


    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.restore();

}


/* ============================================================
   THREE.JS WORLD
============================================================ */

function prepareWorld() {

    if (
        state.three.scene
    ) {

        return;

    }


    if (
        typeof THREE ===
        "undefined"
    ) {

        console.error(
            "[RH] Three.js unavailable."
        );

        return;

    }


    const scene =
        new THREE.Scene();


    scene.fog =
        new THREE.Fog(
            0x9fc7bd,
            35,
            90
        );


    const camera =
        new THREE.PerspectiveCamera(
            52,
            window.innerWidth /
            window.innerHeight,
            0.1,
            200
        );


    camera.position.set(
        0,
        8,
        18
    );


    camera.lookAt(
        0,
        1.5,
        0
    );


    const renderer =
        new THREE.WebGLRenderer({

            canvas:
                dom.rhCanvas,

            antialias:
                true,

            alpha:
                false

        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    renderer.shadowMap.enabled =
        true;


    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;


    const clock =
        new THREE.Clock();


    state.three.scene =
        scene;

    state.three.camera =
        camera;

    state.three.renderer =
        renderer;

    state.three.clock =
        clock;


    buildEnvironment();


    createHumanMeshes();


    animateWorld();

}


/* ============================================================
   BUILD ENVIRONMENT
============================================================ */

function buildEnvironment() {

    const scene =
        state.three.scene;


    /* --------------------------------------------------------
       Sky
    -------------------------------------------------------- */

    scene.background =
        new THREE.Color(
            0x9fc9c0
        );


    /* --------------------------------------------------------
       Ambient light
    -------------------------------------------------------- */

    const ambient =
        new THREE.HemisphereLight(
            0xe9ffff,
            0x48605a,
            2.2
        );


    scene.add(
        ambient
    );


    /* --------------------------------------------------------
       Sun
    -------------------------------------------------------- */

    const sun =
        new THREE.DirectionalLight(
            0xfff4d5,
            3.5
        );


    sun.position.set(
        -15,
        25,
        10
    );


    sun.castShadow =
        true;


    sun.shadow.mapSize.width =
        2048;

    sun.shadow.mapSize.height =
        2048;


    scene.add(
        sun
    );


    /* --------------------------------------------------------
       Ground
    -------------------------------------------------------- */

    const groundGeometry =
        new THREE.PlaneGeometry(
            120,
            120
        );


    const groundMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x5e8c70,

            roughness:
                1

        });


    const ground =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );


    ground.rotation.x =
        -Math.PI / 2;


    ground.receiveShadow =
        true;


    scene.add(
        ground
    );


    /* --------------------------------------------------------
       Walking path
    -------------------------------------------------------- */

    const pathGeometry =
        new THREE.PlaneGeometry(
            7,
            100
        );


    const pathMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0xc7b997,

            roughness:
                1

        });


    const path =
        new THREE.Mesh(
            pathGeometry,
            pathMaterial
        );


    path.rotation.x =
        -Math.PI / 2;


    path.position.y =
        0.012;


    path.receiveShadow =
        true;


    scene.add(
        path
    );


    /* --------------------------------------------------------
       Water
    -------------------------------------------------------- */

    const waterGeometry =
        new THREE.PlaneGeometry(
            25,
            35
        );


    const waterMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x4e9eae,

            roughness:
                0.25,

            metalness:
                0.1,

            transparent:
                true,

            opacity:
                0.85

        });


    const water =
        new THREE.Mesh(
            waterGeometry,
            waterMaterial
        );


    water.rotation.x =
        -Math.PI / 2;


    water.position.set(
        -22,
        0.02,
        -5
    );


    scene.add(
        water
    );


    /* --------------------------------------------------------
       Trees
    -------------------------------------------------------- */

    for (
        let i = 0;
        i < 28;
        i++
    ) {

        createTree(
            randomTreeX(),
            randomTreeZ()
        );

    }


    /* --------------------------------------------------------
       Sun sphere
    -------------------------------------------------------- */

    const sunGeometry =
        new THREE.SphereGeometry(
            2.2,
            32,
            32
        );


    const sunMaterial =
        new THREE.MeshBasicMaterial({

            color:
                0xffe6a3

        });


    const sunSphere =
        new THREE.Mesh(
            sunGeometry,
            sunMaterial
        );


    sunSphere.position.set(
        -28,
        24,
        -35
    );


    scene.add(
        sunSphere
    );

}


/* ============================================================
   TREE
============================================================ */

function createTree(
    x,
    z
) {

    const scene =
        state.three.scene;


    const trunkGeometry =
        new THREE.CylinderGeometry(
            0.22,
            0.38,
            3,
            10
        );


    const trunkMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x5c3926

        });


    const trunk =
        new THREE.Mesh(
            trunkGeometry,
            trunkMaterial
        );


    trunk.position.set(
        x,
        1.5,
        z
    );


    trunk.castShadow =
        true;


    scene.add(
        trunk
    );


    const foliageGeometry =
        new THREE.SphereGeometry(
            1.7,
            16,
            12
        );


    const foliageMaterial =
        new THREE.MeshStandardMaterial({

            color:
                0x397a58,

            roughness:
                1

        });


    const foliage =
        new THREE.Mesh(
            foliageGeometry,
            foliageMaterial
        );


    foliage.position.set(
        x,
        4,
        z
    );


    foliage.scale.set(
        1,
        1.15,
        1
    );


    foliage.castShadow =
        true;


    scene.add(
        foliage
    );

}


/* ============================================================
   TREE POSITION HELPERS
============================================================ */

function randomTreeX() {

    let x;

    do {

        x =
            (Math.random() - 0.5) *
            65;

    }

    while (
        Math.abs(x) < 6
    );


    return x;

}


function randomTreeZ() {

    return (
        Math.random() - 0.5
    ) * 80;

}


/* ============================================================
   HUMAN MESHES
============================================================ */

function createHumanMeshes() {

    const scene =
        state.three.scene;


    const localTexture =
        new THREE.CanvasTexture(
            dom.localCanvas
        );


    localTexture.colorSpace =
        THREE.SRGBColorSpace;


    localTexture.minFilter =
        THREE.LinearFilter;


    const remoteTexture =
        new THREE.CanvasTexture(
            dom.remoteCanvas
        );


    remoteTexture.colorSpace =
        THREE.SRGBColorSpace;


    remoteTexture.minFilter =
        THREE.LinearFilter;


    state.three.localTexture =
        localTexture;


    state.three.remoteTexture =
        remoteTexture;


    const geometry =
        new THREE.PlaneGeometry(
            4.2,
            4.2
        );


    const localMaterial =
        new THREE.MeshBasicMaterial({

            map:
                localTexture,

            transparent:
                true,

            depthWrite:
                false,

            side:
                THREE.DoubleSide

        });


    const remoteMaterial =
        new THREE.MeshBasicMaterial({

            map:
                remoteTexture,

            transparent:
                true,

            depthWrite:
                false,

            side:
                THREE.DoubleSide

        });


    const localHuman =
        new THREE.Mesh(
            geometry,
            localMaterial
        );


    const remoteHuman =
        new THREE.Mesh(
            geometry.clone(),
            remoteMaterial
        );


    localHuman.position.set(
        -1,
        2.2,
        4
    );


    remoteHuman.position.set(
        2,
        2.2,
        4
    );


    scene.add(
        localHuman
    );


    scene.add(
        remoteHuman
    );


    state.three.localHuman =
        localHuman;


    state.three.remoteHuman =
        remoteHuman;


    /* --------------------------------------------------------
       Ground shadows
    -------------------------------------------------------- */

    const shadowGeometry =
        new THREE.CircleGeometry(
            1.1,
            32
        );


    const shadowMaterial =
        new THREE.MeshBasicMaterial({

            color:
                0x17241d,

            transparent:
                true,

            opacity:
                0.3,

            depthWrite:
                false

        });


    const localShadow =
        new THREE.Mesh(
            shadowGeometry,
            shadowMaterial.clone()
        );


    const remoteShadow =
        new THREE.Mesh(
            shadowGeometry,
            shadowMaterial.clone()
        );


    localShadow.rotation.x =
        -Math.PI / 2;


    remoteShadow.rotation.x =
        -Math.PI / 2;


    localShadow.position.y =
        0.03;


    remoteShadow.position.y =
        0.03;


    scene.add(
        localShadow
    );


    scene.add(
        remoteShadow
    );


    state.three.localShadow =
        localShadow;


    state.three.remoteShadow =
        remoteShadow;


    /* --------------------------------------------------------
       Hide 3D human until camera starts.
    -------------------------------------------------------- */

    localHuman.visible =
        false;


    remoteHuman.visible =
        false;

}


/* ============================================================
   WORLD ANIMATION
============================================================ */

function animateWorld(
    timestamp = 0
) {

    requestAnimationFrame(
        animateWorld
    );


    if (
        !state.three.renderer ||
        !state.three.scene ||
        !state.three.camera
    ) {

        return;

    }


    const delta =
        Math.min(
            0.05,
            state.three.clock.getDelta()
        );


    updateMovement(
        delta
    );


    updateHumanMeshes();


    updateSpatialAudio();


    processLocalSegmentation();


    if (
        state.three.localTexture
    ) {

        state.three.localTexture.needsUpdate =
            true;

    }


    if (
        state.three.remoteTexture
    ) {

        state.three.remoteTexture.needsUpdate =
            true;

    }


    sendPresenceIfNeeded(
        timestamp
    );


    state.three.renderer.render(
        state.three.scene,
        state.three.camera
    );

}


/* ============================================================
   UPDATE HUMAN MESHES
============================================================ */

function updateHumanMeshes() {

    const local =
        state.three.localHuman;

    const remote =
        state.three.remoteHuman;


    if (local) {

        const position =
            screenToWorld(
                state.localPosition
            );


        local.position.lerp(
            position,
            0.1
        );


        local.visible =
            state.cameraEnabled;


        local.quaternion.copy(
            state.three.camera.quaternion
        );


        const depthScale =
            0.8 +
            (
                1 -
                state.localPosition.y / 100
            ) * 0.45;


        local.scale.set(
            depthScale,
            depthScale,
            depthScale
        );

    }


    if (remote) {

        const position =
            screenToWorld(
                state.remotePosition
            );


        remote.position.lerp(
            position,
            0.1
        );


        remote.visible =
            !!state.remoteStream;


        remote.quaternion.copy(
            state.three.camera.quaternion
        );


        const depthScale =
            0.8 +
            (
                1 -
                state.remotePosition.y / 100
            ) * 0.45;


        remote.scale.set(
            depthScale,
            depthScale,
            depthScale
        );

    }


    updateShadow(
        state.three.localShadow,
        state.three.localHuman
    );


    updateShadow(
        state.three.remoteShadow,
        state.three.remoteHuman
    );

}


/* ============================================================
   SCREEN POSITION → WORLD POSITION
============================================================ */

function screenToWorld(
    position
) {

    const x =
        (
            position.x -
            50
        ) / 8;


    const z =
        (
            position.y -
            50
        ) / 5;


    return new THREE.Vector3(
        x,
        2.2,
        z
    );

}


/* ============================================================
   SHADOW
============================================================ */

function updateShadow(
    shadow,
    human
) {

    if (
        !shadow ||
        !human
    ) {

        return;

    }


    shadow.position.x =
        human.position.x;


    shadow.position.z =
        human.position.z;


    shadow.scale.set(
        human.scale.x,
        human.scale.x,
        human.scale.x
    );


    shadow.visible =
        human.visible;

}


/* ============================================================
   MOVEMENT
============================================================ */

function updateMovement(
    delta
) {

    if (
        !state.walking
    ) {

        return;

    }


    const speed =
        12 * delta;


    let dx = 0;
    let dy = 0;


    if (
        state.keys["w"] ||
        state.keys["ArrowUp"]
    ) {

        dy -= speed;

    }


    if (
        state.keys["s"] ||
        state.keys["ArrowDown"]
    ) {

        dy += speed;

    }


    if (
        state.keys["a"] ||
        state.keys["ArrowLeft"]
    ) {

        dx -= speed;

    }


    if (
        state.keys["d"] ||
        state.keys["ArrowRight"]
    ) {

        dx += speed;

    }


    if (
        dx !== 0 ||
        dy !== 0
    ) {

        state.targetLocalPosition.x +=
            dx;


        state.targetLocalPosition.y +=
            dy;


        clampLocalTarget();

    }


    state.localPosition.x +=
        (
            state.targetLocalPosition.x -
            state.localPosition.x
        ) * 0.12;


    state.localPosition.y +=
        (
            state.targetLocalPosition.y -
            state.localPosition.y
        ) * 0.12;

}


/* ============================================================
   CLAMP POSITION
============================================================ */

function clampLocalTarget() {

    state.targetLocalPosition.x =
        Math.max(
            8,
            Math.min(
                92,
                state.targetLocalPosition.x
            )
        );


    state.targetLocalPosition.y =
        Math.max(
            12,
            Math.min(
                88,
                state.targetLocalPosition.y
            )
        );

}


/* ============================================================
   KEYBOARD
============================================================ */

function handleKeyDown(
    event
) {

    const key =
        event.key;


    if (
        [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            " "
        ].includes(key)
    ) {

        event.preventDefault();

    }


    state.keys[key] =
        true;

}


function handleKeyUp(
    event
) {

    state.keys[event.key] =
        false;

}


/* ============================================================
   CLICK TO WALK
============================================================ */

function handleWorldClick(
    event
) {

    if (
        !state.walking
    ) {

        return;

    }


    const rect =
        dom.rhCanvas.getBoundingClientRect();


    const x =
        (
            event.clientX -
            rect.left
        ) /
        rect.width *
        100;


    const y =
        (
            event.clientY -
            rect.top
        ) /
        rect.height *
        100;


    state.targetLocalPosition.x =
        Math.max(
            8,
            Math.min(
                92,
                x
            )
        );


    state.targetLocalPosition.y =
        Math.max(
            12,
            Math.min(
                88,
                y
            )
        );

}


/* ============================================================
   PRESENCE DATA CHANNEL
============================================================ */

function sendPresenceIfNeeded(
    timestamp
) {

    if (
        !state.dataChannel
    ) {

        return;

    }


    if (
        state.dataChannel.readyState !==
        "open"
    ) {

        return;

    }


    if (
        timestamp -
        state.lastPresenceSend <
        50
    ) {

        return;

    }


    state.lastPresenceSend =
        timestamp;


    const message = {

        type:
            "presence",

        position:
            state.localPosition,

        walking:
            state.walking

    };


    try {

        state.dataChannel.send(
            JSON.stringify(
                message
            )
        );

    }

    catch (error) {

        console.warn(
            "[RH] Presence send failed:",
            error
        );

    }

}


/* ============================================================
   HANDLE REMOTE PRESENCE
============================================================ */

function handleRemotePresence(
    message
) {

    if (
        !message.position
    ) {

        return;

    }


    state.targetRemotePosition = {

        x:
            Number(
                message.position.x
            ),

        y:
            Number(
                message.position.y
            )

    };

}


/* ============================================================
   WEB SOCKET SIGNALING
============================================================ */

function connectSignaling() {

    updateDebug(
        dom.debugSignal,
        "Connecting"
    );


    updateConnectionStatus(
        "waiting",
        "Connecting"
    );


    const url =
        `${RH_CONFIG.websocketServer}/${encodeURIComponent(state.roomId)}`;


    console.log(
        "[RH] Connecting to:",
        url
    );


    let opened =
        false;


    try {

        const socket =
            new WebSocket(
                url
            );


        state.websocket =
            socket;


        const timeout =
            setTimeout(
                () => {

                    if (!opened) {

                        console.warn(
                            "[RH] Signaling timeout."
                        );

                        enterOfflineDemoMode();

                    }

                },
                8000
            );


        socket.onopen =
            () => {

                opened =
                    true;

                clearTimeout(
                    timeout
                );


                updateDebug(
                    dom.debugSignal,
                    "Connected"
                );


                updateConnectionStatus(
                    "waiting",
                    "Waiting"
                );


                console.log(
                    "[RH] Signaling connected."
                );

            };


        socket.onmessage =
            event => {

                handleSignalMessage(
                    event.data
                );

            };


        socket.onerror =
            error => {

                console.error(
                    "[RH] WebSocket error:",
                    error
                );


                updateDebug(
                    dom.debugSignal,
                    "Error"
                );

            };


        socket.onclose =
            () => {

                console.log(
                    "[RH] Signaling closed."
                );


                updateDebug(
                    dom.debugSignal,
                    "Closed"
                );


                if (
                    !state.connected
                ) {

                    enterOfflineDemoMode();

                }

            };

    }

    catch (error) {

        console.error(
            "[RH] WebSocket creation failed:",
            error
        );


        updateDebug(
            dom.debugSignal,
            "Failed"
        );


        enterOfflineDemoMode();

    }

}


/* ============================================================
   SIGNAL MESSAGE HANDLER
============================================================ */

async function handleSignalMessage(
    rawData
) {

    let message;


    try {

        message =
            JSON.parse(
                rawData
            );

    }

    catch (error) {

        console.warn(
            "[RH] Invalid signaling message."
        );

        return;

    }


    console.log(
        "[RH] Signal:",
        message
    );


    switch (
        message.type
    ) {


        /* ----------------------------------------------------
           Connected
        ---------------------------------------------------- */

        case "connected":

            state.connectionId =
                message.connection_id;


            updateConnectionStatus(
                "waiting",
                "Waiting"
            );

            break;


        /* ----------------------------------------------------
           Peer joined
        ---------------------------------------------------- */

        case "peer_joined":

            state.remotePeerId =
                message.peer_id;


            console.log(
                "[RH] Peer joined. Becoming offerer."
            );


            /*
             * IMPORTANT:
             *
             * Set isOfferer BEFORE createPeerConnection().
             *
             * This fixes the earlier data-channel bug.
             */

            state.isOfferer =
                true;


            await createPeerConnection();


            await createOffer();


            break;


        /* ----------------------------------------------------
           Offer
        ---------------------------------------------------- */

        case "offer":

            state.remotePeerId =
                message.sender_id;


            state.isOfferer =
                false;


            await createPeerConnection();


            await state.peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    message.offer
                )
            );


            const answer =
                await state.peerConnection.createAnswer();


            await state.peerConnection.setLocalDescription(
                answer
            );


            sendSignal({

                type:
                    "answer",

                answer:
                    state.peerConnection.localDescription

            });


            break;


        /* ----------------------------------------------------
           Answer
        ---------------------------------------------------- */

        case "answer":

            if (
                !state.peerConnection
            ) {

                return;

            }


            await state.peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    message.answer
                )
            );

            break;


        /* ----------------------------------------------------
           ICE candidate
        ---------------------------------------------------- */

        case "ice":

            if (
                !state.peerConnection ||
                !message.candidate
            ) {

                return;

            }


            try {

                await state.peerConnection.addIceCandidate(
                    new RTCIceCandidate(
                        message.candidate
                    )
                );

            }

            catch (error) {

                console.warn(
                    "[RH] ICE candidate error:",
                    error
                );

            }

            break;


        /* ----------------------------------------------------
           Peer left
        ---------------------------------------------------- */

        case "peer_left":

            handlePeerLeft();

            break;


        /* ----------------------------------------------------
           Error
        ---------------------------------------------------- */

        case "error":

            console.error(
                "[RH] Server error:",
                message.message
            );


            showToast(
                message.message ||
                "RH signaling error."
            );


            break;

    }

}


/* ============================================================
   SEND SIGNAL
============================================================ */

function sendSignal(
    message
) {

    if (
        !state.websocket
    ) {

        return;

    }


    if (
        state.websocket.readyState !==
        WebSocket.OPEN
    ) {

        return;

    }


    try {

        state.websocket.send(
            JSON.stringify(
                message
            )
        );

    }

    catch (error) {

        console.error(
            "[RH] Signal send failed:",
            error
        );

    }

}


/* ============================================================
   CREATE WEBRTC PEER CONNECTION
============================================================ */

async function createPeerConnection() {

    if (
        state.peerConnection
    ) {

        return state.peerConnection;

    }


    console.log(
        "[RH] Creating RTCPeerConnection."
    );


    const pc =
        new RTCPeerConnection({

            iceServers:
                RH_CONFIG.iceServers

        });


    state.peerConnection =
        pc;


    /* --------------------------------------------------------
       Local tracks
    -------------------------------------------------------- */

    if (
        state.localStream
    ) {

        state.localStream
            .getTracks()
            .forEach(
                track => {

                    pc.addTrack(
                        track,
                        state.localStream
                    );

                }
            );

    }


    /* --------------------------------------------------------
       Remote track
    -------------------------------------------------------- */

    pc.ontrack =
        event => {

            console.log(
                "[RH] Remote track received."
            );


            if (
                !state.remoteStream
            ) {

                state.remoteStream =
                    new MediaStream();

            }


            const track =
                event.track;


            const alreadyAdded =
                state.remoteStream
                    .getTracks()
                    .some(
                        existing =>
                            existing.id ===
                            track.id
                    );


            if (
                !alreadyAdded
            ) {

                state.remoteStream.addTrack(
                    track
                );

            }


            dom.remoteVideo.srcObject =
                state.remoteStream;


            dom.remoteVideo.play()
                .catch(
                    () => {}
                );


            state.remoteVideoReady =
                true;


            dom.remotePresence.classList.remove(
                "hidden"
            );


            dom.waitingMessage.classList.add(
                "hidden"
            );


            updateConnectionStatus(
                "connected",
                "Together"
            );


            updateDebug(
                dom.debugWebrtc,
                "Connected"
            );


            initializeSpatialAudio();

        };


    /* --------------------------------------------------------
       ICE candidates
    -------------------------------------------------------- */

    pc.onicecandidate =
        event => {

            if (
                !event.candidate
            ) {

                return;

            }


            sendSignal({

                type:
                    "ice",

                candidate:
                    event.candidate

            });

        };


    /* --------------------------------------------------------
       Connection state
    -------------------------------------------------------- */

    pc.onconnectionstatechange =
        () => {

            const connectionState =
                pc.connectionState;


            console.log(
                "[RH] WebRTC state:",
                connectionState
            );


            updateDebug(
                dom.debugWebrtc,
                connectionState
            );


            if (
                connectionState ===
                "connected"
            ) {

                state.connected =
                    true;


                updateConnectionStatus(
                    "connected",
                    "Together"
                );


                dom.waitingMessage.classList.add(
                    "hidden"
                );

            }


            if (
                connectionState ===
                "failed"
            ) {

                updateConnectionStatus(
                    "error",
                    "Connection failed"
                );


                showToast(
                    "WebRTC could not establish the connection."
                );

            }


            if (
                connectionState ===
                "disconnected"
            ) {

                updateConnectionStatus(
                    "waiting",
                    "Reconnecting"
                );

            }

        };


    /* --------------------------------------------------------
       ICE connection state
    -------------------------------------------------------- */

    pc.oniceconnectionstatechange =
        () => {

            console.log(
                "[RH] ICE:",
                pc.iceConnectionState
            );

        };


    /* --------------------------------------------------------
       Data channel
    -------------------------------------------------------- */

    if (
        state.isOfferer
    ) {

        createDataChannel();

    }


    pc.ondatachannel =
        event => {

            console.log(
                "[RH] Remote data channel received."
            );


            state.dataChannel =
                event.channel;


            setupDataChannel(
                state.dataChannel
            );

        };


    return pc;

}


/* ============================================================
   CREATE DATA CHANNEL
============================================================ */

function createDataChannel() {

    if (
        !state.peerConnection
    ) {

        return;

    }


    if (
        state.dataChannel
    ) {

        return;

    }


    const channel =
        state.peerConnection.createDataChannel(
            "rh-presence",
            {

                ordered:
                    true

            }
        );


    state.dataChannel =
        channel;


    setupDataChannel(
        channel
    );

}


/* ============================================================
   SETUP DATA CHANNEL
============================================================ */

function setupDataChannel(
    channel
) {

    channel.onopen =
        () => {

            console.log(
                "[RH] Presence channel open."
            );

        };


    channel.onclose =
        () => {

            console.log(
                "[RH] Presence channel closed."
            );

        };


    channel.onerror =
        error => {

            console.warn(
                "[RH] Presence channel error:",
                error
            );

        };


    channel.onmessage =
        event => {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );


                if (
                    message.type ===
                    "presence"
                ) {

                    handleRemotePresence(
                        message
                    );

                }

            }

            catch (error) {

                console.warn(
                    "[RH] Invalid presence message."
                );

            }

        };

}


/* ============================================================
   CREATE OFFER
============================================================ */

async function createOffer() {

    if (
        !state.peerConnection
    ) {

        return;

    }


    console.log(
        "[RH] Creating offer."
    );


    const offer =
        await state.peerConnection.createOffer({

            offerToReceiveAudio:
                true,

            offerToReceiveVideo:
                true

        });


    await state.peerConnection.setLocalDescription(
        offer
    );


    sendSignal({

        type:
            "offer",

        offer:
            state.peerConnection.localDescription

    });

}


/* ============================================================
   SPATIAL AUDIO
============================================================ */

async function initializeAudio() {

    try {

        if (
            !state.audioContext
        ) {

            state.audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }


        if (
            state.audioContext.state ===
            "suspended"
        ) {

            await state.audioContext.resume();

        }

    }

    catch (error) {

        console.warn(
            "[RH] AudioContext unavailable:",
            error
        );

    }

}


/* ============================================================
   INITIALIZE SPATIAL AUDIO
============================================================ */

async function initializeSpatialAudio() {

    await initializeAudio();


    if (
        !state.audioContext ||
        !state.remoteStream
    ) {

        return;

    }


    if (
        state.remotePanner
    ) {

        return;

    }


    try {

        const source =
            state.audioContext.createMediaStreamSource(
                state.remoteStream
            );


        const gain =
            state.audioContext.createGain();


        gain.gain.value =
            1;


        const panner =
            state.audioContext.createPanner();


        panner.panningModel =
            "HRTF";


        panner.distanceModel =
            "inverse";


        panner.refDistance =
            1;


        panner.maxDistance =
            30;


        panner.rolloffFactor =
            1.2;


        source.connect(
            gain
        );


        gain.connect(
            panner
        );


        panner.connect(
            state.audioContext.destination
        );


        state.remoteGain =
            gain;


        state.remotePanner =
            panner;


        /*
         * Prevent the HTML video element from
         * playing duplicate audio.
         */

        dom.remoteVideo.muted =
            true;


        console.log(
            "[RH] Spatial audio initialized."
        );

    }

    catch (error) {

        console.warn(
            "[RH] Spatial audio failed:",
            error
        );

    }

}


/* ============================================================
   UPDATE SPATIAL AUDIO
============================================================ */

function updateSpatialAudio() {

    if (
        !state.remotePanner
    ) {

        return;

    }


    const local =
        screenToWorld(
            state.localPosition
        );


    const remote =
        screenToWorld(
            state.remotePosition
        );


    const dx =
        remote.x -
        local.x;


    const dz =
        remote.z -
        local.z;


    try {

        state.remotePanner.positionX.value =
            dx;

        state.remotePanner.positionY.value =
            0;

        state.remotePanner.positionZ.value =
            dz;

    }

    catch (error) {

        /* Browser compatibility fallback */

        if (
            state.remotePanner.setPosition
        ) {

            state.remotePanner.setPosition(
                dx,
                0,
                dz
            );

        }

    }

}


/* ============================================================
   KEYBOARD MOVEMENT
============================================================ */


/* ============================================================
   TOGGLE MICROPHONE
============================================================ */

function toggleMicrophone() {

    if (
        !state.localStream
    ) {

        return;

    }


    const audioTracks =
        state.localStream.getAudioTracks();


    if (
        audioTracks.length === 0
    ) {

        return;

    }


    state.microphoneEnabled =
        !state.microphoneEnabled;


    audioTracks.forEach(
        track => {

            track.enabled =
                state.microphoneEnabled;

        }
    );


    updateControls();


    showToast(
        state.microphoneEnabled
            ? "Microphone on"
            : "Microphone muted"
    );

}


/* ============================================================
   TOGGLE CAMERA
============================================================ */

function toggleCamera() {

    if (
        !state.localStream
    ) {

        return;

    }


    const videoTracks =
        state.localStream.getVideoTracks();


    if (
        videoTracks.length === 0
    ) {

        return;

    }


    state.cameraEnabled =
        !state.cameraEnabled;


    videoTracks.forEach(
        track => {

            track.enabled =
                state.cameraEnabled;

        }
    );


    updateControls();


    showToast(
        state.cameraEnabled
            ? "Camera on"
            : "Camera off"
    );

}


/* ============================================================
   WALKING
============================================================ */

function toggleWalking() {

    state.walking =
        !state.walking;


    updateControls();


    showToast(
        state.walking
            ? "Walking enabled"
            : "Walking paused"
    );

}


/* ============================================================
   MEET
============================================================ */

function moveCloserToPerson() {

    if (
        state.remoteStream
    ) {

        state.targetLocalPosition = {

            x:
                state.remotePosition.x -
                8,

            y:
                state.remotePosition.y

        };


        clampLocalTarget();


        showToast(
            "Walking closer..."
        );

    }

    else {

        showToast(
            "Waiting for your person."
        );

    }

}


/* ============================================================
   CONTROLS UI
============================================================ */

function updateControls() {

    if (
        state.microphoneEnabled
    ) {

        dom.muteBtn.innerHTML =
            "🎙️<span>Mute</span>";

    }

    else {

        dom.muteBtn.innerHTML =
            "🔇<span>Muted</span>";

    }


    if (
        state.cameraEnabled
    ) {

        dom.cameraBtn.innerHTML =
            "📷<span>Camera</span>";

    }

    else {

        dom.cameraBtn.innerHTML =
            "🚫<span>Camera Off</span>";

    }


    if (
        state.walking
    ) {

        dom.walkBtn.classList.add(
            "active"
        );

        dom.walkBtn.innerHTML =
            "🚶<span>Walking</span>";

    }

    else {

        dom.walkBtn.classList.remove(
            "active"
        );

        dom.walkBtn.innerHTML =
            "⏸️<span>Paused</span>";

    }

}


/* ============================================================
   CONNECTION STATUS
============================================================ */

function updateConnectionStatus(
    status,
    text
) {

    dom.connectionText.textContent =
        text;


    dom.connectionDot.className =
        "status-dot " +
        status;

}


/* ============================================================
   DEBUG
============================================================ */

function updateHttpsDebug() {

    const secure =
        window.isSecureContext ||
        location.hostname ===
        "localhost";


    updateDebug(
        dom.debugHttps,
        secure
            ? "OK"
            : "Required"
    );

}


function updateDebug(
    element,
    value
) {

    if (
        element
    ) {

        element.textContent =
            value;

    }

}


/* ============================================================
   PLACE THEME
============================================================ */

function updatePlaceUI() {

    const names = {

        park:
            "Quiet Park",

        temple:
            "Devotional Place",

        shopping:
            "Shopping Street",

        campus:
            "Campus"

    };


    dom.placeName.textContent =
        names[state.selectedPlace] ||
        "Shared Place";

}


/* ============================================================
   RESIZE
============================================================ */

function handleResize() {

    if (
        !state.three.camera ||
        !state.three.renderer
    ) {

        return;

    }


    state.three.camera.aspect =
        window.innerWidth /
        window.innerHeight;


    state.three.camera.updateProjectionMatrix();


    state.three.renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

}


/* ============================================================
   ROOM COPY
============================================================ */

async function copyRoom() {

    const text =
        `Join my RH room: ${state.roomId}`;


    try {

        await navigator.clipboard.writeText(
            text
        );


        showToast(
            "RH room copied."
        );

    }

    catch (error) {

        showToast(
            `Room: ${state.roomId}`
        );

    }

}


/* ============================================================
   EXIT
============================================================ */

function exitRH() {

    if (
        state.websocket
    ) {

        try {

            state.websocket.close();

        }

        catch (error) {}

    }


    if (
        state.peerConnection
    ) {

        try {

            state.peerConnection.close();

        }

        catch (error) {}

    }


    if (
        state.localStream
    ) {

        state.localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    state.websocket =
        null;

    state.peerConnection =
        null;

    state.dataChannel =
        null;

    state.remoteStream =
        null;

    state.localStream =
        null;

    state.connected =
        false;


    dom.localVideo.srcObject =
        null;

    dom.remoteVideo.srcObject =
        null;


    dom.remotePresence.classList.add(
        "hidden"
    );


    dom.waitingMessage.classList.remove(
        "hidden"
    );


    showScreen(
        "welcome"
    );


    updateConnectionStatus(
        "waiting",
        "Ready"
    );


    updateDebug(
        dom.debugCamera,
        "—"
    );


    updateDebug(
        dom.debugSignal,
        "—"
    );


    updateDebug(
        dom.debugWebrtc,
        "—"
    );

}


/* ============================================================
   PEER LEFT
============================================================ */

function handlePeerLeft() {

    console.log(
        "[RH] Peer left."
    );


    state.remoteStream =
        null;


    dom.remoteVideo.srcObject =
        null;


    dom.remotePresence.classList.add(
        "hidden"
    );


    dom.waitingMessage.classList.remove(
        "hidden"
    );


    updateConnectionStatus(
        "waiting",
        "Waiting"
    );


    updateDebug(
        dom.debugWebrtc,
        "Waiting"
    );


    if (
        state.remotePanner
    ) {

        try {

            state.remotePanner.disconnect();

        }

        catch (error) {}

    }


    state.remotePanner =
        null;


    state.remoteGain =
        null;


    if (
        state.peerConnection
    ) {

        try {

            state.peerConnection.close();

        }

        catch (error) {}

    }


    state.peerConnection =
        null;


    state.dataChannel =
        null;


    state.remotePeerId =
        null;


    state.isOfferer =
        false;


    showToast(
        "Your person left the RH room."
    );

}


/* ============================================================
   OFFLINE DEMO MODE
============================================================ */

function enterOfflineDemoMode() {

    console.log(
        "[RH] Entering offline demo mode."
    );


    updateDebug(
        dom.debugSignal,
        "Offline"
    );


    updateDebug(
        dom.debugWebrtc,
        "Demo"
    );


    updateConnectionStatus(
        "waiting",
        "Demo Mode"
    );


    dom.waitingMessage.innerHTML = `

        <div class="waiting-icon">
            ✨
        </div>

        <div>

            <strong>
                RH Demo Mode
            </strong>

            <span>
                Move around the shared environment.
            </span>

        </div>

    `;


    dom.waitingMessage.classList.add(
        "hidden"
    );


    /*
     * This keeps the visual experience interactive
     * even when the Colab signaling server is unavailable.
     *
     * It does NOT create a fake remote person.
     */

    showToast(
        "RH is running in visual demo mode."
    );

}


/* ============================================================
   TOAST
============================================================ */

let toastTimer =
    null;


function showToast(
    message
) {

    dom.toastText.textContent =
        message;


    dom.toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                dom.toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* ============================================================
   WORLD INITIALIZATION PATCH
============================================================ */

const originalPrepareWorld =
    prepareWorld;


/*
 * We wrap prepareWorld so the selected place
 * label is always updated.
 */

prepareWorld =
    function () {

        updatePlaceUI();

        originalPrepareWorld();

    };


/* ============================================================
   VISIBILITY HANDLING
============================================================ */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (
                state.audioContext &&
                state.audioContext.state ===
                "suspended"
            ) {

                try {

                    await state.audioContext.resume();

                }

                catch (error) {}

            }

        }

    }
);


/* ============================================================
   CAMERA TRACK ENDED
============================================================ */

function monitorLocalTracks() {

    if (
        !state.localStream
    ) {

        return;

    }


    state.localStream
        .getTracks()
        .forEach(
            track => {

                track.onended =
                    () => {

                        console.log(
                            "[RH] Track ended:",
                            track.kind
                        );

                    };

            }
        );

}


/* ============================================================
   PATCH CAMERA START
============================================================ */

const originalStartCamera =
    startCamera;


startCamera =
    async function () {

        await originalStartCamera();

        monitorLocalTracks();

    };


/* ============================================================
   START LOOP SAFETY
============================================================ */

setInterval(
    () => {

        if (
            state.remoteStream &&
            dom.remoteVideo.srcObject !==
            state.remoteStream
        ) {

            dom.remoteVideo.srcObject =
                state.remoteStream;

        }

    },
    1000
);


/* ============================================================
   RH READY
============================================================ */

console.log(
    "%c RH — REAL HUMAN PRESENCE ",
    "background:#b8a1ff;color:#080914;font-weight:900;padding:8px;"
);


console.log(
    "The place is virtual. The people are real."
);
