import Stats from "three/examples/jsm/libs/stats.module"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TransformControls } from "three/examples/jsm/controls/TransformControls"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment"
import modelUrl from "../public/monkey.glb"
import rghURL from "../public/rgh.jpg?url"

import {
  ACESFilmicToneMapping,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  sRGBEncoding,
  WebGLRenderer,
  Vector2,
  Raycaster,
  Group,
  BoxGeometry,
  Color,
  PMREMGenerator,
  PlaneGeometry,
  TextureLoader,
  RepeatWrapping,
} from "three"

let stats,
  renderer,
  raf,
  camera,
  scene,
  controls,
  gui,
  pointer = new Vector2()

const params = {
  bgColor: new Color(),
  printCam: () => {},
}
const mainObjects = new Group()
const textureLoader = new TextureLoader()
const rgbeLoader = new RGBELoader()
const gltfLoader = new GLTFLoader()
const draco = new DRACOLoader()
let transformControls
// draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/")
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
gltfLoader.setDRACOLoader(draco)
const raycaster = new Raycaster()
const intersects = [] //raycast

let sceneGui
let envObject
let pmremGenerator
export async function initBasic(mainGui) {
  gui = mainGui
  sceneGui = gui.addFolder("Scene")
  stats = new Stats()
  app.appendChild(stats.dom)
  // renderer
  renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.outputEncoding = sRGBEncoding
  renderer.toneMapping = ACESFilmicToneMapping

  pmremGenerator = new PMREMGenerator(renderer)
  pmremGenerator.compileCubemapShader()
  app.appendChild(renderer.domElement)

  // camera
  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  )
  camera.position.set(6, 3, 6)
  camera.name = "Camera"
  camera.position.set(2.0404140991899564, 2.644387886134694, 3.8683136783076355)
  // scene
  scene = new Scene()
  scene.backgroundBlurriness = 0.8

  //   rgbeLoader.load(hdriUrl, (texture) => {
  //     texture.mapping = EquirectangularReflectionMapping
  //     scene.background = texture
  //     scene.environment = texture
  //   })
  scene.add(mainObjects)

  // controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05
  controls.minDistance = 0.1
  controls.maxDistance = 100
  controls.maxPolarAngle = Math.PI / 1.5
  controls.target.set(0, 0, 0)
  controls.target.set(0, 0, 0)

  transformControls = new TransformControls(camera, renderer.domElement)
  transformControls.addEventListener("dragging-changed", (event) => {
    controls.enabled = !event.value
    if (!event.value) {
    }
  })

  transformControls.addEventListener("change", () => {
    if (transformControls.object) {
      if (transformControls.object.position.y < 0) {
        transformControls.object.position.y = 0
      }
    }
  })
  scene.add(transformControls)

  window.addEventListener("resize", onWindowResize)
  document.addEventListener("pointermove", onPointerMove)

  let downTime = Date.now()
  document.addEventListener("pointerdown", () => {
    downTime = Date.now()
  })
  document.addEventListener("pointerup", (e) => {
    if (Date.now() - downTime < 200) {
      onPointerMove(e)
      raycast()
    }
  })

  sceneGui.add(transformControls, "mode", ["translate", "rotate", "scale"])
  sceneGui.add(scene, "backgroundBlurriness", 0, 1, 0.01)
  sceneGui.addColor(params, "bgColor").onChange(() => {
    scene.background = params.bgColor
  })

  //   const light = new PointLight()
  //   light.position.set(5, 5, 5)
  //   scene.add(light)

  envObject = new RoomEnvironment()
  let mats = {}
  envObject.traverse((node) => {
    if (node.isLight) {
      gui.add(node, "intensity", 0, 10)
      //   node.visible = false
    }

    if (node.material) {
      mats[node.material.uuid] = node.material
    }
  })
  //   scene.add(e)
  console.log(envObject)

  for (const mat of Object.values(mats)) {
    if (mat.color.r > 1) {
      gui
        .add(mat.color, "r", 0, 4000, 1)
        .name("Intensity")
        .onChange((v) => {
          mat.color.setScalar(v)
        })
    }
  }

  await loadModels()
  animate()
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

let updateCounter = 0
function render() {
  stats.update()
  // Update the inertia on the orbit controls
  controls.update()
  envObject.rotation.y += 0.01

  if (updateCounter > 5) {
    scene.environment = pmremGenerator.fromScene(envObject).texture
    updateCounter = 0
  }
  updateCounter++

  renderer.render(scene, camera)
}

function animate() {
  raf = requestAnimationFrame(animate)
  render()
}

function raycast() {
  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(pointer, camera)

  // calculate objects intersecting the picking ray
  raycaster.intersectObject(mainObjects, true, intersects)

  if (!intersects.length) {
    transformControls.detach()
    return
  }

  transformControls.attach(intersects[0].object)

  intersects.length = 0
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}

async function loadModels() {
  // sphere
  const sphere = new Mesh(
    new SphereGeometry(0.5).translate(0, 0.5, 0),
    new MeshStandardMaterial({
      color: getRandomHexColor(),
      roughness: 0,
      metalness: 1,
    })
  )
  sphere.name = "sphere"
  sphere.castShadow = true
  sphere.receiveShadow = true
  sphere.position.set(2, 0, -1.5)
  mainObjects.add(sphere)

  // cube
  const cube = new Mesh(
    new BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    new MeshStandardMaterial({
      color: getRandomHexColor(),
      roughness: 0.3,
      metalness: 0,
    })
  )
  cube.name = "cube"
  cube.castShadow = true
  cube.receiveShadow = true
  cube.position.set(-1.5, 0, 1.5)
  mainObjects.add(cube)

  const rTex = await textureLoader.loadAsync(rghURL)
  rTex.wrapS = RepeatWrapping
  rTex.wrapT = RepeatWrapping

  rTex.repeat.set(2, 2)
  // floor
  const plane = new Mesh(
    new PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({
      color: getRandomHexColor(),
      roughness: 0.8,
      roughnessMap: rTex,
      //   metalness: 1,
    })
  )
  plane.name = "plane"
  plane.castShadow = true
  plane.receiveShadow = true
  plane.position.set(2, 0, -1.5)
  mainObjects.add(plane)

  // monkey
  const gltf = await gltfLoader.loadAsync(modelUrl)
  const model = gltf.scene
  model.name = "suzanne"
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  mainObjects.add(model)
}

const color = new Color()
function getRandomHexColor() {
  return "#" + color.setHSL(Math.random(), 0.5, 0.5).getHexString()
}
