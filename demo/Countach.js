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
  ShadowMaterial,
  VSMShadowMap,
  MathUtils,
  FloatType,
  HalfFloatType,
} from "three"
import Stats from "three/examples/jsm/libs/stats.module"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TransformControls } from "three/examples/jsm/controls/TransformControls"
import { GroundProjectedEnv } from "./CustomGroundProjectedEnv"
import { pcss } from "@pmndrs/vanilla"

// files
import modelUrl from "../models/lamborghini-countach.glb"
import porsche911Url from "../models/porsche_911_1975.glb"

/**
 * Env/bg/sun options
 * @enum
 * @type {Object}
 */
const EnvOptions = {
  between_bridges: {
    env: "./between_bridges_1k.hdr",
    bg: "./between_bridges1.webp",
    sunPos: [10, 5, 8],
    sunCol: "#ffffeb",
    shadowOpacity: 0.5,
    groundProj: { radius: 50, height: 5 },
  },
  wide_street_1: {
    env: "./wide_street_01_1k.exr",
    bg: "./wide_street_01.webp",
    isExr: true,
    sunPos: [15, 24, 11],
    sunCol: "#ffffeb",
    shadowOpacity: 0.85,
    groundProj: { radius: 12, height: 2 },
  },
  ulmer_muenster: {
    env: "./ulmer_muenster_1k.exr",
    bg: "./ulmer_muenster.webp",
    isExr: true,
    sunPos: [17, 14, 12],
    sunCol: "#ffffeb",
    shadowOpacity: 0.72,
    groundProj: { radius: 25, height: 2 },
  },
  wide_street_2: {
    env: "./wide_street_02_1k.exr",
    bg: "./wide_street_02.webp",
    isExr: true,
    sunPos: [16, 8, 12],
    sunCol: "#ffffeb",
    shadowOpacity: 0.55,
    groundProj: { radius: 25, height: 2 },
  },
}

let stats,
  renderer,
  raf,
  camera,
  scene,
  controls,
  gui,
  pointer = new Vector2()

let sceneGui
let envObject, gpE, sunGroup, sunLight, envFolder, shadowFloor
let transformControls

const params = {
  bgColor: new Color(),
  env: EnvOptions.between_bridges,
  envRotation: 0,
  gpRad: 1,
  gpHeight: 50,
  animateRotation: false,
  rotEnv: () => {},
  printCam: () => {},
}

const mainObjects = new Group()
const textureLoader = new TextureLoader()
const rgbeLoader = new RGBELoader()
const exrLoader = new EXRLoader()
const gltfLoader = new GLTFLoader()
const draco = new DRACOLoader()

// draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/")
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
gltfLoader.setDRACOLoader(draco)
const raycaster = new Raycaster()
const intersects = [] //raycast

// wheel references
const wheels = {
  FL: null,
  FR: null,
  R: null,
  steerL: null,
  steerR: null,
  onAnimate: () => {},
}

/**
 * PMREM
 * @type {PMREMGenerator}
 */
let pmremGenerator

export async function initCountach(mainGui) {
  gui = mainGui
  sceneGui = gui.addFolder("Scene")
  stats = new Stats()
  app.appendChild(stats.dom)
  // renderer
  renderer = new WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  // renderer.shadowMap.type = VSMShadowMap
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

  if (camera.aspect < 1) {
    // phones
    camera.position.multiplyScalar(2)
  }
  // scene
  scene = new Scene()
  scene.add(mainObjects)

  const reset = pcss({ size: 25, samples: 10, focus: 0 })

  reset(renderer, scene, camera)
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
  app.addEventListener("pointermove", onPointerMove)

  let downTime = Date.now()
  app.addEventListener("pointerdown", () => {
    downTime = Date.now()
  })
  app.addEventListener("pointerup", (e) => {
    if (Date.now() - downTime < 200) {
      onPointerMove(e)
      raycast()
    }
  })

  sceneGui.add(transformControls, "mode", ["translate", "rotate", "scale"])

  setupEnv()
  await loadModels()
  animate()
}

function setupEnv() {
  // floor
  shadowFloor = new Mesh(
    new PlaneGeometry(15, 15).rotateX(-Math.PI / 2),
    new ShadowMaterial({ opacity: 0.8 })
  )
  shadowFloor.name = "shadow_floor"
  shadowFloor.receiveShadow = true
  shadowFloor.position.set(0, -0.001, 0)
  mainObjects.add(shadowFloor)

  // light
  sunGroup = new Group()
  sunLight = new DirectionalLight(0xffffeb, 1)
  sunLight.name = "Dir. Light"
  sunLight.castShadow = true
  sunLight.shadow.camera.near = 0.1
  sunLight.shadow.camera.far = 50
  sunLight.shadow.camera.right = 15
  sunLight.shadow.camera.left = -15
  sunLight.shadow.camera.top = 15
  sunLight.shadow.camera.bottom = -15
  sunLight.shadow.mapSize.width = 1024
  sunLight.shadow.mapSize.height = 1024
  sunLight.shadow.radius = 1.95
  sunLight.shadow.blurSamples = 6

  sunLight.shadow.bias = -0.0005
  sunGroup.add(sunLight)
  scene.add(sunGroup)

  envObject = new Mesh(
    new SphereGeometry(1).scale(1, 1, -1),
    new MeshBasicMaterial()
  )

  updateEnv(params.env)
}

function updateEnvGui() {
  if (envFolder) {
    for (const fol of [...envFolder.children]) {
      fol.destroy()
    }
  } else {
    envFolder = gui.addFolder("🌍ENV/BG/Light")
    envFolder.open()
  }

  envFolder
    .add(params, "env", EnvOptions)
    .name("🌏Select Env")
    .onChange((v) => {
      updateEnv(v)
    })
  envFolder
    .add(params, "envRotation", 0, 2 * Math.PI, 0.05)
    .name("🌏Env Rotation")
    .onChange((v) => {
      rotateEnv()
    })

  envFolder.add(sunLight.shadow, "radius").name("💡radius").min(0).max(25)
  // envFolder.add(sunLight.position, "x").onChange(() => {
  //   console.log(sunLight.position.toArray())
  // })
  // envFolder.add(sunLight.position, "y").onChange(() => {
  //   console.log(sunLight.position.toArray())
  // })
  // envFolder.add(sunLight.position, "z").onChange(() => {
  //   console.log(sunLight.position.toArray())
  // })
  envFolder.add(sunLight.shadow, "blurSamples", 1, 25, 1).name("💡samples")
  envFolder.addColor(sunLight, "color").name("💡Color")
  envFolder.add(sunLight, "intensity", 0, 25, 0.01).name("💡Intensity")
  envFolder
    .add(shadowFloor.material, "opacity", 0, 1, 0.01)
    .name("💡Shadow opacity")

  envFolder
    .add(params, "gpHeight", 1, 100)
    .name("Ground Height")
    .onChange((v) => {
      if (gpE) {
        gpE.height = v
      }
    })
  envFolder
    .add(params, "gpRad", 1, 100)
    .name("Ground Radius")
    .onChange((v) => {
      if (gpE) {
        gpE.radius = v
      }
    })
  envFolder.add(params, "animateRotation").name("⚠ Animate Rotation")
}

/**
 * Update Current env/bg combo
 * @param {EnvOptions} envDict
 */
async function updateEnv(envDict) {
  const { env, bg, isExr, sunPos, sunCol, groundProj, shadowOpacity } = envDict

  if (sunPos) {
    sunLight.visible = true
    sunLight.position.fromArray(sunPos)
  } else {
    sunLight.visible = false
  }

  if (sunCol) {
    sunLight.color.set(sunCol)
  } else {
    sunLight.color.set(0xffffff)
  }

  const envTexturePromise = isExr
    ? exrLoader.loadAsync(env)
    : rgbeLoader.loadAsync(env)
  const bgTexturePromise = textureLoader.loadAsync(bg)

  const [envTexture, bgTexture] = await Promise.all([
    envTexturePromise,
    bgTexturePromise,
  ])

  envTexture.mapping = EquirectangularReflectionMapping
  envObject.material.map = envTexture

  bgTexture.encoding = sRGBEncoding
  bgTexture.mapping = EquirectangularReflectionMapping
  bgTexture.magFilter = LinearFilter
  bgTexture.minFilter = LinearFilter

  if (groundProj) {
    params.gpRad = groundProj.radius
    params.gpHeight = groundProj.height
  }

  if (!gpE) {
    gpE = new GroundProjectedEnv(bgTexture)
    gpE.scale.setScalar(100)
    scene.add(gpE)
  }

  if (shadowOpacity) {
    shadowFloor.material.opacity = shadowOpacity
  }

  gpE.material.uniforms.map.value = bgTexture
  gpE.height = params.gpHeight
  gpE.radius = params.gpRad

  rotateEnv()
  updateEnvGui()
}

function rotateEnv() {
  sunGroup.rotation.y = params.envRotation
  gpE.angle = params.envRotation

  envObject.rotation.y = params.envRotation
  if (scene.environment) scene.environment.dispose()
  scene.environment = pmremGenerator.fromScene(envObject).texture
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function render() {
  stats.update()
  // Update the inertia on the orbit controls
  controls.update()
  wheels.onAnimate()

  if (params.animateRotation) {
    params.envRotation += 0.001
    rotateEnv()
  }

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

  if (intersects[0].object.raycastRoot) {
    transformControls.attach(intersects[0].object.raycastRoot)
  } else {
    transformControls.detach()
  }

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
  sphere.position.set(0, 0, 0)
  sphere.raycastRoot = sphere
  mainObjects.add(sphere)

  // car
  const gltf = await gltfLoader.loadAsync(modelUrl)
  const model = gltf.scene
  model.name = "car"
  model.position.set(-4, 0, 0)
  const mats = {}
  model.traverse((child) => {
    if (child.isMesh) {
      child.raycastRoot = model
      child.castShadow = true
      child.receiveShadow = true
      mats[child.material.name] = child.material
    }
  })
  mainObjects.add(model)

  wheels.FL = model.getObjectByName("wheel_f_l")
  wheels.FR = model.getObjectByName("wheel_f_r")
  wheels.R = model.getObjectByName("wheels_r")

  wheels.steerL = model.getObjectByName("steer_l")
  wheels.steerR = model.getObjectByName("steer_r")

  if (!(wheels.FL && wheels.FR && wheels.R && wheels.steerL && wheels.steerR)) {
    return
  }

  const carParams = {
    wheelSpeed: 0.001,
    steer: 0,
  }

  wheels.onAnimate = () => {
    if (carParams.wheelSpeed === 0) return
    wheels.FL.rotation.x += carParams.wheelSpeed
    wheels.FR.rotation.x += carParams.wheelSpeed
    wheels.R.rotation.x += carParams.wheelSpeed
  }

  let body1Mat = mats["body_1"]
  let body2Mat = mats["body_2"]

  const steerLimit = MathUtils.degToRad(30)
  const carFolder = gui.addFolder("🚗")
  carFolder.add(carParams, "wheelSpeed", 0, 0.1).name("🚗 speed")
  carFolder
    .add(carParams, "steer", -1, 1, 0.1)
    .name("🚗 steer")
    .onChange((v) => {
      const rotY = MathUtils.mapLinear(v, -1, 1, -steerLimit, steerLimit)
      wheels.steerL.rotation.y = rotY
      wheels.steerR.rotation.y = rotY
    })
  carFolder.addColor(body1Mat, "color").name("Color 1")
  carFolder.addColor(body2Mat, "color").name("Color 2")
  carFolder.add(body1Mat, "metalness", 0, 1, 0.001).name("Metal 1")
  carFolder.add(body2Mat, "metalness", 0, 1, 0.001).name("Metal 2")
  carFolder.add(body1Mat, "roughness", 0, 1, 0.001).name("Rough 1")
  carFolder.add(body2Mat, "roughness", 0, 1, 0.001).name("Rough 2")

  //porsche
  {
    const gltf = await gltfLoader.loadAsync(porsche911Url)
    const model = gltf.scene
    model.name = "car2"
    model.position.set(4, 0, 0)
    model.traverse((child) => {
      if (child.isMesh) {
        child.raycastRoot = model
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    mainObjects.add(model)
  }
}

const color = new Color()
function getRandomHexColor() {
  return "#" + color.setHSL(Math.random(), 0.5, 0.5).getHexString()
}
