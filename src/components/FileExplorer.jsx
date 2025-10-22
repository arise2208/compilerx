import React from 'react'

export default function FileExplorer({ rootPath, files = [], onOpenFile, onRefresh }) {
  const [newName, setNewName] = React.useState('')
  const [contextMenu, setContextMenu] = React.useState({ visible: false, x: 0, y: 0, file: null })

  async function handleContextMenu(e, f) {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, file: f })
  }

  // click-away to close menu
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

  // Move to workspace root: rename to rootPath/<basename>
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

  return (
    <div className="p-2">
      <div className="mb-2 text-sm text-gray-300">Explorer</div>
      {!rootPath && <div className="text-gray-400">Open a folder to see files</div>}
      {rootPath && (
        <div>
          <div className="text-xs text-gray-400 mb-2">{rootPath}</div>
          <div className="flex gap-2 mb-2">
            <input className="flex-1 bg-gray-800 p-1 text-sm" placeholder="new-file.cpp" value={newName} onChange={e => setNewName(e.target.value)} />
            <button className="px-2 bg-green-600 rounded" onClick={createNew}>New</button>
          </div>
          <ul>
            {files.map(f => (
              <li key={f.path} className="py-1 flex items-center hover:bg-gray-800 rounded px-1" onContextMenu={(e) => handleContextMenu(e, f)}>
                <button className="flex-1 text-left" onClick={() => { if (!f.isDirectory) onOpenFile(f) }}>{f.name}</button>
              </li>
            ))}
          </ul>

          {contextMenu.visible && contextMenu.file && (
            <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 2000 }}>
              <div className="bg-gray-800 text-white rounded shadow-md py-1 w-48">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-700" onClick={() => doDelete(contextMenu.file)}>Delete</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-700" onClick={() => doMoveToWorkspace(contextMenu.file)}>Move to workspace</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
