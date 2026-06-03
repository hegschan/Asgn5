import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Pixar "Up" adventure scene ---
const UP = {
  skyTop: 0x7ec8e3,
  skyHorizon: 0xf5d9a8,
  grass: 0x4a7c3f,
  house: 0xd9c9a8,
  roof: 0x6b3e2e,
  balloon: [0xe63946, 0x457b9d, 0xf4d35e, 0xc1121f, 0x1d3557, 0xff6b6b],
  tepui: 0x6b5b4a,
  birdBody: 0x1a2d5a,
  birdFeather: 0x243b6e,
  birdTip: 0x5b2d6e,
  beak: 0xf4c430,
  cloud: 0xffffff,
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc8d8e8, 40, 118);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  400
);
camera.position.set(22, 16, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 8, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 8;
controls.maxDistance = 85;

const textureLoader = new THREE.TextureLoader();

function loadColorTexture(path, options = {}) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  return texture;
}

const woodTexture = loadColorTexture('textures/hardwood.jpg', { repeat: [2, 2] });
const rockTexture = loadColorTexture('textures/uv_grid.jpg', { repeat: [3, 3] });

// Seamless photographic sky (equirect — no cubemap edge lines)
const skyEquirect = loadColorTexture('textures/skybox/sky_equirect.jpg');
skyEquirect.mapping = THREE.EquirectangularReflectionMapping;
scene.background = skyEquirect;

// Cubemap faces (same source) — satisfies assignment skybox / 6-face requirement
new THREE.CubeTextureLoader().load([
  'textures/skybox/posx.jpg',
  'textures/skybox/negx.jpg',
  'textures/skybox/posy.jpg',
  'textures/skybox/negy.jpg',
  'textures/skybox/posz.jpg',
  'textures/skybox/negz.jpg',
]);

// Five light types (assignment: more than three)
const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.32);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x9fd4ff, UP.grass, 0.52);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.35);
sunLight.position.set(14, 28, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 2;
sunLight.shadow.camera.far = 100;
const shadowCam = 40;
sunLight.shadow.camera.left = -shadowCam;
sunLight.shadow.camera.right = shadowCam;
sunLight.shadow.camera.top = shadowCam;
sunLight.shadow.camera.bottom = -shadowCam;
scene.add(sunLight);

const porchLight = new THREE.PointLight(0xffcc88, 28, 14, 2);
porchLight.position.set(1.2, 6.5, 1.5);
scene.add(porchLight);

const fallsSpot = new THREE.SpotLight(0xa8d8ff, 90, 45, Math.PI / 6, 0.4, 1);
fallsSpot.position.set(-18, 22, -8);
fallsSpot.target.position.set(-14, 4, -12);
scene.add(fallsSpot);
scene.add(fallsSpot.target);

const animated = [];
const primaryShapes = [];

function track(mesh) {
  primaryShapes.push(mesh);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addToScene(mesh, animateFn) {
  track(mesh);
  scene.add(mesh);
  if (animateFn) animated.push({ mesh, animateFn });
  return mesh;
}

// Ground — suburban lawn before the wild
const lawn = addToScene(
  new THREE.Mesh(
    new THREE.CircleGeometry(42, 64),
    new THREE.MeshStandardMaterial({ color: UP.grass, roughness: 0.92 })
  )
);
lawn.rotation.x = -Math.PI / 2;
lawn.receiveShadow = true;

// Paradise Falls tepui (textured cliff)
const tepui = addToScene(
  new THREE.Mesh(
    new THREE.BoxGeometry(10, 14, 6),
    new THREE.MeshStandardMaterial({ map: rockTexture, roughness: 0.88, metalness: 0.05 })
  )
);
tepui.position.set(-16, 7, -14);
tepui.rotation.y = 0.35;

const waterfall = addToScene(
  new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 9),
    new THREE.MeshStandardMaterial({
      color: 0x7ec8e3,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  )
);
waterfall.position.set(-14.2, 6, -11.2);
waterfall.rotation.y = 0.35;

animated.push({
  mesh: waterfall,
  animateFn: (time) => {
    waterfall.material.opacity = 0.55 + Math.sin(time * 0.004) * 0.12;
  },
});

// Floating house (Carl's home)
const house = new THREE.Group();
scene.add(house);

const houseBody = track(
  new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.8, 3.4),
    new THREE.MeshStandardMaterial({ map: woodTexture, color: UP.house, roughness: 0.75 })
  )
);
houseBody.position.y = 1.4;
house.add(houseBody);

const roof = track(
  new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 1.6, 4),
    new THREE.MeshStandardMaterial({ color: UP.roof, roughness: 0.8 })
  )
);
roof.position.y = 3.2;
roof.rotation.y = Math.PI / 4;
house.add(roof);

const chimney = track(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.28, 1.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85 })
  )
);
chimney.position.set(1.4, 3.5, -0.8);
house.add(chimney);

const porch = track(
  new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xb8956a })
  )
);
porch.position.set(0, 0.2, 2.1);
house.add(porch);

// Mailbox & garden gnomes (Ellie's neighborhood details)
const mailboxPost = addToScene(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  )
);
mailboxPost.position.set(7, 0.55, 6);

const mailbox = addToScene(
  new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x2d6a4f })
  )
);
mailbox.position.set(7, 1.15, 6);

for (let g = 0; g < 3; g++) {
  const gnomeHat = addToScene(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0xe63946 })
    )
  );
  gnomeHat.position.set(5.5 + g * 0.9, 0.35, 8.5);
  const gnomeBody = addToScene(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf1faee })
    )
  );
  gnomeBody.position.set(5.5 + g * 0.9, 0.18, 8.5);
}

// Balloons lifting the house
const balloonGroup = new THREE.Group();
house.add(balloonGroup);
const balloonMeshes = [];

for (let i = 0; i < 22; i++) {
  const color = UP.balloon[i % UP.balloon.length];
  const balloon = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.28 + (i % 3) * 0.06, 14, 14),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.05,
        emissive: color,
        emissiveIntensity: 0.08,
      })
    )
  );
  const angle = (i / 22) * Math.PI * 2;
  const radius = 1.2 + (i % 4) * 0.25;
  balloon.position.set(
    Math.cos(angle) * radius,
    4.2 + (i % 5) * 0.35,
    Math.sin(angle) * radius
  );
  balloon.userData.phase = i * 0.7;
  balloonMeshes.push(balloon);
  balloonGroup.add(balloon);

  const string = track(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    )
  );
  string.position.copy(balloon.position);
  string.position.y -= 0.9;
  balloonGroup.add(string);
}

house.position.set(2, 7.5, 0);

animated.push({
  mesh: house,
  animateFn: (time) => {
    house.position.y = 7.5 + Math.sin(time * 0.0012) * 0.35;
    house.rotation.y = Math.sin(time * 0.0004) * 0.04;
    balloonMeshes.forEach((b) => {
      b.position.y = 4.2 + (b.userData.phase % 5) * 0.35 + Math.sin(time * 0.002 + b.userData.phase) * 0.15;
    });
  },
});

// Jungle trees & rocks around the tepui
for (let t = 0; t < 8; t++) {
  const angle = (t / 8) * Math.PI * 1.4 - 0.5;
  const dist = 12 + (t % 3) * 2;
  const x = Math.cos(angle) * dist - 8;
  const z = Math.sin(angle) * dist - 6;

  const trunk = addToScene(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    )
  );
  trunk.position.set(x, 1.1, z);

  const leaves = addToScene(
    new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.4, 10),
      new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.8 })
    )
  );
  leaves.position.set(x, 2.8, z);
}

for (let r = 0; r < 6; r++) {
  const rock = addToScene(
    new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5 + (r % 3) * 0.15, 0),
      new THREE.MeshStandardMaterial({ map: rockTexture, color: UP.tepui, roughness: 0.95 })
    )
  );
  rock.position.set(-10 + r * 1.8, 0.4 + (r % 2) * 0.2, -8 - r * 0.6);
  rock.rotation.set(r, r * 0.5, 0);
}

// Fluffy clouds
const clouds = [];
for (let c = 0; c < 10; c++) {
  const cloud = new THREE.Group();
  const puffCount = 3 + (c % 3);
  for (let p = 0; p < puffCount; p++) {
    const puff = track(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.9 + p * 0.25, 12, 12),
        new THREE.MeshStandardMaterial({
          color: UP.cloud,
          roughness: 1,
          transparent: true,
          opacity: 0.92,
        })
      )
    );
    puff.position.set(p * 1.1 - 1, (p % 2) * 0.2, (p % 3) * 0.3);
    cloud.add(puff);
  }
  cloud.position.set(-20 + c * 4.5, 16 + (c % 4) * 2, -15 + (c % 5) * 3);
  scene.add(cloud);
  clouds.push(cloud);
}

animated.push({
  mesh: clouds[0],
  animateFn: (time) => {
    clouds.forEach((cloud, i) => {
      cloud.position.x += 0.008;
      cloud.position.y = 16 + (i % 4) * 2 + Math.sin(time * 0.0008 + i) * 0.4;
      if (cloud.position.x > 28) cloud.position.x = -28;
    });
  },
});

// --- Wow: feathered tropical bird (Kevin-inspired) with articulated wings ---
function createFeather(length, width, color, tipColor, tipRatio = 0.35) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(width, length, width * 0.5),
    new THREE.MeshStandardMaterial({ color, roughness: 0.65 })
  );
  shaft.position.y = -length / 2;
  group.add(shaft);
  track(shaft);

  const tipLen = length * tipRatio;
  const tip = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.85, tipLen, width * 0.45),
    new THREE.MeshStandardMaterial({ color: tipColor, roughness: 0.55 })
  );
  tip.position.y = -length + tipLen / 2;
  group.add(tip);
  track(tip);

  group.userData.featherParts = { shaft, tip };
  return group;
}

function createWing(side) {
  const wing = new THREE.Group();
  const feathers = [];
  const featherCount = 6;
  const matBody = UP.birdFeather;
  const matTip = UP.birdTip;

  for (let i = 0; i < featherCount; i++) {
    const len = 0.55 + i * 0.14;
    const feather = createFeather(len, 0.06 - i * 0.004, matBody, matTip, 0.38);
    feather.position.set(side * (0.12 + i * 0.07), -0.05 - i * 0.04, -0.08 + i * 0.03);
    feather.rotation.z = side * (0.35 + i * 0.12);
    feather.userData.index = i;
    feather.userData.side = side;
    wing.add(feather);
    feathers.push(feather);
  }

  const cover = track(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.5, 0.12),
      new THREE.MeshStandardMaterial({ color: UP.birdBody, roughness: 0.5 })
    )
  );
  cover.position.set(side * 0.15, 0.05, 0);
  wing.add(cover);

  wing.userData.feathers = feathers;
  return wing;
}

function createBird() {
  const bird = new THREE.Group();

  const body = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 20, 20),
      new THREE.MeshStandardMaterial({ color: UP.birdBody, roughness: 0.45 })
    )
  );
  body.scale.set(1, 1.25, 0.95);
  bird.add(body);

  const chest = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshStandardMaterial({ color: UP.birdFeather, roughness: 0.5 })
    )
  );
  chest.position.set(0, -0.05, 0.28);
  chest.scale.set(0.9, 1, 0.7);
  bird.add(chest);

  const head = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: UP.birdBody, roughness: 0.4 })
    )
  );
  head.position.set(0, 0.55, 0.35);
  bird.add(head);

  const beak = track(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: UP.beak, roughness: 0.35 })
    )
  );
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.52, 0.72);
  bird.add(beak);

  const eyeL = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    )
  );
  eyeL.position.set(-0.12, 0.62, 0.58);
  bird.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  bird.add(eyeR);
  track(eyeR);

  const leftWing = createWing(-1);
  leftWing.position.set(-0.35, 0.1, -0.05);
  bird.add(leftWing);

  const rightWing = createWing(1);
  rightWing.position.set(0.35, 0.1, -0.05);
  bird.add(rightWing);

  const tail = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const tailFeather = createFeather(0.45 + i * 0.08, 0.05, UP.birdFeather, UP.birdTip, 0.45);
    tailFeather.rotation.x = 0.25 + i * 0.08;
    tailFeather.position.set((i - 2) * 0.1, -0.35 - i * 0.05, -0.45);
    tail.add(tailFeather);
  }
  bird.add(tail);

  const legL = track(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.35, 6),
      new THREE.MeshStandardMaterial({ color: UP.beak })
    )
  );
  legL.position.set(-0.18, -0.65, 0.1);
  bird.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.18;
  bird.add(legR);
  track(legR);

  bird.userData.leftWing = leftWing;
  bird.userData.rightWing = rightWing;
  bird.userData.tail = tail;
  bird.userData.flightAngle = 0;

  return bird;
}

const tropicalBird = createBird();
scene.add(tropicalBird);
tropicalBird.position.set(-4, 11, 4);

animated.push({
  mesh: tropicalBird,
  animateFn: (time) => {
    const t = time * 0.001;
    const flightAngle = t * 0.45;
    const radius = 11;
    tropicalBird.position.x = Math.cos(flightAngle) * radius;
    tropicalBird.position.z = Math.sin(flightAngle) * radius;
    tropicalBird.position.y = 11 + Math.sin(t * 2.2) * 1.2;
    tropicalBird.rotation.y = -flightAngle + Math.PI / 2;

    const flap = Math.sin(t * 8) * 0.55;
    const glide = Math.max(0, Math.cos(t * 8)) * 0.15;

    [tropicalBird.userData.leftWing, tropicalBird.userData.rightWing].forEach((wing, wi) => {
      const side = wi === 0 ? -1 : 1;
      wing.rotation.z = side * (0.25 + flap * 0.9);
      wing.rotation.y = side * glide;

      wing.userData.feathers.forEach((feather, i) => {
        const lag = i * 0.18;
        feather.rotation.z =
          side * (0.35 + i * 0.12) + side * Math.sin(t * 8 - lag) * (0.25 + i * 0.06);
        feather.rotation.x = Math.sin(t * 8 - lag * 1.5) * 0.08;
        const tip = feather.userData.featherParts?.tip;
        if (tip) {
          tip.rotation.z = side * Math.sin(t * 8 - lag * 2) * 0.12;
        }
      });
    });

    tropicalBird.userData.tail.children.forEach((feather, i) => {
      feather.rotation.x = 0.25 + i * 0.08 + Math.sin(t * 6 + i * 0.4) * 0.1;
    });
  },
});

// Custom textured GLB — wilderness critter near the falls
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  'models/Duck.glb',
  (gltf) => {
    const critter = gltf.scene;
    critter.scale.set(0.012, 0.012, 0.012);
    critter.position.set(-12, 1.2, -10);
    critter.rotation.y = Math.PI * 0.6;
    critter.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(critter);
    animated.push({
      mesh: critter,
      animateFn: (time) => {
        critter.position.x = -12 + Math.sin(time * 0.001) * 0.5;
        critter.rotation.y = Math.PI * 0.6 + Math.sin(time * 0.0018) * 0.2;
      },
    });
  },
  undefined,
  (err) => console.error('Duck.glb load failed:', err)
);

// Extra primary shapes: scouting rocks & berries
for (let i = 0; i < 5; i++) {
  addToScene(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.6 })
    ),
    null
  ).position.set(9 + i * 0.35, 0.15, -4 + (i % 2) * 0.4);
}

console.log(`Primary shapes in scene: ${primaryShapes.length}`);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(time) {
  animated.forEach(({ animateFn }) => animateFn(time));
  porchLight.intensity = 24 + Math.sin(time * 0.002) * 6;
  fallsSpot.intensity = 80 + Math.sin(time * 0.0015) * 15;
  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
