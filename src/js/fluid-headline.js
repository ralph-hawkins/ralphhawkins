import { prepareWithSegments, measureNaturalWidth } from '/js/pretext/layout.js'

const REF_SIZE = 100
const RATIO = 1.5 // Perfect fifth
// Container width range over which base size interpolates
const MIN_WIDTH = 300
const MAX_WIDTH = 830
const BASE_MIN = 16   // body size at narrowest
const BASE_MAX = 21   // body size at widest

function getInnerWidth(container) {
  const style = getComputedStyle(container)
  return container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
}

function fluidType() {
  const container = document.querySelector('header .container')
  if (!container) return

  const w = getInnerWidth(container)
  const root = document.documentElement

  // H1: fill container width using Pretext measurement
  const h1 = container.querySelector('h1')
  if (h1) {
    const text = h1.textContent.trim()
    const prepared = prepareWithSegments(text, `bold ${REF_SIZE}px Volksans`)
    const naturalWidth = measureNaturalWidth(prepared)
    root.style.setProperty('--h1-size', `${REF_SIZE * (w / naturalWidth)}px`)
  }

  // Base size interpolates with container width
  const t = Math.max(0, Math.min(1, (w - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)))
  const base = BASE_MIN + (BASE_MAX - BASE_MIN) * t

  // Perfect fifth scale from base
  // Line height tightens as type size increases: body (1.5) → h1 (0.8)
  const levels = [
    ['--body-size', '--body-lh', base,              1.5],
    ['--h4-size',   '--h4-lh',   base * RATIO,      1.3],
    ['--h3-size',   '--h3-lh',   base * RATIO ** 2,  1.15],
    ['--h2-size',   '--h2-lh',   base * RATIO ** 3,  1.0],
  ]
  for (const [sizeProp, lhProp, size, lh] of levels) {
    root.style.setProperty(sizeProp, `${size}px`)
    root.style.setProperty(lhProp, `${lh}`)
  }
}

document.fonts.ready.then(() => {
  fluidType()
  window.addEventListener('resize', fluidType)
})
