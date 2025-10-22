import React from 'react'

export default function SettingsPanel({ theme, fontSize, onThemeChange, onFontSizeChange, onClose }) {
  const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const overlayBg = theme === 'dark' ? 'bg-black/50' : 'bg-gray-900/20'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  return (
    <div className={`fixed inset-0 ${overlayBg} flex items-center justify-center z-50`} onClick={onClose}>
      <div
        className={`${bgColor} ${textColor} rounded-lg shadow-2xl p-6 w-96 border ${borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className={`px-3 py-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => onThemeChange('dark')}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => onThemeChange('light')}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white'
                    : theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10px</span>
              <span>24px</span>
            </div>
          </div>

          <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Command Palette</span>
                <span className="font-mono">Ctrl/Cmd + K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settings</span>
                <span className="font-mono">Ctrl/Cmd + ,</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Save File</span>
                <span className="font-mono">Ctrl/Cmd + S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Compile</span>
                <span className="font-mono">Ctrl/Cmd + R</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Compile & Run Tests</span>
                <span className="font-mono">Ctrl/Cmd + B</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
