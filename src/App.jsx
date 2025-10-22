import React, { useEffect, useState, useRef } from 'react'
import FileExplorer from './components/FileExplorer'
import EditorTabs from './components/EditorTabs'
import ConsolePanel from './components/ConsolePanel'
import TestPanel from './components/TestPanel'

export default function App() {
  const [rootDir, setRootDir] = useState(null)
  const [files, setFiles] = useState([])
  const [openTabs, setOpenTabs] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [consoleLines, setConsoleLines] = useState([])
  const [compiledBinary, setCompiledBinary] = useState(null)

  useEffect(() => {
    // Listen for FS changes
    window.api.onFsChanged((e) => {
      // simple refresh for now
      if (rootDir) refreshFolder(rootDir)
    })

    // subscribe to debug appends; onDebugAppend returns an unsubscribe function
    const unsubPromise = (async () => {
      const unsub = window.api.onDebugAppend((data) => {
        if (!data || !data.text) return
        setConsoleLines(prev => {
          const existing = Array.isArray(prev) ? prev : []
          const newLines = data.text.replace(/\r/g, '').split('\n')
          const toAdd = newLines.filter((l, i) => !(l === '' && i === newLines.length - 1))
          return [...existing, ...toAdd]
        })
      })
      return unsub
    })()

    // cleanup
    let unsubRef = null
    unsubPromise.then(u => { unsubRef = u }).catch(() => {})
    return () => { if (unsubRef) unsubRef() }
  }, [rootDir])

  // On mount (dev mode), try to watch cwd/debug.txt automatically so you see debug output
  useEffect(() => {
    (async () => {
      try {
        const cwd = await window.api.getCwd()
        if (cwd) window.api.watchDebug(cwd)
      } catch (e) {}
    })()
  }, [])

  async function openFolder() {
    const p = await window.api.openFolder()
    if (!p) return
    setRootDir(p)
    window.api.watchFolder(p)
    // start watching debug.txt in the opened folder so C++ debug() writes are visible
    try { window.api.watchDebug(p) } catch (e) { console.warn('watchDebug failed', e) }
    refreshFolder(p)
  }

  async function refreshFolder(p) {
    const list = await window.api.listDir(p)
    // main.js already returns full path for each entry as `path`
    setFiles(list)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div className="flex items-center p-2 bg-gray-800">
        <button className="px-3 py-1 bg-indigo-600 rounded" onClick={openFolder}>Open Folder</button>
        <div className="ml-4">{rootDir}</div>
      </div>
      <div className="flex flex-1">
        <div className="w-64 border-r border-gray-700">
          <FileExplorer rootPath={rootDir} files={files} onOpenFile={(f) => {
            setOpenTabs(t => {
              if (t.find(x => x.path === f.path)) return t
              return [...t, { path: f.path, name: f.name }]
            })
          }} onRefresh={() => refreshFolder(rootDir)} />
        </div>
        <div className="flex-1 flex flex-col">
          <EditorTabs tabs={openTabs} onSetConsole={setConsoleLines} onCompiled={setCompiledBinary} setActiveFile={setActiveFile} />
          <div className="h-40 border-t border-gray-700">
            <ConsolePanel lines={consoleLines} />
          </div>
        </div>
          <div className="w-96 border-l border-gray-700">
          <TestPanel compiledBinary={compiledBinary} setConsole={(lines) => setConsoleLines(lines)} activeFile={activeFile} />
        </div>
      </div>
    </div>
  )
}
