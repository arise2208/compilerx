import React from 'react'

export default function StatusBar({ activeFile, theme, lineCount, compiledBinary }) {
  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
  const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  const fileName = activeFile ? activeFile.split('/').pop() : 'No file open'
  const fileExtension = activeFile ? activeFile.split('.').pop() : ''

  return (
    <div className={`flex items-center justify-between px-4 py-1 text-xs ${bgColor} ${textColor} border-t ${borderColor}`}>
      <div className="flex items-center gap-4">
        <div className="font-medium">{fileName}</div>
        {fileExtension && (
          <div className="flex items-center gap-1">
            <span>Language:</span>
            <span className="font-medium">{fileExtension === 'cpp' ? 'C++' : fileExtension}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {compiledBinary && (
          <div className="flex items-center gap-1">
            <span className="text-green-500">●</span>
            <span>Compiled</span>
          </div>
        )}
        {activeFile && (
          <div>{activeFile}</div>
        )}
      </div>
    </div>
  )
}
