import React, { useState, useEffect, useRef } from 'react'

export default function CommandPalette({ onClose, onCommand, theme }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  const commands = [
    { id: 'openFolder', name: 'Open Folder', description: 'Open a folder to start working' },
    { id: 'toggleTheme', name: 'Toggle Theme', description: 'Switch between dark and light theme' },
    { id: 'toggleSplit', name: 'Toggle Split View', description: 'Enable or disable split editor' },
    { id: 'settings', name: 'Open Settings', description: 'Configure IDE settings' },
  ]

  const filtered = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (s + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => (s - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selected]) {
        onCommand(filtered[selected].id)
      }
    }
  }

  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const overlayBg = theme === 'dark' ? 'bg-black/50' : 'bg-gray-900/20'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
  const hoverBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'

  return (
    <div className={`fixed inset-0 ${overlayBg} flex items-start justify-center pt-32 z-50`} onClick={onClose}>
      <div
        className={`${bgColor} ${textColor} rounded-lg shadow-2xl w-[600px] border ${borderColor} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelected(0)
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-3 ${bgColor} ${textColor} outline-none border-b ${borderColor}`}
          placeholder="Type a command..."
        />
        <div className="max-h-96 overflow-auto">
          {filtered.length === 0 && (
            <div className="p-4 text-center text-gray-500">No commands found</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => onCommand(cmd.id)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                i === selected ? hoverBg : ''
              } ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <div className="font-medium">{cmd.name}</div>
              <div className="text-sm text-gray-500">{cmd.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
