import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 14, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 2, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 6;
controls.maxDistance = 60;

const textureLoader = new THREE.TextureLoader();
const uvTexture = textureLoader.load('textures/uv_grid.jpg');
uvTexture.colorSpace = THREE.SRGBColorSpace;
uvTexture.wrapS = THREE.RepeatWrapping;
uvTexture.wrapT = THREE.RepeatWrapping;

const woodTexture = textureLoader.load('textures/hardwood.jpg');
woodTexture.colorSpace = THREE.SRGBColorSpace;
woodTexture.wrapS = THREE.RepeatWrapping;
woodTexture.wrapT = THREE.RepeatWrapping;
woodTexture.repeat.set(4, 4);

const skyboxLoader = new THREE.CubeTextureLoader();
const skybox = skyboxLoader.load([
  'textures/skybox/posx.jpg',
  'textures/skybox/negx.jpg',
  'textures/skybox/posy.jpg',
  'textures/skybox/negy.jpg',
  'textures/skybox/posz.jpg',
  'textures/skybox/negz.jpg',
]);
skybox.colorSpace = THREE.SRGBColorSpace;
scene.background = skybox;

const ambientLight = new THREE.AmbientLight(0x6a7a9a, 0.35);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xbfd9ff, 0x3a2f55, 0.55);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight(0xfff2d6, 1.2);
sunLight.position.set(14, 24, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 80;
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
scene.add(sunLight);

const pointLight = new THREE.PointLight(0x66ccff, 45, 18, 2);
pointLight.position.set(-6, 5, -4);
pointLight.castShadow = true;
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0xffaa66, 120, 35, Math.PI / 7, 0.35, 1.2);
spotLight.position.set(8, 12, 6);
spotLight.target.position.set(0, 1.5, 0);
spotLight.castShadow = true;
scene.add(spotLight);
scene.add(spotLight.target);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(28, 64),
  new THREE.MeshStandardMaterial({
    map: woodTexture,
    roughness: 0.85,
    metalness: 0.05,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const island = new THREE.Mesh(
  new THREE.CylinderGeometry(9, 10, 1.2, 48),
  new THREE.MeshStandardMaterial({
    map: uvTexture,
    roughness: 0.55,
    metalness: 0.1,
  })
);
island.position.y = 0.6;
island.castShadow = true;
island.receiveShadow = true;
scene.add(island);

const animatedObjects = [];
const shapeColors = [
  0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa29bfe, 0xfd79a8,
  0x74b9ff, 0x55efc4, 0xfdcb6e, 0xe17055, 0x81ecec,
];

function addShape(mesh, animateFn) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (animateFn) {
    animatedObjects.push({ mesh, animateFn });
  }
  return mesh;
}

const shapeConfigs = [
  { geo: new THREE.BoxGeometry(1, 1, 1), x: -4, z: -2, y: 1.8, color: shapeColors[0] },
  { geo: new THREE.BoxGeometry(0.8, 1.4, 0.8), x: -2.5, z: -3, y: 1.9, color: shapeColors[1] },
  { geo: new THREE.BoxGeometry(1.2, 0.6, 1.2), x: -1, z: -2.5, y: 1.5, color: shapeColors[2] },
  { geo: new THREE.BoxGeometry(0.7, 0.7, 0.7), x: 0.5, z: -3.2, y: 1.55, color: shapeColors[3] },
  { geo: new THREE.BoxGeometry(1, 0.5, 1.5), x: 2, z: -2, y: 1.45, color: shapeColors[4] },

  { geo: new THREE.SphereGeometry(0.55, 24, 24), x: 3.5, z: -1, y: 1.75, color: shapeColors[5] },
  { geo: new THREE.SphereGeometry(0.4, 20, 20), x: 4.5, z: 0.5, y: 1.6, color: shapeColors[6] },
  { geo: new THREE.SphereGeometry(0.65, 24, 24), x: 3, z: 1.5, y: 1.85, color: shapeColors[7] },
  { geo: new THREE.SphereGeometry(0.35, 16, 16), x: 4, z: 2.5, y: 1.55, color: shapeColors[8] },
  { geo: new THREE.SphereGeometry(0.5, 20, 20), x: 2, z: 3, y: 1.7, color: shapeColors[9] },

  { geo: new THREE.CylinderGeometry(0.35, 0.35, 1.2, 20), x: -3.5, z: 1, y: 1.8, color: 0xff7675 },
  { geo: new THREE.CylinderGeometry(0.5, 0.3, 1.4, 20), x: -2, z: 2.5, y: 1.9, color: 0x00b894 },
  { geo: new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16), x: -0.5, z: 1.8, y: 1.65, color: 0x0984e3 },
  { geo: new THREE.CylinderGeometry(0.4, 0.6, 1.1, 18), x: 0.8, z: 2.2, y: 1.75, color: 0x6c5ce7 },

  { geo: new THREE.ConeGeometry(0.55, 1.2, 20), x: -4.2, z: 3.2, y: 1.8, color: 0xe84393 },
  { geo: new THREE.ConeGeometry(0.4, 0.9, 16), x: -3, z: 4, y: 1.65, color: 0x00cec9 },
  { geo: new THREE.ConeGeometry(0.35, 0.8, 16), x: 1.5, z: -1, y: 1.6, color: 0xfdcb6e },

  { geo: new THREE.TorusGeometry(0.45, 0.15, 12, 24), x: -1.5, z: -1, y: 2.1, color: 0xd63031 },
  { geo: new THREE.TorusGeometry(0.35, 0.1, 10, 20), x: 1, z: 0.5, y: 2, color: 0x2d3436 },

  { geo: new THREE.DodecahedronGeometry(0.55), x: -0.5, z: -0.5, y: 2.2, color: 0x9b59b6 },
  { geo: new THREE.IcosahedronGeometry(0.5), x: 2.5, z: -0.5, y: 2.15, color: 0x1abc9c },
  { geo: new THREE.OctahedronGeometry(0.45), x: -2.8, z: -0.8, y: 2.05, color: 0xf39c12 },
  { geo: new THREE.TetrahedronGeometry(0.55), x: 0.2, z: 1.2, y: 2.1, color: 0x3498db },
];

shapeConfigs.forEach((config, index) => {
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.35,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(config.geo, material);
  mesh.position.set(config.x, config.y, config.z);
  mesh.rotation.y = index * 0.35;

  const bobOffset = index * 0.4;
  addShape(mesh, (time) => {
    mesh.rotation.y = time * 0.0004 + index * 0.35;
    mesh.position.y = config.y + Math.sin(time * 0.002 + bobOffset) * 0.12;
  });
});

const orbitRing = new THREE.Group();
scene.add(orbitRing);

for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2;
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.6,
    })
  );
  orb.userData.orbitAngle = angle;
  orb.castShadow = true;
  orbitRing.add(orb);
}

animatedObjects.push({
  mesh: orbitRing,
  animateFn: (time) => {
    orbitRing.rotation.y = time * 0.001;
    orbitRing.children.forEach((orb) => {
      const angle = orb.userData.orbitAngle + time * 0.0015;
      orb.position.set(Math.cos(angle) * 5.5, 3.2 + Math.sin(time * 0.003 + orb.userData.orbitAngle) * 0.25, Math.sin(angle) * 5.5);
    });
  },
});

const heroKnot = addShape(
  new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.7, 0.22, 120, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0x553300,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.75,
    })
  ),
  (time) => {
    heroKnot.rotation.x = time * 0.001;
    heroKnot.rotation.z = time * 0.0007;
  }
);
heroKnot.position.set(0, 4.2, 0);

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 1.1, 0.5, 24),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4, metalness: 0.2 })
);
pedestal.position.set(0, 1.45, 0);
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

const loader = new GLTFLoader();
loader.load(
  'models/Duck.glb',
  (gltf) => {
    const duck = gltf.scene;
    duck.scale.set(0.015, 0.015, 0.015);
    duck.position.set(0, 1.7, 0);
    duck.rotation.y = Math.PI * 0.25;
    duck.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    scene.add(duck);
    animatedObjects.push({
      mesh: duck,
      animateFn: (time) => {
        duck.rotation.y = Math.PI * 0.25 + Math.sin(time * 0.0015) * 0.35;
        duck.position.y = 1.7 + Math.sin(time * 0.0025) * 0.08;
      },
    });
  },
  undefined,
  (error) => {
    console.error('Failed to load Duck.glb:', error);
  }
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(time) {
  animatedObjects.forEach(({ animateFn }) => animateFn(time));

  pointLight.intensity = 40 + Math.sin(time * 0.002) * 8;
  spotLight.position.x = 8 + Math.sin(time * 0.0008) * 2;

  controls.update();
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
