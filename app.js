/* ============================================================
   RH — REAL HUMAN PRESENCE
   APPLICATION ENGINE
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const RH_CONFIG = {

  /*
   * IMPORTANT:
   *
   * Replace this URL after deploying the FastAPI backend.
   *
   * Example:
   *
   * wss://rh-signaling.onrender.com/ws
   *
   */

  SIGNALING_URL:
    "wss://REPLACE-WITH-YOUR-RENDER-SERVICE.onrender.com/ws",


  ROOM_DEFAULT:
    "RH-DEMO",


  /*
   * STUN helps WebRTC discover network paths.
   *
   * TURN should be added later for production reliability.
   */

  ICE_SERVERS: [

    {
      urls:
        "stun:stun.l.google.com:19302"
    },

    {
      urls:
        "stun:stun1.l.google.com:19302"
    }

  ],


  DEV_DEBUG:
    true

};


/* ============================================================
   APPLICATION STATE
   ============================================================ */

const state = {

  roomId:
    RH_CONFIG.ROOM_DEFAULT,


  ws:
    null,

  wsReady:
    false,


  localStream:
    null,

  remoteStream:
    null,


  pc:
    null,


  dataChannel:
    null,


  connectionId:
    null,

  peerId:
    null,


  peerPresent:
    false,


  /*
   * The first participant becomes offerer.
   *
   * VERY IMPORTANT:
   *
   * state.offerer must be true BEFORE creating the
   * RTCPeerConnection because that determines whether
   * the presence DataChannel is created.
   */

  offerer:
    false,


  remoteDescriptionSet:
    false,


  pendingIce:
    [],


  reconnectTimer:
    null,

  reconnectAttempt:
    0,


  /* ==========================================================
     LOCAL / REMOTE POSITIONS
     ========================================================== */

  position: {

    x: 0,

    z: 0

  },


  remotePosition: {

    x: 2.2,

    z: -1.2

  },


  keys:
    new Set(),


  walking:
    true,


  muted:
    false,


  cameraOn:
    true,


  running:
    false,


  /* ==========================================================
     SEGMENTATION
     ========================================================== */

  segmentationReady:
    false,

  segmentation:
    null,

  segmentBusy:
    false,


  /* ==========================================================
     THREE.JS
     ========================================================== */

  scene:
    null,

  camera:
    null,

  renderer:
    null,

  clock:
    null,


  humanLocal:
    null,

  humanRemote:
    null,


  humanLocalTexture:
    null,

  humanRemoteTexture:
    null,


  /* ==========================================================
     AUDIO
     ========================================================== */

  audioContext:
    null,

  audioPanner:
    null,


  animation:
    0

};


/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = id =>
  document.getElementById(id);


const lobby =
  $("lobby");


const world =
  $("world");


const roomInput =
  $("roomInput");


const roomLabel =
  $("roomLabel");


const connectionState =
  $("connectionState");


const presenceTitle =
  $("presenceTitle");


const presenceText =
  $("presenceText");


const participantCount =
  $("participantCount");


const toast =
  $("toast");


/* ============================================================
   DEBUG
   ============================================================ */

function setDebug(id, value) {

  const element =
    $(id);

  if (element) {
    element.textContent =
      value;
  }

}


/* ============================================================
   TOAST
   ============================================================ */

function toastMsg(message) {

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastMsg.timer
  );

  toastMsg.timer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 2600);

}


/* ============================================================
   CONNECTION STATUS
   ============================================================ */

function setConnection(
  label,
  connected = false
) {

  connectionState.textContent =
    label;

  connectionState.classList.toggle(
    "connected",
    connected
  );

}


/* ============================================================
   ROOM NORMALIZATION
   ============================================================ */

function safeRoom(value) {

  return (

    value ||

    RH_CONFIG.ROOM_DEFAULT

  )
    .trim()
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    )
    .slice(
      0,
      32
    )
    .toUpperCase();

}


/* ============================================================
   HTTPS CHECK
   ============================================================ */

function updateSecureStatus() {

  const secure =
    window.isSecureContext ||
    location.hostname === "localhost";


  $("secureCheck").textContent =
    `● HTTPS ${secure ? "OK" : "REQUIRED"}`;


  setDebug(
    "debugHttps",
    secure ? "OK" : "FAIL"
  );


  return secure;

}


/* ============================================================
   START RH
   ============================================================ */

async function startRH() {

  if (state.running)
    return;


  state.running =
    true;


  state.roomId =
    safeRoom(
      roomInput.value
    );


  roomInput.value =
    state.roomId;


  roomLabel.textContent =
    state.roomId;


  lobby.classList.remove(
    "active"
  );


  world.classList.add(
    "active"
  );


  setConnection(
    "Starting…"
  );


  participantCount.textContent =
    "1 / 2";


  updateSecureStatus();


  /*
   * Start the environment.
   */

  initWorld();


  /*
   * CAMERA MUST START BEFORE
   * SIGNALING.
   */

  try {

    await startCamera();

  }

  catch (error) {

    state.running =
      false;

    console.error(
      error
    );

    toastMsg(
      error.message ||
      "Camera could not start."
    );

    setConnection(
      "Camera error"
    );

    return;

  }


  /*
   * Start segmentation after
   * the camera is actually available.
   */

  await initializeSegmentation();


  /*
   * Finally connect to cloud signaling.
   */

  connectSignal();

}


/* ============================================================
   CAMERA
   ============================================================ */

async function startCamera() {

  if (!updateSecureStatus()) {

    throw new Error(
      "RH needs HTTPS. Open the GitHub Pages URL instead of a local file."
    );

  }


  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    throw new Error(
      "This browser does not expose camera access."
    );

  }


  /*
   * Request real camera + real microphone.
   */

  state.localStream =
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


  const video =
    $("localVideo");


  video.srcObject =
    state.localStream;


  /*
   * Wait until browser has actual video metadata.
   */

  await new Promise(
    resolve => {

      if (
        video.readyState >= 2
      ) {

        resolve();

      }

      else {

        video.onloadedmetadata =
          () => resolve();

      }

    }
  );


  await video.play();


  const track =
    state.localStream
      .getVideoTracks()[0];


  const settings =
    track.getSettings();


  $("mediaCheck").textContent =
    "● Camera OK";


  setDebug(
    "debugCamera",
    `${settings.width || "?"}×${settings.height || "?"}`
  );


  /*
   * Canvas becomes the source texture
   * for the real human inside the world.
   */

  const canvas =
    $("localCanvas");


  canvas.width =
    settings.width ||
    1280;


  canvas.height =
    settings.height ||
    720;


  setDebug(
    "debugCanvas",
    "READY"
  );


  state.cameraOn =
    true;


  /*
   * Immediate fallback render.
   *
   * This is important.
   *
   * If MediaPipe fails, the user's camera
   * still renders instead of becoming blank.
   */

  renderLocalFallback();


  /*
   * Create the person mesh.
   */

  makeHumanMeshes();


  toastMsg(
    "Camera is live. You are the real person in RH."
  );

}


/* ============================================================
   FALLBACK CAMERA RENDER
   ============================================================ */

function renderLocalFallback() {

  const video =
    $("localVideo");


  const canvas =
    $("localCanvas");


  const ctx =
    canvas.getContext(
      "2d"
    );


  const loop = () => {

    if (!state.running)
      return;


    if (
      video.readyState >= 2
    ) {

      if (
        canvas.width !==
        video.videoWidth
      ) {

        canvas.width =
          video.videoWidth ||
          canvas.width;

      }


      if (
        canvas.height !==
        video.videoHeight
      ) {

        canvas.height =
          video.videoHeight ||
          canvas.height;

      }


      ctx.save();


      /*
       * Mirror selfie camera.
       */

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


      if (
        state.humanLocalTexture
      ) {

        state.humanLocalTexture
          .needsUpdate = true;

      }

    }


    requestAnimationFrame(
      loop
    );

  };


  requestAnimationFrame(
    loop
  );

}


/* ============================================================
   MEDIAPIPE SEGMENTATION
   ============================================================ */

async function initializeSegmentation() {

  /*
   * If CDN failed, RH still works with fallback camera.
   */

  if (
    typeof SelfieSegmentation ===
    "undefined"
  ) {

    setDebug(
      "debugSeg",
      "CDN unavailable"
    );

    return;

  }


  try {

    state.segmentation =
      new SelfieSegmentation({

        locateFile:
          file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`

      });


    state.segmentation.setOptions({

      modelSelection:
        1

    });


    state.segmentation.onResults(
      results => {

        const canvas =
          $("localCanvas");


        const ctx =
          canvas.getContext(
            "2d"
          );


        if (
          !results.image
        )
          return;


        canvas.width =
          results.image.width;


        canvas.height =
          results.image.height;


        /*
         * Mirror image + mask together.
         */

        ctx.save();


        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );


        ctx.translate(
          canvas.width,
          0
        );


        ctx.scale(
          -1,
          1
        );


        /*
         * Draw actual camera.
         */

        ctx.drawImage(
          results.image,
          0,
          0,
          canvas.width,
          canvas.height
        );


        /*
         * Keep only the human.
         */

        ctx.globalCompositeOperation =
          "destination-in";


        ctx.drawImage(
          results.segmentationMask,
          0,
          0,
          canvas.width,
          canvas.height
        );


        ctx.restore();


        ctx.globalCompositeOperation =
          "source-over";


        state.segmentationReady =
          true;


        setDebug(
          "debugSeg",
          "LIVE"
        );


        if (
          state.humanLocalTexture
        ) {

          state.humanLocalTexture
            .needsUpdate = true;

        }

      }
    );


    setDebug(
      "debugSeg",
      "READY"
    );


    segmentationLoop();

  }

  catch (error) {

    console.warn(
      "Segmentation unavailable",
      error
    );


    setDebug(
      "debugSeg",
      "FALLBACK"
    );

  }

}


/* ============================================================
   SEGMENTATION LOOP
   ============================================================ */

async function segmentationLoop() {

  if (
    !state.running ||
    !state.segmentation
  )
    return;


  const video =
    $("localVideo");


  if (
    !state.segmentBusy &&
    video.readyState >= 2
  ) {

    state.segmentBusy =
      true;


    try {

      await state.segmentation.send({

        image:
          video

      });

    }

    catch (error) {

      console.warn(
        "Segmentation frame error",
        error
      );

    }


    state.segmentBusy =
      false;

  }


  requestAnimationFrame(
    segmentationLoop
  );

}


/* ============================================================
   THREE.JS WORLD
   ============================================================ */

function initWorld() {

  if (state.renderer)
    return;


  state.scene =
    new THREE.Scene();


  state.scene.background =
    new THREE.Color(
      0x071016
    );


  state.scene.fog =
    new THREE.Fog(
      0x071016,
      10,
      38
    );


  /*
   * CAMERA
   */

  state.camera =
    new THREE.PerspectiveCamera(
      58,
      innerWidth / innerHeight,
      0.1,
      100
    );


  state.camera.position.set(
    0,
    5.2,
    8.5
  );


  state.camera.lookAt(
    0,
    0,
    0
  );


  /*
   * RENDERER
   */

  state.renderer =
    new THREE.WebGLRenderer({

      canvas:
        $("rhCanvas"),

      antialias:
        true,

      alpha:
        false

    });


  state.renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      2
    )
  );


  state.renderer.setSize(
    innerWidth,
    innerHeight
  );


  state.renderer.shadowMap.enabled =
    true;


  state.clock =
    new THREE.Clock();


  /* ==========================================================
     LIGHTING
     ========================================================== */

  const hemisphere =
    new THREE.HemisphereLight(
      0xdbe8ff,
      0x132018,
      2.1
    );


  state.scene.add(
    hemisphere
  );


  const sun =
    new THREE.DirectionalLight(
      0xfff2d2,
      2.7
    );


  sun.position.set(
    -7,
    12,
    6
  );


  sun.castShadow =
    true;


  state.scene.add(
    sun
  );


  /* ==========================================================
     GROUND
     ========================================================== */

  const ground =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        60,
        60
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x18241e,

        roughness:
          1

      })

    );


  ground.rotation.x =
    -Math.PI / 2;


  ground.receiveShadow =
    true;


  state.scene.add(
    ground
  );


  /* ==========================================================
     WALKING PATH
     ========================================================== */

  const path =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        5.2,
        55
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x4b4a46,

        roughness:
          1

      })

    );


  path.rotation.x =
    -Math.PI / 2;


  path.position.y =
    0.015;


  state.scene.add(
    path
  );


  /* ==========================================================
     TREES
     ========================================================== */

  for (
    let i = 0;
    i < 22;
    i++
  ) {

    const tree =
      new THREE.Group();


    const trunk =
      new THREE.Mesh(

        new THREE.CylinderGeometry(
          0.10,
          0.15,
          1.4,
          8
        ),

        new THREE.MeshStandardMaterial({

          color:
            0x5c3f2b

        })

      );


    trunk.position.y =
      0.7;


    const crown =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.62 +
          Math.random() * 0.35,
          10,
          10
        ),

        new THREE.MeshStandardMaterial({

          color:
            0x31583d,

          roughness:
            1

        })

      );


    crown.position.y =
      1.65;


    tree.add(
      trunk,
      crown
    );


    tree.position.set(

      (
        Math.random() < 0.5
          ? -1
          : 1
      ) *
      (
        4.1 +
        Math.random() * 3
      ),

      0,

      -18 +
      i * 2.1 +
      (
        Math.random() - 0.5
      )

    );


    state.scene.add(
      tree
    );

  }


  /* ==========================================================
     WATER
     ========================================================== */

  const water =
    new THREE.Mesh(

      new THREE.PlaneGeometry(
        14,
        60
      ),

      new THREE.MeshStandardMaterial({

        color:
          0x14333a,

        roughness:
          0.25,

        metalness:
          0.05

      })

    );


  water.rotation.x =
    -Math.PI / 2;


  water.position.set(
    -10,
    -0.01,
    -4
  );


  state.scene.add(
    water
  );


  makeHumanMeshes();


  window.addEventListener(
    "resize",
    resizeWorld
  );


  /*
   * Keyboard movement.
   */

  document.addEventListener(
    "keydown",
    event => {

      if (
        ["INPUT", "TEXTAREA"]
          .includes(
            document.activeElement?.tagName
          )
      )
        return;


      state.keys.add(
        event.key.toLowerCase()
      );


      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " "
        ].includes(
          event.key.toLowerCase()
        )
      ) {

        event.preventDefault();

      }

    }
  );


  document.addEventListener(
    "keyup",
    event => {

      state.keys.delete(
        event.key.toLowerCase()
      );

    }
  );


  $("rhCanvas")
    .addEventListener(
      "click",
      onWorldClick
    );


  animate();

}


/* ============================================================
   REAL PERSON MESHES
   ============================================================ */

function makeHumanMeshes() {

  if (
    !state.scene ||
    !state.localStream
  )
    return;


  /* ==========================================================
     LOCAL PERSON
     ========================================================== */

  if (
    !state.humanLocalTexture
  ) {

    const canvas =
      $("localCanvas");


    state.humanLocalTexture =
      new THREE.CanvasTexture(
        canvas
      );


    state.humanLocalTexture.colorSpace =
      THREE.SRGBColorSpace;

  }


  if (
    !state.humanLocal
  ) {

    const material =
      new THREE.MeshBasicMaterial({

        map:
          state.humanLocalTexture,

        transparent:
          true,

        side:
          THREE.DoubleSide,

        depthWrite:
          false

      });


    state.humanLocal =
      new THREE.Mesh(

        new THREE.PlaneGeometry(
          2.35,
          3.05
        ),

        material

      );


    state.humanLocal.position.set(
      0,
      1.53,
      0
    );


    state.scene.add(
      state.humanLocal
    );

  }


  /* ==========================================================
     REMOTE PERSON
     ========================================================== */

  if (
    !state.humanRemoteTexture
  ) {

    const canvas =
      $("remoteCanvas");


    state.humanRemoteTexture =
      new THREE.CanvasTexture(
        canvas
      );


    state.humanRemoteTexture.colorSpace =
      THREE.SRGBColorSpace;

  }


  if (
    !state.humanRemote
  ) {

    const material =
      new THREE.MeshBasicMaterial({

        map:
          state.humanRemoteTexture,

        transparent:
          true,

        side:
          THREE.DoubleSide,

        depthWrite:
          false

      });


    state.humanRemote =
      new THREE.Mesh(

        new THREE.PlaneGeometry(
          2.35,
          3.05
        ),

        material

      );


    state.humanRemote.position.set(

      state.remotePosition.x,

      1.53,

      state.remotePosition.z

    );


    /*
     * The remote human stays invisible
     * until WebRTC actually delivers video.
     */

    state.humanRemote.visible =
      false;


    state.scene.add(
      state.humanRemote
    );

  }

}


/* ============================================================
   REMOTE CAMERA
   ============================================================ */

function drawRemoteVideo() {

  const video =
    $("remoteVideo");


  const canvas =
    $("remoteCanvas");


  if (!video.videoWidth)
    return;


  if (
    canvas.width !==
    video.videoWidth
  ) {

    canvas.width =
      video.videoWidth;

  }


  if (
    canvas.height !==
    video.videoHeight
  ) {

    canvas.height =
      video.videoHeight;

  }


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


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );


  ctx.restore();


  if (
    state.humanRemoteTexture
  ) {

    state.humanRemoteTexture
      .needsUpdate = true;

  }

}


/* ============================================================
   ANIMATION
   ============================================================ */

function animate() {

  state.animation =
    requestAnimationFrame(
      animate
    );


  const dt =
    Math.min(
      state.clock.getDelta(),
      0.05
    );


  if (
    state.running &&
    state.walking
  ) {

    updateMovement(
      dt
    );

  }


  /* ==========================================================
     LOCAL PERSON
     ========================================================== */

  if (
    state.humanLocal
  ) {

    state.humanLocal.position.x =
      state.position.x;


    state.humanLocal.position.z =
      state.position.z;


    state.humanLocal.lookAt(

      state.camera.position.x,

      state.humanLocal.position.y,

      state.camera.position.z

    );

  }


  /* ==========================================================
     REMOTE PERSON
     ========================================================== */

  if (
    state.humanRemote
  ) {

    state.humanRemote.position.x +=

      (
        state.remotePosition.x -
        state.humanRemote.position.x
      ) *
      0.12;


    state.humanRemote.position.z +=

      (
        state.remotePosition.z -
        state.humanRemote.position.z
      ) *
      0.12;


    state.humanRemote.lookAt(

      state.camera.position.x,

      state.humanRemote.position.y,

      state.camera.position.z

    );

  }


  /* ==========================================================
     CAMERA FOLLOW
     ========================================================== */

  state.camera.position.x +=

    (
      state.position.x * 0.38 -
      state.camera.position.x
    ) *
    0.035;


  state.camera.position.z +=

    (
      state.position.z + 8.2 -
      state.camera.position.z
    ) *
    0.035;


  state.camera.lookAt(

    state.position.x,

    1.25,

    state.position.z - 4

  );


  state.renderer.render(
    state.scene,
    state.camera
  );

}


/* ============================================================
   MOVEMENT
   ============================================================ */

function updateMovement(dt) {

  let dx = 0;

  let dz = 0;


  if (
    state.keys.has("w") ||
    state.keys.has("arrowup")
  ) {

    dz -= 1;

  }


  if (
    state.keys.has("s") ||
    state.keys.has("arrowdown")
  ) {

    dz += 1;

  }


  if (
    state.keys.has("a") ||
    state.keys.has("arrowleft")
  ) {

    dx -= 1;

  }


  if (
    state.keys.has("d") ||
    state.keys.has("arrowright")
  ) {

    dx += 1;

  }


  if (
    dx === 0 &&
    dz === 0
  )
    return;


  const length =
    Math.hypot(
      dx,
      dz
    ) || 1;


  const speed =
    3.0;


  state.position.x +=

    (
      dx / length
    ) *
    speed *
    dt;


  state.position.z +=

    (
      dz / length
    ) *
    speed *
    dt;


  /*
   * Keep people on the path.
   */

  state.position.x =
    Math.max(
      -2,
      Math.min(
        2,
        state.position.x
      )
    );


  state.position.z =
    Math.max(
      -16,
      Math.min(
        8,
        state.position.z
      )
    );


  sendPresence();

}


/* ============================================================
   CLICK TO WALK
   ============================================================ */

function onWorldClick(event) {

  if (!state.running)
    return;


  const rect =
    $("rhCanvas")
      .getBoundingClientRect();


  const normalizedX =

    (
      event.clientX -
      rect.left
    ) /
    rect.width *
    2 -
    1;


  state.position.x +=
    normalizedX * 0.9;


  state.position.x =
    Math.max(
      -2,
      Math.min(
        2,
        state.position.x
      )
    );


  sendPresence();

}


/* ============================================================
   WEBRTC PRESENCE DATA
   ============================================================ */

function sendPresence() {

  if (
    state.dataChannel &&
    state.dataChannel.readyState ===
      "open"
  ) {

    state.dataChannel.send(

      JSON.stringify({

        type:
          "presence",

        x:
          state.position.x,

        z:
          state.position.z,

        ts:
          Date.now()

      })

    );

  }

}


/* ============================================================
   CLOUD SIGNALING
   ============================================================ */

function connectSignal() {

  const base =
    RH_CONFIG.SIGNALING_URL
      .replace(
        /\/$/,
        ""
      );


  /*
   * Prevent confusing WebSocket errors
   * before backend URL is configured.
   */

  if (
    base.includes(
      "REPLACE-WITH-YOUR"
    )
  ) {

    setConnection(
      "Backend URL needed"
    );


    setDebug(
      "debugSignal",
      "CONFIG"
    );


    toastMsg(
      "Deploy the backend, then paste its wss:// URL into app.js."
    );


    return;

  }


  clearTimeout(
    state.reconnectTimer
  );


  setConnection(
    "Connecting…"
  );


  setDebug(
    "debugSignal",
    "CONNECTING"
  );


  const url =
    `${base}/${encodeURIComponent(
      state.roomId
    )}`;


  console.log(
    "[RH] Connecting:",
    url
  );


  state.ws =
    new WebSocket(
      url
    );


  /* ==========================================================
     SIGNAL CONNECTED
     ========================================================== */

  state.ws.onopen =
    () => {

      state.wsReady =
        true;


      state.reconnectAttempt =
        0;


      setConnection(
        "Signal connected"
      );


      setDebug(
        "debugSignal",
        "CONNECTED"
      );


      $("signalCheck").textContent =
        "● Signal OK";


      sendSignal({

        type:
          "hello"

      });

    };


  /* ==========================================================
     SIGNAL MESSAGE
     ========================================================== */

  state.ws.onmessage =
    async event => {

      let message;


      try {

        message =
          JSON.parse(
            event.data
          );

      }

      catch {

        return;

      }


      await handleSignal(
        message
      );

    };


  /* ==========================================================
     SIGNAL ERROR
     ========================================================== */

  state.ws.onerror =
    () => {

      state.wsReady =
        false;


      setDebug(
        "debugSignal",
        "ERROR"
      );

    };


  /* ==========================================================
     SIGNAL CLOSED
     ========================================================== */

  state.ws.onclose =
    () => {

      state.wsReady =
        false;


      setDebug(
        "debugSignal",
        "CLOSED"
      );


      if (state.running) {

        setConnection(

          state.peerPresent

            ? "Reconnecting signal…"

            : "Waiting"

        );


        scheduleReconnect();

      }

    };

}


/* ============================================================
   SIGNAL RECONNECT
   ============================================================ */

function scheduleReconnect() {

  clearTimeout(
    state.reconnectTimer
  );


  const delay =
    Math.min(

      10000,

      1000 *
      Math.pow(
        2,
        state.reconnectAttempt
      )

    );


  state.reconnectAttempt++;


  state.reconnectTimer =
    setTimeout(

      connectSignal,

      delay

    );

}


/* ============================================================
   SEND SIGNAL
   ============================================================ */

function sendSignal(data) {

  if (
    state.ws &&
    state.ws.readyState ===
      WebSocket.OPEN
  ) {

    state.ws.send(
      JSON.stringify(data)
    );

  }

}


/* ============================================================
   SIGNAL MESSAGE HANDLER
   ============================================================ */

async function handleSignal(
  message
) {

  switch (
    message.type
  ) {


    /* ========================================================
       SERVER CONNECTED
       ======================================================== */

    case "connected":

      state.connectionId =
        message.connection_id;


      updateParticipantCount(
        message.participants || 1
      );


      break;


    /* ========================================================
       SECOND PERSON ARRIVED
       ======================================================== */

    case "peer_joined":

      state.peerPresent =
        true;


      state.peerId =
        message.peer_id;


      updateParticipantCount(
        2
      );


      presenceTitle.textContent =
        "Your person is here";


      presenceText.textContent =
        "You are sharing the same place now.";


      setConnection(
        "Connecting people…"
      );


      /*
       * CRITICAL FIX:
       *
       * Set offerer BEFORE creating
       * RTCPeerConnection.
       */

      state.offerer =
        true;


      await createPeerConnection();


      await createOffer();


      break;


    /* ========================================================
       RECEIVE OFFER
       ======================================================== */

    case "offer":

      state.peerId =
        message.sender_id;


      await createPeerConnection();


      await state.pc.setRemoteDescription({

        type:
          "offer",

        sdp:
          message.sdp

      });


      state.remoteDescriptionSet =
        true;


      await flushIce();


      const answer =
        await state.pc.createAnswer();


      await state.pc.setLocalDescription(
        answer
      );


      sendSignal({

        type:
          "answer",

        sdp:
          state.pc.localDescription.sdp

      });


      break;


    /* ========================================================
       RECEIVE ANSWER
       ======================================================== */

    case "answer":

      if (!state.pc)
        return;


      await state.pc.setRemoteDescription({

        type:
          "answer",

        sdp:
          message.sdp

      });


      state.remoteDescriptionSet =
        true;


      await flushIce();


      break;


    /* ========================================================
       ICE CANDIDATE
       ======================================================== */

    case "ice_candidate":

      if (!state.pc)
        return;


      if (
        state.remoteDescriptionSet
      ) {

        try {

          await state.pc.addIceCandidate(
            message.candidate
          );

        }

        catch (error) {

          console.warn(
            "ICE candidate error",
            error
          );

        }

      }

      else {

        state.pendingIce.push(
          message.candidate
        );

      }


      break;


    /* ========================================================
       PEER LEFT
       ======================================================== */

    case "peer_left":

      peerLeft();

      break;


    /* ========================================================
       SERVER ERROR
       ======================================================== */

    case "error":

      toastMsg(
        message.message ||
        "Signaling error."
      );

      break;

  }

}


/* ============================================================
   CREATE WEBRTC CONNECTION
   ============================================================ */

async function createPeerConnection() {

  if (state.pc)
    return state.pc;


  state.pc =
    new RTCPeerConnection({

      iceServers:
        RH_CONFIG.ICE_SERVERS

    });


  state.remoteDescriptionSet =
    false;


  state.pendingIce =
    [];


  /*
   * Add real camera + microphone.
   */

  state.localStream
    .getTracks()
    .forEach(track => {

      state.pc.addTrack(
        track,
        state.localStream
      );

    });


  /* ==========================================================
     ICE
     ========================================================== */

  state.pc.onicecandidate =
    event => {

      if (
        event.candidate
      ) {

        sendSignal({

          type:
            "ice_candidate",

          candidate:
            event.candidate

        });

      }

    };


  /* ==========================================================
     REMOTE REAL PERSON
     ========================================================== */

  state.pc.ontrack =
    event => {

      state.remoteStream =
        event.streams[0];


      $("remoteVideo").srcObject =
        state.remoteStream;


      $("remoteVideo")
        .play()
        .catch(() => {});


      /*
       * Now the real remote human exists.
       */

      if (
        state.humanRemote
      ) {

        state.humanRemote.visible =
          true;

      }


      $("remoteVideo")
        .addEventListener(

          "loadeddata",

          () => {

            drawRemoteVideo();


            if (
              state.remoteStream
            ) {

              setupSpatialAudio(
                state.remoteStream
              );

            }

          },

          {
            once:
              true
          }

        );


      setConnection(
        "Together",
        true
      );


      setDebug(
        "debugRtc",
        "CONNECTED"
      );


      presenceTitle.textContent =
        "Together";


      presenceText.textContent =
        "You are both live in the same virtual place.";

    };


  /* ==========================================================
     WEBRTC CONNECTION STATE
     ========================================================== */

  state.pc.onconnectionstatechange =
    () => {

      const status =
        state.pc.connectionState;


      setDebug(
        "debugRtc",
        status.toUpperCase()
      );


      if (
        status === "connected"
      ) {

        setConnection(
          "Together",
          true
        );

      }


      else if (
        status === "failed" ||
        status === "disconnected"
      ) {

        setConnection(
          "Connection interrupted"
        );

      }

    };


  /* ==========================================================
     REMOTE DATA CHANNEL
     ========================================================== */

  state.pc.ondatachannel =
    event => {

      state.dataChannel =
        event.channel;


      wireDataChannel();

    };


  /* ==========================================================
     OFFERER DATA CHANNEL
     ========================================================== */

  if (
    state.offerer
  ) {

    state.dataChannel =
      state.pc.createDataChannel(
        "presence"
      );


    wireDataChannel();

  }


  return state.pc;

}


/* ============================================================
   DATA CHANNEL
   ============================================================ */

function wireDataChannel() {

  if (!state.dataChannel)
    return;


  state.dataChannel.onopen =
    () => {

      sendPresence();


      setDebug(
        "debugRtc",
        "CONNECTED"
      );

    };


  state.dataChannel.onmessage =
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

          state.remotePosition.x =
            Number(
              message.x
            ) || 0;


          state.remotePosition.z =
            Number(
              message.z
            ) || 0;


          drawRemoteVideo();

        }

      }

      catch {

        /*
         * Ignore malformed presence data.
         */

      }

    };

}


/* ============================================================
   CREATE OFFER
   ============================================================ */

async function createOffer() {

  if (!state.pc)
    return;


  const offer =
    await state.pc.createOffer();


  await state.pc.setLocalDescription(
    offer
  );


  sendSignal({

    type:
      "offer",

    sdp:
      state.pc.localDescription.sdp

  });

}


/* ============================================================
   FLUSH QUEUED ICE
   ============================================================ */

async function flushIce() {

  for (
    const candidate
    of state.pendingIce
  ) {

    try {

      await state.pc.addIceCandidate(
        candidate
      );

    }

    catch (error) {

      console.warn(
        "Queued ICE error",
        error
      );

    }

  }


  state.pendingIce =
    [];

}


/* ============================================================
   PARTICIPANT COUNT
   ============================================================ */

function updateParticipantCount(
  count
) {

  participantCount.textContent =
    `${Math.min(
      count,
      2
    )} / 2`;

}


/* ============================================================
   PEER LEFT
   ============================================================ */

function peerLeft() {

  state.peerPresent =
    false;


  state.peerId =
    null;


  state.offerer =
    false;


  if (state.pc) {

    state.pc.close();

    state.pc =
      null;

  }


  state.dataChannel =
    null;


  state.remoteStream =
    null;


  $("remoteVideo").srcObject =
    null;


  if (
    state.humanRemote
  ) {

    state.humanRemote.visible =
      false;

  }


  setConnection(
    "Waiting"
  );


  setDebug(
    "debugRtc",
    "WAITING"
  );


  updateParticipantCount(
    1
  );


  presenceTitle.textContent =
    "Waiting for your person";


  presenceText.textContent =
    "Share the room name with someone you love.";

}


/* ============================================================
   SPATIAL AUDIO
   ============================================================ */

function setupSpatialAudio(
  stream
) {

  try {

    if (
      state.audioContext
    ) {

      state.audioContext
        .close()
        .catch(() => {});

    }


    state.audioContext =
      new AudioContext();


    const source =
      state.audioContext
        .createMediaStreamSource(
          stream
        );


    state.audioPanner =
      state.audioContext
        .createStereoPanner();


    source
      .connect(
        state.audioPanner
      )
      .connect(
        state.audioContext.destination
      );

  }

  catch (error) {

    console.warn(
      "Spatial audio unavailable",
      error
    );

  }

}


/* ============================================================
   MUTE
   ============================================================ */

function toggleMute() {

  if (!state.localStream)
    return;


  state.muted =
    !state.muted;


  state.localStream
    .getAudioTracks()
    .forEach(
      track => {

        track.enabled =
          !state.muted;

      }
    );


  $("muteBtn")
    .classList.toggle(
      "active",
      state.muted
    );


  $("muteBtn").innerHTML =

    state.muted

      ? "🔇 <span>Muted</span>"

      : "🎙️ <span>Mute</span>";

}


/* ============================================================
   CAMERA TOGGLE
   ============================================================ */

function toggleCamera() {

  if (!state.localStream)
    return;


  state.cameraOn =
    !state.cameraOn;


  state.localStream
    .getVideoTracks()
    .forEach(
      track => {

        track.enabled =
          state.cameraOn;

      }
    );


  $("cameraBtn")
    .classList.toggle(
      "active",
      !state.cameraOn
    );


  $("cameraBtn").innerHTML =

    state.cameraOn

      ? "📷 <span>Camera</span>"

      : "🚫 <span>Camera off</span>";


  if (
    state.humanLocal
  ) {

    state.humanLocal.visible =
      state.cameraOn;

  }

}


/* ============================================================
   MEET
   ============================================================ */

function meet() {

  state.position = {

    x:
      0,

    z:
      0

  };


  if (
    state.peerPresent
  ) {

    state.remotePosition = {

      x:
        1.2,

      z:
        -1.2

    };

  }


  sendPresence();

}


/* ============================================================
   SHARE ROOM
   ============================================================ */

async function shareRoom() {

  const link =

    `${location.origin}` +
    `${location.pathname}` +
    `?room=${encodeURIComponent(
      state.roomId
    )}`;


  try {

    await navigator.clipboard.writeText(
      link
    );


    toastMsg(
      "Room link copied."
    );

  }

  catch {

    prompt(
      "Copy this RH room link:",
      link
    );

  }

}


/* ============================================================
   EXIT
   ============================================================ */

function exitRH() {

  state.running =
    false;


  clearTimeout(
    state.reconnectTimer
  );


  if (state.ws) {

    state.ws.close();

  }


  if (state.pc) {

    state.pc.close();

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


  if (
    state.audioContext
  ) {

    state.audioContext
      .close()
      .catch(() => {});

  }


  state.ws =
    null;


  state.pc =
    null;


  state.localStream =
    null;


  state.remoteStream =
    null;


  world.classList.remove(
    "active"
  );


  lobby.classList.add(
    "active"
  );


  $("signalCheck").textContent =
    "● Signal —";


  $("mediaCheck").textContent =
    "● Camera —";


  setConnection(
    "Waiting"
  );

}


/* ============================================================
   RESIZE
   ============================================================ */

function resizeWorld() {

  if (
    !state.camera ||
    !state.renderer
  )
    return;


  state.camera.aspect =
    innerWidth /
    innerHeight;


  state.camera.updateProjectionMatrix();


  state.renderer.setSize(
    innerWidth,
    innerHeight
  );

}


/* ============================================================
   UI EVENTS
   ============================================================ */

$("startBtn")
  .addEventListener(
    "click",
    startRH
  );


roomInput
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        startRH();

      }

    }
  );


$("muteBtn")
  .addEventListener(
    "click",
    toggleMute
  );


$("cameraBtn")
  .addEventListener(
    "click",
    toggleCamera
  );


$("walkBtn")
  .addEventListener(
    "click",
    () => {

      state.walking =
        !state.walking;


      $("walkBtn")
        .classList.toggle(
          "active",
          state.walking
        );

    }
  );


$("meetBtn")
  .addEventListener(
    "click",
    meet
  );


$("shareBtn")
  .addEventListener(
    "click",
    shareRoom
  );


$("exitBtn")
  .addEventListener(
    "click",
    exitRH
  );


$("debugToggle")
  .addEventListener(
    "click",
    () => {

      $("debugPanel")
        .classList.toggle(
          "visible"
        );

    }
  );


/* ============================================================
   ROOM FROM URL
   ============================================================ */

const urlRoom =
  new URLSearchParams(
    location.search
  ).get(
    "room"
  );


if (urlRoom) {

  roomInput.value =
    safeRoom(
      urlRoom
    );

}


/* ============================================================
   INITIAL STATUS
   ============================================================ */

updateSecureStatus();
