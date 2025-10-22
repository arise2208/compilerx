import React from 'react'

export default function ConsolePanel({ lines = [] }) {
  return (
    <div className="h-full p-2 bg-black text-green-300 overflow-auto font-mono text-sm">
      {lines.map((l,i) => <div key={i}>{l}</div>)}
    </div>
  )
}
