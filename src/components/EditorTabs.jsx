import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

export default function EditorTabs({ tabs = [], onSetConsole, onCompiled }) {
  // optional setter to inform parent which file is active
  const setActiveFile = arguments[0].setActiveFile
  const [active, setActive] = useState(tabs[0]?.path)
  const [contents, setContents] = useState({})
  const editorRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => { if (tabs.length && !active) setActive(tabs[0].path) }, [tabs])

  useEffect(() => {
    // load content for new tabs
    tabs.forEach(async t => {
      if (contents[t.path]) return
      const c = await window.api.readFile(t.path)
      setContents(s => ({ ...s, [t.path]: c }))
    })
  }, [tabs])

  // Auto-save: debounce writes to disk after edits
  useEffect(() => {
    if (!active) return
    // clear existing timer
    if (saveTimer.current) clearTimeout(saveTimer.current)
    // schedule save for this active content
    const timer = setTimeout(() => {
      if (contents[active] !== undefined) {
        window.api.writeFile(active, contents[active])
      }
    }, 800) // 800ms debounce
    saveTimer.current = timer
    return () => { clearTimeout(timer); saveTimer.current = null }
  }, [contents, active])

  function handleSave() {
    if (!active) return
    window.api.writeFile(active, contents[active])
  }

  async function handleCompile() {
    if (!active) return
    // ensure current buffer is saved
    if (contents[active] !== undefined) await window.api.writeFile(active, contents[active])
    onSetConsole(['Compiling...'])
    const res = await window.api.compileFile(active)
    if (res.success) {
      onSetConsole(['Compiled successfully: ' + res.binaryPath])
      onCompiled(res.binaryPath)
    } else {
      onSetConsole(res.errors.map(e => e.message))
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); handleCompile() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault();
        // Compile then trigger run-all-tests event if successful
        (async () => {
          // ensure current buffer is saved before compiling
          if (contents[active] !== undefined) await window.api.writeFile(active, contents[active])
          const res = await window.api.compileFile(active)
          if (res && res.success) {
            onSetConsole([`Compiled: ${res.binaryPath}`])
            onCompiled(res.binaryPath)
            // dispatch a global event to run all tests with this binary
            try { window.dispatchEvent(new CustomEvent('cpide:runAllTests', { detail: { binaryPath: res.binaryPath } })) } catch (e) {}
          } else if (res && res.errors) {
            onSetConsole(res.errors.map(e => e.message))
          }
        })()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, contents])

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex bg-gray-800 text-sm">
        {tabs.map(t => (
          <div key={t.path} className={`px-3 py-2 cursor-pointer ${t.path===active? 'bg-gray-700':''}`} onClick={() => { setActive(t.path); setActiveFile && setActiveFile(t.path) }}>
            {t.name}
          </div>
        ))}
      </div>
      <div className="flex-1">
        {active && (
          <Editor
            height="100%"
            defaultLanguage="cpp"
            value={contents[active]}
            onMount={(editor) => { editorRef.current = editor }}
            onChange={(v) => setContents(s => ({ ...s, [active]: v }))}
            options={{ automaticLayout: true, minimap: { enabled: false } }}
          />
        )}
      </div>
      {/* Autosave always on. Save/Compile buttons removed per user preference. Keyboard shortcuts still work. */}
    </div>
  )
}
