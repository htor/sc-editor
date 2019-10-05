const fs = require('fs')
const { sclang } = require('electron').remote.require('./main')
const { APPSUPPORT_DIR } = require('./scripts/utils')
const editor = require('./scripts/editor')

const leftPane = document.querySelector('#left')
const rightPane = document.querySelector('#right')
const loading = document.querySelector('#loading')
const helpPane = document.querySelector('#help')
const postPane = document.querySelector('#post')
const iframe = helpPane.querySelector('iframe')
const docmapCode = fs.readFileSync(`${APPSUPPORT_DIR.replace('%20', ' ')}/docmap.js`, 'utf-8')
const mainTextArea = leftPane.querySelector('textarea')
const mainEditor = editor.attach(mainTextArea)
mainEditor.focus()

window.addEventListener('mousedown', onMousedown)
document.addEventListener('keydown', onKeydown)
document.addEventListener('click', onClick)
iframe.addEventListener('load', onLoad)
iframe.src = `file://${APPSUPPORT_DIR}/Help.html`

function onLoad () {
  const win = iframe.contentWindow
  const doc = iframe.contentDocument

  // remove styles, scripts and code blocks
  doc.querySelectorAll('.CodeMirror').forEach((el) => el.remove())
  doc.head.querySelectorAll('link').forEach((link) => {
    const file = link.getAttribute('href').split('/').pop()
    if (['codemirror.css', 'editor.css'].includes(file)) link.remove()
  })
  doc.head.querySelectorAll('script').forEach((script) => {
    const file = (script.getAttribute('src') || '').split('/').pop()
    if (file.match(/^(codemirror|editor)/)) script.remove()
  })

  // inject own stylesheet
  const styles = document.createElement('link')
  styles.rel = 'stylesheet'
  styles.href = `${__dirname}/styles/help.css`
  doc.head.appendChild(styles)

  // setup code blocks
  doc.querySelectorAll('textarea').forEach(editor.attach)

  // make docmap avalable
  eval(docmapCode)

  // fix menubar dropdown linx
  const dropdowns = doc.querySelectorAll('.menu-link[href="#"]')
  dropdowns.forEach((dropdown) => dropdown.textContent = dropdown.textContent.replace('▼', ''))

  doc.querySelectorAll('#folder').forEach((folder) => folder.nextSibling ? folder.nextSibling.textContent = ' > ' : '')

  // move subheader to bottom related
  doc.querySelectorAll('.doclink').forEach((el) => el.remove())
  const subheader = doc.querySelector('.subheader')
  if (subheader && subheader.children.length) {
    const contents = doc.querySelector('.contents')
    const h2 = doc.createElement('h2')
    subheader.remove()
    h2.textContent = 'Related'
    contents.appendChild(h2)
    contents.appendChild(subheader)
  }

  // move superclasses to bottom related
  const superclasses = doc.querySelector('#superclasses')
  if (superclasses) {
    superclasses.remove()
    superclasses.innerHTML = 'Superclasses: ' + superclasses.innerHTML
    subheader.appendChild(superclasses)
  }

  // toggle loading
  setTimeout(() => loading.setAttribute('hidden', ''), 50)
  win.addEventListener('unload', () => {
    doc.querySelectorAll('.CodeMirror').forEach((el) => el.remove())
    loading.removeAttribute('hidden')
  })
  doc.addEventListener('keydown', onKeydown)

  // make codemirror adjust itself
  win.dispatchEvent(new Event('resize'))
}

function onMousedown (event) {
  if (event.target !== leftPane && event.target !== helpPane) return
  event.preventDefault()
  const body = document.body
  const targetPane = event.target
  const isColumn = targetPane === leftPane
  const total = isColumn ? body.offsetWidth : body.offsetHeight
  const flexGrow = 2 / total
  function resize (event) {
    const increase = flexGrow * (isColumn ? event.clientX : event.clientY)
    const decrease = total * flexGrow - increase
    const oppsitePane = isColumn ? rightPane : postPane
    targetPane.style.flexGrow = increase
    oppsitePane.style.flexGrow = decrease
  }
  iframe.style.pointerEvents = 'none'
  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', () => {
    iframe.style.pointerEvents = 'auto'
    window.removeEventListener('mousemove', resize)
  })
}

function onKeydown (event) {
  const { metaKey, shiftKey, key } = event
  if (metaKey && key === 'q') {
    if (!window.confirm('Are you sure?')) event.preventDefault()
  } else if (metaKey && key === 'b') {
    sclang.interpret('s.boot')
  } else if (metaKey && shiftKey && key === 's') {
    sclang.interpret('s.scope')
  } else if (metaKey && shiftKey && key === 'm') {
    sclang.interpret('s.meter')
  } else if (metaKey && shiftKey && key === 'p') {
    postPane.querySelector('ul').innerHTML = ''
  } else if (metaKey && key === 'o') {
    helpPane.toggleAttribute('hidden')
    rightPane.toggleAttribute('hidden', helpPane.hidden && postPane.hidden)
    postPane.classList.toggle('pane--full', helpPane.hidden && !postPane.hidden)
  } else if (metaKey && key === 'p') {
    postPane.toggleAttribute('hidden')
    rightPane.toggleAttribute('hidden', helpPane.hidden && postPane.hidden)
    postPane.classList.toggle('pane--full', helpPane.hidden && !postPane.hidden)
  }
}

function onClick (event) {
  const target = event.target
  if (target.tagName === 'BUTTON') {
    if (target.id === 'refresh') {
      iframe.contentWindow.location.reload(true)
    } else if (target.id === 'back') {
      iframe.contentWindow.history.back()
    } else if (target.id === 'forward') {
      iframe.contentWindow.history.forward()
    }
  }
}
