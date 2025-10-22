import React, { useState } from 'react'

export default function FileExplorer({ rootPath, files = [], onOpenFile, onRefresh, theme }) {
  const [newName, setNewName] = useState('')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, file: null })
  const [searchTerm, setSearchTerm] = useState('')

  async function handleContextMenu(e, f) {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file: f })
  }

  React.useEffect(() => {
    function onClick() { setContextMenu(c => c.visible ? { ...c, visible: false } : c) }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  async function doDelete(f) {
    if (!f) return
    const kind = f.isDirectory ? 'folder' : 'file'
    const ok = window.confirm(`Delete ${kind} "${f.name}"? This cannot be undone.`)
    if (!ok) return
    try {
      await window.api.deletePath(f.path)
      onRefresh && onRefresh()
    } catch (err) {
      alert(`Failed to delete ${f.name}: ${err && err.message ? err.message : err}`)
    } finally {
      setContextMenu(c => ({ ...c, visible: false }))
    }
  }

  async function doMoveToWorkspace(f) {
    if (!f || !rootPath) return alert('No workspace open')
    const sepIndex = Math.max(f.path.lastIndexOf('/'), f.path.lastIndexOf('\\'))
    const base = sepIndex === -1 ? f.path : f.path.slice(sepIndex + 1)
    const dest = `${rootPath}/${base}`
    if (dest === f.path) {
      setContextMenu(c => ({ ...c, visible: false }))
      return alert('Item is already in the workspace root')
    }
    try {
      const exists = await window.api.exists(dest)
      if (exists) return alert(`Destination already exists: ${dest}`)
      await window.api.renamePath(f.path, dest)
      onRefresh && onRefresh()
    } catch (err) {
      alert(`Failed to move ${f.name}: ${err && err.message ? err.message : err}`)
    } finally {
      setContextMenu(c => ({ ...c, visible: false }))
    }
  }

  async function createNew() {
    if (!newName || !rootPath) return
    const p = `${rootPath}/${newName}`
    await window.api.createFile(p, '')
    setNewName('')
    onRefresh && onRefresh()
  }

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const hoverBg = theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
  const inputBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  return (
    <div className={`p-3 h-full ${bgColor}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`text-sm font-semibold ${textColor}`}>Explorer</div>
        {rootPath && (
          <button
            onClick={onRefresh}
            className={`px-2 py-1 text-xs rounded ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
            title="Refresh"
          >
            ↻
          </button>
        )}
      </div>

      {!rootPath && (
        <div className="text-gray-500 text-sm">Open a folder to see files</div>
      )}

      {rootPath && (
        <div className="space-y-3">
          <input
            className={`w-full ${inputBg} ${textColor} p-2 text-xs rounded border ${borderColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Search files..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2">
            <input
              className={`flex-1 ${inputBg} ${textColor} p-2 text-xs rounded border ${borderColor} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="new-file.cpp"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNew()}
            />
            <button
              className="px-3 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs"
              onClick={createNew}
            >
              New
            </button>
          </div>

          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <ul className="space-y-1">
              {filteredFiles.map(f => (
                <li
                  key={f.path}
                  className={`py-2 px-2 flex items-center ${hoverBg} rounded cursor-pointer transition-colors`}
                  onContextMenu={(e) => handleContextMenu(e, f)}
                  onClick={() => { if (!f.isDirectory) onOpenFile(f) }}
                >
                  <span className="mr-2 text-sm">
                    {f.isDirectory ? '📁' : '📄'}
                  </span>
                  <span className={`flex-1 text-sm ${textColor}`}>{f.name}</span>
                  {f.name.endsWith('.cpp') && (
                    <span className="text-xs text-blue-500">C++</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {contextMenu.visible && contextMenu.file && (
            <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 2000 }}>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${textColor} rounded shadow-lg py-1 w-48 border ${borderColor}`}>
                <button
                  className={`w-full text-left px-4 py-2 text-sm ${hoverBg} transition-colors`}
                  onClick={() => doDelete(contextMenu.file)}
                >
                  Delete
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm ${hoverBg} transition-colors`}
                  onClick={() => doMoveToWorkspace(contextMenu.file)}
                >
                  Move to workspace
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
