import React, { useEffect, useRef } from 'react'

export default function ConsolePanel({ lines = [], theme }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const bgColor = theme === 'dark' ? 'bg-black' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-green-300' : 'text-gray-800'

  return (
    <div className={`h-full p-3 ${bgColor} ${textColor} overflow-auto font-mono text-sm`}>
      {lines.length === 0 && (
        <div className="text-gray-500">Console output will appear here...</div>
      )}
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.includes('✅') || l.includes('PASS')
              ? 'text-green-400'
              : l.includes('❌') || l.includes('FAIL') || l.includes('error')
              ? 'text-red-400'
              : l.includes('warning')
              ? 'text-yellow-400'
              : ''
          }
        >
          {l}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
