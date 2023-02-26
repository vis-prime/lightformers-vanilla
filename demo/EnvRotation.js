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
  Color,
  PMREMGenerator,
  TextureLoader,
  EquirectangularReflectionMapping,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  DirectionalLight,
  RepeatWrapping,
  ShadowMaterial,
  VSMShadowMap,
} from "three"
import Stats from "three/examples/jsm/libs/stats.module"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TransformControls } from "three/examples/jsm/controls/TransformControls"
import { GroundProjectedEnv } from "./CustomGroundProjectedEnv"

import hdriURL from "../public/between_bridges_1k.hdr?url"
import hdriWebPURL from "../public/between_bridges1.webp?url"
import modelUrl from "../public/rolls_royce_ghost.glb"

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
  envRotation: 0,
  autoRotate: false,
  rotEnv: () => {},
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
let envObject, gpv, dirGroup

/**
 * PMREM
 * @type {PMREMGenerator}
 */
let pmremGenerator
export async function initEnvRot(mainGui) {
  gui = mainGui
  sceneGui = gui.addFolder("Scene")
  stats = new Stats()
  app.appendChild(stats.dom)
  // renderer
  renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = VSMShadowMap
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
  camera.position.set(2.0, 2.64, 3.86)
  // scene
  scene = new Scene()
  //   scene.backgroundBlurriness = 0.8

  // light
  dirGroup = new Group()
  const dirLight = new DirectionalLight(0xffffff, 1)
  dirLight.name = "Dir. Light"
  dirLight.position.set(10, 10, 10)
  dirLight.castShadow = true
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 50
  dirLight.shadow.camera.right = 15
  dirLight.shadow.camera.left = -15
  dirLight.shadow.camera.top = 15
  dirLight.shadow.camera.bottom = -15
  dirLight.shadow.mapSize.width = 1024
  dirLight.shadow.mapSize.height = 1024
  dirLight.shadow.radius = 1

  dirLight.shadow.bias = -0.0005
  dirGroup.add(dirLight)
  scene.add(dirGroup)

  gui.add(dirLight.shadow, "radius").name("DIR radius").min(0).max(25)

  gui.add(dirLight.shadow, "blurSamples", 1, 25, 1).name("DIR samples")

  envObject = new Mesh(
    new SphereGeometry(1).scale(1, 1, -1),
    new MeshBasicMaterial()
  )

  rgbeLoader.load(hdriURL, (texture) => {
    texture.mapping = EquirectangularReflectionMapping
    envObject.material.map = texture
    // envObject.rotation.y = Math.PI / 2
    // scene.background = texture
    // scene.environment = texture
    scene.environment = pmremGenerator.fromScene(envObject).texture
  })

  gui.add(params, "autoRotate")
  gui.add(params, "envRotation", -Math.PI, Math.PI).onChange((v) => {
    rotateEnv()
  })

  textureLoader.load(hdriWebPURL, (texture) => {
    texture.encoding = sRGBEncoding
    texture.mapping = EquirectangularReflectionMapping
    texture.magFilter = LinearFilter
    texture.minFilter = LinearFilter
    gpv = new GroundProjectedEnv(texture, { height: 5, radius: 50 })
    gpv.scale.setScalar(100)
    gui.add(gpv, "height", 1, 100).name("Ground Height")
    gui.add(gpv, "radius", 1, 100).name("Ground Radius")

    scene.add(gpv)
  })

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

  await loadModels()
  animate()
}

function rotateEnv() {
  dirGroup.rotation.y = params.envRotation
  gpv.angle = params.envRotation

  envObject.rotation.y = params.envRotation
  scene.environment = pmremGenerator.fromScene(envObject).texture
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

  if (params.autoRotate) {
    params.envRotation += 0.001
    rotateEnv()
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
      // color: getRandomHexColor(),
      roughness: 0,
      metalness: 1,
    })
  )
  sphere.name = "sphere"
  sphere.castShadow = true
  sphere.receiveShadow = true
  sphere.position.set(2, 0, -1.5)
  mainObjects.add(sphere)

  const rTex = await textureLoader.loadAsync("/rgh.jpg")
  rTex.wrapS = RepeatWrapping
  rTex.wrapT = RepeatWrapping

  rTex.repeat.set(2, 2)
  // floor
  const plane = new Mesh(
    new PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
    // new MeshStandardMaterial({

    // color: getRandomHexColor(),
    // roughness: 0,
    // roughnessMap: rTex,
    // metalness: 1,
    new ShadowMaterial({ opacity: 0.8 })
  )
  plane.name = "plane"
  plane.receiveShadow = true
  plane.position.set(0, -0.001, 0)
  mainObjects.add(plane)

  // car
  const gltf = await gltfLoader.loadAsync(modelUrl)
  const model = gltf.scene
  model.name = "car"
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
