import "./style.css"

import { version } from "./package.json"
import { GUI } from "lil-gui"
import { initBasic } from "./demo/Basic"
import { initEnvRot } from "./demo/EnvRotation"
initEnvRot

let url_string = window.location.href
let url = new URL(url_string)
const AllScenes = {
  Basic: "basic",
  ENV: "env",
}
const params = {
  sceneName: url.searchParams.get("scene") || AllScenes.Basic,
}

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value)
}

function updatePageDesc(path) {
  const prettyName = getKeyByValue(AllScenes, path)
  const paramsU = new URLSearchParams(window.location.search)
  paramsU.set("scene", path)
  window.history.replaceState({}, "", `${window.location.pathname}?${paramsU}`)
  document.title = `Lightformers | ${prettyName}`
}
const gui = new GUI({
  title: "Lightformers Vanilla " + version,
  closeFolders: true,
})
gui
  .add(params, "sceneName", AllScenes)
  .name("SCENE")
  .onChange((v) => {
    updatePageDesc(v)
    window.location.reload()
  })

function loadScene(path) {
  updatePageDesc(path)
  switch (path.toLowerCase()) {
    case AllScenes.Basic: {
      initBasic(gui)
      break
    }

    case AllScenes.ENV: {
      initEnvRot(gui)
      break
    }

    default: {
      console.warn("invalid scene")
      break
    }
  }
}

loadScene(params.sceneName)
