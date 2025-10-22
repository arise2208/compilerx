import React, { useState, useEffect, useRef } from 'react'

export default function TerminalPanel({ theme, rootDir }) {
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef(null)
  const outputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  async function runCommand() {
    if (!command.trim()) return

    const newHistory = [...history, command]
    setHistory(newHistory)
    setHistoryIndex(-1)

    setOutput(prev => [...prev, { type: 'input', text: `$ ${command}` }])

    try {
      const result = await window.api.runCommand(command, rootDir)
      if (result.stdout) {
        setOutput(prev => [...prev, { type: 'output', text: result.stdout }])
      }
      if (result.stderr) {
        setOutput(prev => [...prev, { type: 'error', text: result.stderr }])
      }
    } catch (err) {
      setOutput(prev => [...prev, { type: 'error', text: err.message || 'Command failed' }])
    }

    setCommand('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      runCommand()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setCommand(history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= history.length) {
          setHistoryIndex(-1)
          setCommand('')
        } else {
          setHistoryIndex(newIndex)
          setCommand(history[newIndex])
        }
      }
    }
  }

  const bgColor = theme === 'dark' ? 'bg-black' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-green-300' : 'text-gray-800'
  const inputBg = theme === 'dark' ? 'bg-gray-900' : 'bg-white'

  return (
    <div className={`h-full flex flex-col ${bgColor} ${textColor}`}>
      <div ref={outputRef} className="flex-1 p-2 overflow-auto font-mono text-sm">
        {output.length === 0 && (
          <div className="text-gray-500">Terminal ready. Type commands and press Enter.</div>
        )}
        {output.map((line, i) => (
          <div
            key={i}
            className={
              line.type === 'input'
                ? 'text-blue-400 font-semibold'
                : line.type === 'error'
                ? 'text-red-400'
                : ''
            }
          >
            {line.text}
          </div>
        ))}
      </div>
      <div className={`flex items-center gap-2 p-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <span className="text-blue-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 ${inputBg} ${textColor} outline-none font-mono text-sm px-2 py-1`}
          placeholder="Enter command..."
          autoFocus
        />
      </div>
    </div>
  )
}
