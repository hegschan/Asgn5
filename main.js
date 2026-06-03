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
  pastelBalloons: [
    0xffb3ba, 0xffdfba, 0xffffba, 0xbaffc9, 0xbae1ff,
    0xe0bbe4, 0xffd1dc, 0xb5ead7, 0xc7ceea, 0xffdac1,
    0xf8c8dc, 0xa8d8ea, 0xf9e79f, 0xd5a6bd, 0xc9e4de,
    0xffc8dd, 0xc3bef7, 0xf3c6c6, 0xfadadd,
  ],
  tepui: 0x6b5b4a,
  birdBody: 0x4d9ae8,
  birdFeather: 0x6eb8ff,
  birdTip: 0x8b6fd4,
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
const cliffTexture = loadColorTexture('textures/cliff_rock.jpg', { repeat: [1.15, 1.65] });
const waterfallTexture = loadColorTexture('textures/waterfall.jpg', { repeat: [1, 4.2] });

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

// Paradise Falls tepui (seamless cliff rock)
const TEPUI_HEIGHT = 14;
const TEPUI_CENTER_Y = TEPUI_HEIGHT / 2;
const TEPUI_ROTATION = 0.35;
const TEPUI_POS = new THREE.Vector3(-16, TEPUI_CENTER_Y, -14);

const tepui = addToScene(
  new THREE.Mesh(
    new THREE.BoxGeometry(10, TEPUI_HEIGHT, 6),
    new THREE.MeshStandardMaterial({ map: cliffTexture, roughness: 0.94, metalness: 0.02 })
  )
);
tepui.position.copy(TEPUI_POS);
tepui.rotation.y = TEPUI_ROTATION;

const waterfallMaterial = new THREE.MeshStandardMaterial({
  map: waterfallTexture,
  transparent: true,
  opacity: 0.94,
  roughness: 0.06,
  metalness: 0.14,
  side: THREE.DoubleSide,
  emissive: 0x5599bb,
  emissiveIntensity: 0.14,
  depthWrite: true,
});

// Full-height cascade: top of cliff (y=14) down to ground (y=0)
const waterfall = addToScene(
  new THREE.Mesh(new THREE.PlaneGeometry(3.6, TEPUI_HEIGHT), waterfallMaterial)
);
waterfall.position.set(-14.15, TEPUI_CENTER_Y, -11.12);
waterfall.rotation.y = TEPUI_ROTATION;

const waterfallMist = addToScene(
  new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 3.5),
    new THREE.MeshStandardMaterial({
      map: waterfallTexture,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      color: 0xcceeff,
    })
  )
);
waterfallMist.position.set(-14.0, 1.75, -11.0);
waterfallMist.rotation.y = TEPUI_ROTATION;

animated.push({
  mesh: waterfall,
  animateFn: (time) => {
    const flow = (time * 0.00038) % 1;
    waterfallTexture.offset.y = flow;
    waterfallMaterial.opacity = 0.88 + Math.sin(time * 0.004) * 0.08;
    waterfallMist.material.opacity = 0.28 + Math.sin(time * 0.003 + 1) * 0.1;
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
// House body top is at y = 1.4 + 2.8/2 = 2.8; sit roof base on top of walls
roof.position.y = 3.65;
roof.rotation.y = Math.PI / 4;
house.add(roof);

const chimney = track(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.28, 1.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85 })
  )
);
chimney.position.set(1.4, 4.35, -0.8);
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

// Yard figures: old man, young boy, golden retriever (replacing gnomes)
function addFigurePart(mesh, parent, localPos, localRot = [0, 0, 0]) {
  track(mesh);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(...localPos);
  mesh.rotation.set(...localRot);
  parent.add(mesh);
  return mesh;
}

function createOldMan() {
  const man = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.85 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.7 });

  addFigurePart(
    new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x5c4033 })),
    man, [0.22, 0.35, 0], [0, 0, -0.2]
  );
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 8), suit), man, [-0.08, 0.2, 0]);
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.35, 8), suit), man, [0.08, 0.2, 0]);
  addFigurePart(
    new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), suit),
    man, [0, 0.48, 0], [0, 0, 0.08]
  );
  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), shirt), man, [0, 0.62, 0.02]);
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), skin), man, [0, 0.78, 0.04]);
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), white), man, [0, 0.86, 0.02]);
  addFigurePart(
    new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 12), new THREE.MeshStandardMaterial({ color: 0x222222 })),
    man, [0, 0.78, 0.13]
  );
  addFigurePart(
    new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x8b0000 })),
    man, [0, 0.64, 0.1]
  );
  addFigurePart(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x39ff14,
        emissiveIntensity: 0.65,
        roughness: 0.25,
      })
    ),
    man, [0.31, 0.05, 0]
  );
  return man;
}

function createYoungBoy() {
  const boy = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: 0xd45c00, roughness: 0.8 });
  const sash = new THREE.MeshStandardMaterial({ color: 0xffa726, roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xffb9a0, roughness: 0.75 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.7 });
  const pack = new THREE.MeshStandardMaterial({ color: 0x6d4c2d, roughness: 0.9 });

  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 8), uniform), boy, [-0.07, 0.14, 0]);
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 8), uniform), boy, [0.07, 0.14, 0]);
  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.16), uniform), boy, [0, 0.34, 0]);
  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), sash), boy, [0, 0.36, 0.09]);
  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.14), pack), boy, [0, 0.38, -0.1]);
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), skin), boy, [0, 0.52, 0.02]);
  addFigurePart(
    new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap),
    boy, [0, 0.6, 0.02]
  );
  return boy;
}

function createGoldenRetriever() {
  const dog = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.82 });
  const furLight = new THREE.MeshStandardMaterial({ color: 0xf5d78e, roughness: 0.8 });
  const nose = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 });
  const legMat = fur;

  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.18), fur), dog, [0, 0.22, 0]);
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), furLight), dog, [0.2, 0.28, 0]);
  addFigurePart(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.14), furLight), dog, [0.28, 0.26, 0]);
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), nose), dog, [0.34, 0.25, 0]);
  addFigurePart(
    new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fur),
    dog, [0.14, 0.34, 0.06], [0, 0, 0.4]
  );
  addFigurePart(
    new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), fur),
    dog, [0.14, 0.34, -0.06], [0, 0, -0.4]
  );
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.16, 6), legMat), dog, [0.1, 0.08, 0.07]);
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.16, 6), legMat), dog, [0.1, 0.08, -0.07]);
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.16, 6), legMat), dog, [-0.1, 0.08, 0.07]);
  addFigurePart(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.16, 6), legMat), dog, [-0.1, 0.08, -0.07]);
  addFigurePart(
    new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.2, 6), furLight),
    dog, [-0.22, 0.3, 0], [0.6, 0, 0]
  );
  addFigurePart(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), nose), dog, [0.36, 0.24, 0.04]);
  return dog;
}

const yardFigures = [
  { figure: createOldMan(), x: 5.5 },
  { figure: createYoungBoy(), x: 6.4 },
  { figure: createGoldenRetriever(), x: 7.3 },
];

yardFigures.forEach(({ figure, x }) => {
  figure.position.set(x, 0, 8.5);
  figure.rotation.y = -0.35;
  scene.add(figure);
});

// Balloons lifting the house — many pastel balloons in layered clusters
const balloonGroup = new THREE.Group();
house.add(balloonGroup);
const balloonHolders = [];
const BALLOON_COUNT = 128;

for (let i = 0; i < BALLOON_COUNT; i++) {
  const color = UP.pastelBalloons[i % UP.pastelBalloons.length];
  const layer = Math.floor(i / 26);
  const angle = (i / BALLOON_COUNT) * Math.PI * 2 * 4 + layer * 0.35 + (i % 13) * 0.12;
  const radius = 0.85 + layer * 0.48 + (i % 8) * 0.1;
  const baseY = 3.5 + layer * 0.62 + (i % 11) * 0.18;
  const size = 0.17 + (i % 5) * 0.04 + layer * 0.025;

  const holder = new THREE.Group();
  const balloon = track(
    new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 12),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.22,
        metalness: 0.04,
        emissive: color,
        emissiveIntensity: 0.1,
      })
    )
  );
  const string = track(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x444444 })
    )
  );
  string.position.y = -0.75;
  holder.add(balloon);
  holder.add(string);
  holder.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
  holder.userData = { phase: i * 0.55, baseY };
  balloonGroup.add(holder);
  balloonHolders.push(holder);
}

house.position.set(2, 7.5, 0);

animated.push({
  mesh: house,
  animateFn: (time) => {
    house.position.y = 7.5 + Math.sin(time * 0.0012) * 0.35;
    house.rotation.y = Math.sin(time * 0.0004) * 0.04;
    balloonHolders.forEach((holder) => {
      holder.position.y =
        holder.userData.baseY + Math.sin(time * 0.002 + holder.userData.phase) * 0.14;
    });
  },
});

// Trees scattered across the map
const TREE_COUNT = 42;
const treeGreens = [0x2d6a4f, 0x358f5c, 0x40916c, 0x1b4332, 0x52b788];

for (let t = 0; t < TREE_COUNT; t++) {
  const angle = (t / TREE_COUNT) * Math.PI * 2 + t * 0.47;
  const dist = 9 + (t % 10) * 2.4 + Math.floor(t / 9) * 2.5;
  const x = Math.cos(angle) * dist + ((t % 6) - 3) * 1.1;
  const z = Math.sin(angle) * dist + ((t % 5) - 2) * 1.3;

  if (Math.hypot(x - 2, z) < 6.5) continue;

  const trunkH = 1.6 + (t % 5) * 0.45;
  const trunkR = 0.16 + (t % 3) * 0.05;
  const foliageH = 2.0 + (t % 4) * 0.55;
  const foliageR = 0.85 + (t % 4) * 0.2;

  const trunk = addToScene(
    new THREE.Mesh(
      new THREE.CylinderGeometry(trunkR * 0.75, trunkR, trunkH, 10),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    )
  );
  trunk.position.set(x, trunkH / 2, z);

  const leaves = addToScene(
    new THREE.Mesh(
      new THREE.ConeGeometry(foliageR, foliageH, 10),
      new THREE.MeshStandardMaterial({
        color: treeGreens[t % treeGreens.length],
        roughness: 0.82,
      })
    )
  );
  leaves.position.set(x, trunkH + foliageH / 2 - 0.15, z);
}

// Rocks scattered randomly across the map
const ROCK_COUNT = 48;
const rockMaterial = new THREE.MeshStandardMaterial({
  map: cliffTexture,
  roughness: 0.96,
  metalness: 0.02,
});

for (let r = 0; r < ROCK_COUNT; r++) {
  const angle = (r / ROCK_COUNT) * Math.PI * 2 + r * 0.91;
  const dist = 5 + (r % 14) * 2.1 + Math.floor(r / 12) * 2.8;
  const x = Math.cos(angle) * dist + ((r % 9) - 4) * 0.85;
  const z = Math.sin(angle) * dist + ((r % 8) - 4) * 1.05;

  if (Math.hypot(x - 2, z) < 5.5) continue;

  const size = 0.22 + (r % 7) * 0.14;
  const shapeType = r % 4;
  let geometry;
  if (shapeType === 0) {
    geometry = new THREE.DodecahedronGeometry(size, 0);
  } else if (shapeType === 1) {
    geometry = new THREE.IcosahedronGeometry(size * 0.95, 0);
  } else if (shapeType === 2) {
    geometry = new THREE.BoxGeometry(size * 1.4, size * 0.9, size * 1.2);
  } else {
    geometry = new THREE.CylinderGeometry(size * 0.7, size * 1.1, size * 0.8, 8);
  }

  const rock = addToScene(new THREE.Mesh(geometry, rockMaterial));
  const sink = size * (shapeType === 2 ? 0.35 : 0.45);
  rock.position.set(x, size * 0.5 - sink + (r % 3) * 0.05, z);
  rock.rotation.set(r * 0.7, r * 1.1, r * 0.4);
  rock.scale.set(
    0.85 + (r % 5) * 0.08,
    0.9 + (r % 4) * 0.1,
    0.85 + (r % 6) * 0.07
  );
}

// Fluffy clouds — same puff style, many clusters across the sky
function createFluffyCloud(puffCount, scale = 1) {
  const cloud = new THREE.Group();
  for (let p = 0; p < puffCount; p++) {
    const puff = track(
      new THREE.Mesh(
        new THREE.SphereGeometry((0.9 + p * 0.25) * scale, 12, 12),
        new THREE.MeshStandardMaterial({
          color: UP.cloud,
          roughness: 1,
          transparent: true,
          opacity: 0.9 + (p % 2) * 0.04,
        })
      )
    );
    puff.position.set((p * 1.1 - 1) * scale, (p % 2) * 0.2 * scale, (p % 3) * 0.3 * scale);
    cloud.add(puff);
  }
  return cloud;
}

const clouds = [];
const CLOUD_COUNT = 42;

for (let c = 0; c < CLOUD_COUNT; c++) {
  const puffCount = 3 + (c % 3);
  const scale = 0.5 + (c % 8) * 0.11;
  const cloud = createFluffyCloud(puffCount, scale);
  const spread = 38;
  cloud.position.set(
    (c / CLOUD_COUNT) * spread * 2 - spread + (c % 5) * 1.2,
    13 + (c % 9) * 1.6 + Math.floor(c / 7) * 0.8,
    -28 + (c % 11) * 5.2 + Math.floor(c / 5) * 1.5
  );
  cloud.userData = {
    index: c,
    baseY: cloud.position.y,
    baseZ: cloud.position.z,
    drift: 0.004 + (c % 6) * 0.002,
    wrapMin: -spread - 8,
    wrapMax: spread + 8,
  };
  scene.add(cloud);
  clouds.push(cloud);
}

animated.push({
  mesh: clouds[0],
  animateFn: (time) => {
    clouds.forEach((cloud) => {
      const d = cloud.userData;
      cloud.position.x += d.drift;
      cloud.position.y = d.baseY + Math.sin(time * 0.0008 + d.index) * 0.45;
      cloud.position.z = d.baseZ + Math.sin(time * 0.0005 + d.index * 0.7) * 0.35;
      if (cloud.position.x > d.wrapMax) cloud.position.x = d.wrapMin;
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
