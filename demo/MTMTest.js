import Stats from "three/examples/jsm/libs/stats.module"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TransformControls } from "three/examples/jsm/controls/TransformControls"
import modelUrl from "../models/monkey.glb"
import * as THREE from "three"

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
  EquirectangularReflectionMapping,
  PointLight,
  MeshPhysicalMaterial,
} from "three"
import { EnvOptions } from "./EnvOptions"
import { MeshTransmissionMaterialImpl } from "../src/MTM"

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
let useFrame = () => {}
let sceneGui
let envObject
let pmremGenerator
export async function initMTM(mainGui) {
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
  //   scene.backgroundBlurriness = 0.8

  rgbeLoader.load(EnvOptions.between_bridges.env, (texture) => {
    texture.mapping = EquirectangularReflectionMapping
    scene.background = texture
    scene.environment = texture
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

  const light = new PointLight()
  light.position.set(5, 5, 5)
  scene.add(light)

  await loadModels()
  animate()
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
  useFrame()
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
      roughness: 0,
      metalness: 1,
    })
  )
  cube.name = "cube"
  cube.castShadow = true
  cube.receiveShadow = true
  cube.position.set(-1.5, 0, -1.5)
  mainObjects.add(cube)

  const rTex = await textureLoader.loadAsync("./rgh.jpg")
  rTex.wrapS = RepeatWrapping
  rTex.wrapT = RepeatWrapping

  rTex.repeat.set(2, 2)
  // floor
  //   const plane = new Mesh(
  //     new PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
  //     new MeshStandardMaterial({
  //       color: getRandomHexColor(),
  //       roughness: 0.8,
  //       roughnessMap: rTex,
  //       //   metalness: 1,
  //     })
  //   )
  //   plane.name = "plane"
  //   plane.castShadow = true
  //   plane.receiveShadow = true
  //   plane.position.set(2, 0, -1.5)
  //   mainObjects.add(plane)

  // monkey
  const gltf = await gltfLoader.loadAsync(modelUrl)
  const model = gltf.scene
  model.name = "suzanne"
  let mesh
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      mesh = child
    }
  })

  const mats = {
    meshTransmission: new MeshTransmissionMaterialImpl(),
    meshPhysical: new MeshPhysicalMaterial({
      roughness: 0,
      transmission: 1,
      thickness: 1,
    }),
  }

  let background = scene.background
  let backside = true
  let thickness = 1
  let backsideThickness = 0.5
  let side = THREE.FrontSide

  const dummy = {
    backside,
    thickness,
    backsideThickness,
    side,
    type: mats.meshPhysical,
    isTransmission: false,
  }
  gui.add(dummy, "type", mats).onChange((v) => {
    mesh.material = v
    dummy.isTransmission =
      v instanceof MeshTransmissionMaterialImpl ? true : false
  })
  mesh.material = dummy.type

  const matN = mats.meshTransmission
  console.log(mats)

  gui.addColor(mats.meshPhysical, "color")
  gui.add(mats.meshPhysical, "roughness", 0, 1)
  gui.add(mats.meshPhysical, "clearcoat", 0, 1)
  gui.add(mats.meshPhysical, "transmission", 0, 1)
  gui.add(mats.meshPhysical, "thickness", 0, 2)

  gui.addColor(mats.meshTransmission, "color")
  gui.add(mats.meshTransmission, "roughness", 0, 1)

  gui.add(mats.meshTransmission, "clearcoat", 0, 1)

  gui.add(mats.meshTransmission, "chromaticAberration", 0, 2)
  gui.add(mats.meshTransmission, "distortion", 0, 10)
  gui.add(mats.meshTransmission, "temporalDistortion", 0, 1)
  gui.add(mats.meshTransmission, "anisotropy", 0, 10)

  mainObjects.add(model)

  const discardMaterial = new DiscardMaterial()
  const fboBack = new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: renderer.outputEncoding,
    type: THREE.HalfFloatType,
  })
  const fboMain = new THREE.WebGLRenderTarget(512, 512, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: renderer.outputEncoding,
    type: THREE.HalfFloatType,
  })

  console.log(fboMain)
  const ref = matN
  ref.buffer = fboMain.texture
  let oldBg
  let oldTone
  let parent = mesh
  let transmissionSampler = false
  const state = {
    gl: renderer,
    scene,
    camera,
  }

  gui.add(dummy, "backside").onChange((v) => {
    backside = v
  })
  gui.add(dummy, "thickness", 0, 2).onChange((v) => {
    thickness = v
  })
  gui.add(dummy, "backsideThickness", 0, 2).onChange((v) => {
    backsideThickness = v
  })
  useFrame = () => {
    if (!dummy.isTransmission) {
      return
    }
    ref.time += 0.001
    // return
    // Render only if the buffer matches the built-in and no transmission sampler is set
    if (ref.buffer === fboMain.texture && !transmissionSampler) {
      // Save defaults
      oldTone = state.gl.toneMapping
      oldBg = state.scene.background

      // Switch off tonemapping lest it double tone maps
      // Save the current background and set the HDR as the new BG
      // Use discardmaterial, the parent will be invisible, but it's shadows will still be cast
      state.gl.toneMapping = THREE.NoToneMapping
      if (background) state.scene.background = background
      parent.material = discardMaterial

      if (backside) {
        // Render into the backside buffer
        state.gl.setRenderTarget(fboBack)
        state.gl.render(state.scene, state.camera)
        // And now prepare the material for the main render using the backside buffer
        parent.material = ref
        parent.material.buffer = fboBack.texture
        parent.material.thickness = backsideThickness
        parent.material.side = THREE.BackSide
      }

      // Render into the main buffer
      state.gl.setRenderTarget(fboMain)
      state.gl.render(state.scene, state.camera)

      parent.material.thickness = thickness
      parent.material.side = side
      parent.material.buffer = fboMain.texture

      // Set old state back
      state.scene.background = oldBg
      state.gl.setRenderTarget(null)
      parent.material = ref
      state.gl.toneMapping = oldTone
    }
  }
}

const color = new Color()
function getRandomHexColor() {
  return "#" + color.setHSL(Math.random(), 0.5, 0.5).getHexString()
}

/**
 * r3f shader material which makes editing uniforms easy
 * @param {Object} uniforms
 * @param {String} vertexShader
 * @param {String} fragmentShader
 * @param {Function} onInit
 * @returns
 */
function shaderMaterial(
  uniforms = {},
  vertexShader,
  fragmentShader,
  onInit = (material) => {}
) {
  const material = class extends THREE.ShaderMaterial {
    constructor(parameters = {}) {
      const entries = Object.entries(uniforms)
      // Create uniforms and shaders
      super({
        uniforms: entries.reduce((acc, [name, value]) => {
          const uniform = THREE.UniformsUtils.clone({ [name]: { value } })
          return {
            ...acc,
            ...uniform,
          }
        }, {}),
        vertexShader,
        fragmentShader,
      })
      // Create getter/setters
      entries.forEach(([name]) =>
        Object.defineProperty(this, name, {
          get: () => this.uniforms[name].value,
          set: (v) => (this.uniforms[name].value = v),
        })
      )

      // Assign parameters, this might include uniforms
      Object.assign(this, parameters)
      // Call onInit
      if (onInit) onInit(this)
    }
  }
  material.key = THREE.MathUtils.generateUUID()
  return material
}

/**
 * r3f Discard material which helps ignore materials when rendering
 */
const DiscardMaterial = shaderMaterial(
  {},
  "void main() { }",
  "void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); discard;  }"
)

// 👇 uncomment when TS version supports function overloads
// export function useFBO(settings?: FBOSettings)
export function useFBO(
  /** Width in pixels, or settings (will render fullscreen by default) */
  width,
  /** Height in pixels */
  height,
  /**Settings */
  settings,
  gl,
  size,
  viewport
) {
  // const { gl, size, viewport } = useThree()
  const _width = typeof width === "number" ? width : size.width * viewport.dpr
  const _height =
    typeof height === "number" ? height : size.height * viewport.dpr
  const _settings = (typeof width === "number" ? settings : width) || {}
  const { samples = 0, depth, ...targetSettings } = _settings

  const target =
    (() => {
      let target
      target = new THREE.WebGLRenderTarget(_width, _height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        encoding: gl.outputEncoding,
        type: THREE.HalfFloatType,
        ...targetSettings,
      })

      if (depth) {
        target.depthTexture = new THREE.DepthTexture(
          _width,
          _height,
          THREE.FloatType
        )
      }

      target.samples = samples
      return target
    },
    [])

  // React.useLayoutEffect(() => {
  //   target.setSize(_width, _height)
  //   if (samples) target.samples = samples
  // }, [samples, target, _width, _height])

  // React.useEffect(() => {
  //   return () => target.dispose()
  // }, [])

  return target
}
