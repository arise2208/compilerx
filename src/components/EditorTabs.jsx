import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'

export default function EditorTabs({ tabs = [], onSetConsole, onCompiled, setActiveFile, activeFile, theme, splitView, fontSize, onCloseTab }) {
  const [contents, setContents] = useState({})
  const [secondaryFile, setSecondaryFile] = useState(null)
  const editorRef = useRef(null)
  const secondaryEditorRef = useRef(null)
  const saveTimer = useRef(null)

  const active = activeFile || tabs[0]?.path

  useEffect(() => {
    tabs.forEach(async t => {
      if (contents[t.path]) return
      const c = await window.api.readFile(t.path)
      setContents(s => ({ ...s, [t.path]: c }))
    })
  }, [tabs])

  useEffect(() => {
    if (!active) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const timer = setTimeout(() => {
      if (contents[active] !== undefined) {
        window.api.writeFile(active, contents[active])
      }
    }, 800)
    saveTimer.current = timer
    return () => { clearTimeout(timer); saveTimer.current = null }
  }, [contents, active])

  function handleSave() {
    if (!active) return
    window.api.writeFile(active, contents[active])
  }

  async function handleCompile() {
    if (!active) return
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        (async () => {
          if (contents[active] !== undefined) await window.api.writeFile(active, contents[active])
          const res = await window.api.compileFile(active)
          if (res && res.success) {
            onSetConsole([`Compiled: ${res.binaryPath}`])
            onCompiled(res.binaryPath)
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

  const tabBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
  const activeTabBg = theme === 'dark' ? 'bg-gray-900' : 'bg-white'
  const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-300'
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const activeTextColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  return (
    <div className="flex-1 flex flex-col">
      <div className={`flex ${tabBg} text-sm overflow-x-auto border-b ${borderColor}`}>
        {tabs.map(t => (
          <div
            key={t.path}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer ${hoverBg} transition-colors border-r ${borderColor} ${
              t.path === active ? `${activeTabBg} ${activeTextColor}` : textColor
            }`}
          >
            <button
              className="flex-1 text-left"
              onClick={() => { setActiveFile(t.path) }}
            >
              {t.name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(t.path)
              }}
              className={`px-1 rounded ${hoverBg} text-xs`}
            >
              ✕
            </button>
          </div>
        ))}
        {tabs.length > 0 && (
          <div className="flex items-center gap-2 px-3 ml-auto">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-xs"
              title="Save (Ctrl/Cmd+S)"
            >
              Save
            </button>
            <button
              onClick={handleCompile}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs"
              title="Compile (Ctrl/Cmd+R)"
            >
              Compile
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        <div className={splitView ? 'flex-1' : 'w-full'}>
          {active && (
            <Editor
              height="100%"
              defaultLanguage="cpp"
              value={contents[active]}
              onMount={(editor) => { editorRef.current = editor }}
              onChange={(v) => setContents(s => ({ ...s, [active]: v }))}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                automaticLayout: true,
                minimap: { enabled: true },
                fontSize: fontSize,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineNumbers: 'on',
                rulers: [80, 120],
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
              }}
            />
          )}
        </div>

        {splitView && (
          <>
            <div className={`w-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'} cursor-col-resize`} />
            <div className="flex-1">
              <div className={`flex items-center justify-between px-3 py-1 text-xs ${tabBg} border-b ${borderColor}`}>
                <select
                  value={secondaryFile || ''}
                  onChange={(e) => setSecondaryFile(e.target.value)}
                  className={`flex-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} ${textColor} px-2 py-1 rounded`}
                >
                  <option value="">Select file...</option>
                  {tabs.map(t => (
                    <option key={t.path} value={t.path}>{t.name}</option>
                  ))}
                </select>
              </div>
              {secondaryFile && (
                <Editor
                  height="100%"
                  defaultLanguage="cpp"
                  value={contents[secondaryFile]}
                  onMount={(editor) => { secondaryEditorRef.current = editor }}
                  onChange={(v) => setContents(s => ({ ...s, [secondaryFile]: v }))}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    automaticLayout: true,
                    minimap: { enabled: true },
                    fontSize: fontSize,
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
