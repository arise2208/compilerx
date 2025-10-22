import React, { useEffect, useState, useRef } from 'react'
import FileExplorer from './components/FileExplorer'
import EditorTabs from './components/EditorTabs'
import ConsolePanel from './components/ConsolePanel'
import TestPanel from './components/TestPanel'
import StatusBar from './components/StatusBar'
import TerminalPanel from './components/TerminalPanel'
import SettingsPanel from './components/SettingsPanel'
import CommandPalette from './components/CommandPalette'

export default function App() {
  const [rootDir, setRootDir] = useState(null)
  const [files, setFiles] = useState([])
  const [openTabs, setOpenTabs] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [consoleLines, setConsoleLines] = useState([])
  const [compiledBinary, setCompiledBinary] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [activePanel, setActivePanel] = useState('console')
  const [splitView, setSplitView] = useState(false)
  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    window.api.onFsChanged((e) => {
      if (rootDir) refreshFolder(rootDir)
    })

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

    let unsubRef = null
    unsubPromise.then(u => { unsubRef = u }).catch(() => {})
    return () => { if (unsubRef) unsubRef() }
  }, [rootDir])

  useEffect(() => {
    (async () => {
      try {
        const cwd = await window.api.getCwd()
        if (cwd) window.api.watchDebug(cwd)
      } catch (e) {}
    })()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function openFolder() {
    const p = await window.api.openFolder()
    if (!p) return
    setRootDir(p)
    window.api.watchFolder(p)
    try { window.api.watchDebug(p) } catch (e) { console.warn('watchDebug failed', e) }
    refreshFolder(p)
  }

  async function refreshFolder(p) {
    const list = await window.api.listDir(p)
    setFiles(list)
  }

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const headerBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white border-b border-gray-200'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  return (
    <div className={`h-screen flex flex-col ${bgColor} ${textColor}`}>
      <div className={`flex items-center justify-between px-4 py-2 ${headerBg} shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="font-semibold text-lg tracking-tight">CP IDE</div>
          <button
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            onClick={openFolder}
          >
            Open Folder
          </button>
          {rootDir && <div className="text-sm text-gray-500 ml-2">{rootDir}</div>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSplitView(!splitView)}
            className={`px-3 py-1.5 rounded-md transition-colors text-sm ${splitView ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            title="Toggle Split View"
          >
            Split
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`px-3 py-1.5 rounded-md transition-colors text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            title="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className={`px-3 py-1.5 rounded-md transition-colors text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            title="Settings (Ctrl/Cmd+,)"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-64 ${borderColor} border-r`}>
          <FileExplorer
            rootPath={rootDir}
            files={files}
            onOpenFile={(f) => {
              setOpenTabs(t => {
                if (t.find(x => x.path === f.path)) return t
                return [...t, { path: f.path, name: f.name }]
              })
              setActiveFile(f.path)
            }}
            onRefresh={() => refreshFolder(rootDir)}
            theme={theme}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <EditorTabs
            tabs={openTabs}
            onSetConsole={setConsoleLines}
            onCompiled={setCompiledBinary}
            setActiveFile={setActiveFile}
            activeFile={activeFile}
            theme={theme}
            splitView={splitView}
            fontSize={fontSize}
            onCloseTab={(path) => {
              setOpenTabs(t => t.filter(x => x.path !== path))
              if (activeFile === path) {
                const remaining = openTabs.filter(x => x.path !== path)
                setActiveFile(remaining.length > 0 ? remaining[0].path : null)
              }
            }}
          />

          <div className={`h-64 ${borderColor} border-t`}>
            <div className="flex h-full">
              <div className="flex-1 flex flex-col">
                <div className={`flex ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} border-b ${borderColor}`}>
                  <button
                    onClick={() => setActivePanel('console')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activePanel === 'console'
                        ? theme === 'dark' ? 'bg-gray-900 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                        : theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Console
                  </button>
                  <button
                    onClick={() => setActivePanel('terminal')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activePanel === 'terminal'
                        ? theme === 'dark' ? 'bg-gray-900 text-white border-b-2 border-blue-500' : 'bg-white text-gray-900 border-b-2 border-blue-500'
                        : theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Terminal
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {activePanel === 'console' && <ConsolePanel lines={consoleLines} theme={theme} />}
                  {activePanel === 'terminal' && <TerminalPanel theme={theme} rootDir={rootDir} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`w-96 ${borderColor} border-l`}>
          <TestPanel
            compiledBinary={compiledBinary}
            setConsole={(lines) => setConsoleLines(lines)}
            activeFile={activeFile}
            theme={theme}
          />
        </div>
      </div>

      <StatusBar
        activeFile={activeFile}
        theme={theme}
        lineCount={openTabs.find(t => t.path === activeFile)?.lineCount || 0}
        compiledBinary={compiledBinary}
      />

      {showSettings && (
        <SettingsPanel
          theme={theme}
          fontSize={fontSize}
          onThemeChange={setTheme}
          onFontSizeChange={setFontSize}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onCommand={(cmd) => {
            if (cmd === 'openFolder') openFolder()
            if (cmd === 'toggleTheme') setTheme(theme === 'dark' ? 'light' : 'dark')
            if (cmd === 'toggleSplit') setSplitView(!splitView)
            if (cmd === 'settings') setShowSettings(true)
            setShowCommandPalette(false)
          }}
          theme={theme}
        />
      )}
    </div>
  )
}
