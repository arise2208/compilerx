import React, { useState } from 'react'

export default function TestPanel({ compiledBinary, setConsole, activeFile, theme }) {
  const [cases, setCases] = useState([{ input: '', expected: '' }])
  const [results, setResults] = useState([])
  // debug feature removed
  const saveTimer = React.useRef(null)
  const [collapsed, setCollapsed] = React.useState([])

  // helper to compute cases dir for current active file
  function casesDir() {
    if (!activeFile) return null
    // strip the final segment after last slash/backslash
    const sepIndex = Math.max(activeFile.lastIndexOf('/'), activeFile.lastIndexOf('\\'))
    const dir = sepIndex === -1 ? '.' : activeFile.slice(0, sepIndex)
    return `${dir}/cases`
  }

  // compute cases JSON path (cases/<basename>.cases.json)
  function casesJsonPath() {
    if (!activeFile) return null
    const sepIndex = Math.max(activeFile.lastIndexOf('/'), activeFile.lastIndexOf('\\'))
    const baseAndExt = sepIndex === -1 ? activeFile : activeFile.slice(sepIndex+1)
    const dot = baseAndExt.lastIndexOf('.')
    const basename = dot === -1 ? baseAndExt : baseAndExt.slice(0, dot)
    return `${casesDir()}/${basename}.cases.json`
  }

  function basenameFromActive() {
    if (!activeFile) return 'unknown'
    const sepIndex = Math.max(activeFile.lastIndexOf('/'), activeFile.lastIndexOf('\\'))
    const baseAndExt = sepIndex === -1 ? activeFile : activeFile.slice(sepIndex+1)
    const dot = baseAndExt.lastIndexOf('.')
    return dot === -1 ? baseAndExt : baseAndExt.slice(0, dot)
  }

  async function saveCasesToDisk() {
    const dir = casesDir()
    const jsonPath = casesJsonPath()
    if (!dir || !jsonPath) return setConsole(['No active file to save cases for'])
    await window.api.mkdir(dir)
    // write single JSON file containing all cases
    const payload = JSON.stringify({ cases }, null, 2)
    await window.api.createFile(jsonPath, payload)
    setConsole([`Saved ${cases.length} cases to ${jsonPath}`])
  }

  async function loadCasesFromDisk() {
    const dir = casesDir()
    const jsonPath = casesJsonPath()
    if (!dir || !jsonPath) return setConsole(['No active file to load cases for'])
    const existsJson = await window.api.exists(jsonPath)
    if (existsJson) {
      try {
        const txt = await window.api.readFile(jsonPath)
        const parsed = JSON.parse(txt)
        if (Array.isArray(parsed.cases)) {
          setCases(parsed.cases)
          setConsole([`Loaded ${parsed.cases.length} cases from ${jsonPath}`])
          return
        }
      } catch (e) {
        setConsole([`Error reading ${jsonPath}: ${e.message || e}`])
      }
    }

    // Fallback: support legacy per-file scheme (test_N.input / test_N.expected)
    const existsDir = await window.api.exists(dir)
    if (!existsDir) return setConsole([`No testcases found for ${activeFile}`])
    const entries = await window.api.listDir(dir)
    const inputs = entries.filter(e => e.name.endsWith('.input')).sort((a,b)=>a.name.localeCompare(b.name))
    const newCases = []
    for (const inE of inputs) {
      const base = inE.name.replace(/\.input$/, '')
      const inP = `${dir}/${inE.name}`
      const exP = `${dir}/${base}.expected`
      const input = await window.api.readFile(inP)
      let expected = ''
      try { expected = await window.api.readFile(exP) } catch (e) { expected = '' }
      newCases.push({ input, expected })
    }
    if (newCases.length) {
      setCases(newCases)
      setConsole([`Loaded ${newCases.length} legacy cases from ${dir}`])
    } else {
      setConsole([`No testcases found in ${dir}`])
    }
  }

  async function deleteCaseOnDisk(idx) {
    const dir = casesDir()
    const jsonPath = casesJsonPath()
    if (!dir || !jsonPath) return setConsole(['No active file'])
    // remove from in-memory cases and persist
    setCases(cs => {
      const copy = [...cs]
      copy.splice(idx, 1)
      // persist after state updates handled by useEffect autosave
      return copy
    })
    setConsole([`Deleted case ${idx+1}`])
  }

  async function saveDebugFile(dbgArr) {
    const dir = casesDir()
    if (!dir) return
  // no-op: debug saving removed
  }

  // Auto-load cases when active file changes
  React.useEffect(() => {
    if (!activeFile) return
    loadCasesFromDisk()
    // clear results when switching files
    setResults([])
  }, [activeFile])

  // Auto-save cases to disk when `cases` changes (debounced)
  React.useEffect(() => {
    const dir = casesDir()
    if (!dir) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCasesToDisk().catch(err => setConsole([`Error saving cases: ${err.message || err}`]))
    }, 600)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [cases, activeFile])

  // Ensure collapsed[] matches cases length (default: expanded = false)
  React.useEffect(() => {
    setCollapsed(prev => {
      const next = Array.from({ length: cases.length }, (_, i) => (prev && prev[i]) ? prev[i] : false)
      return next
    })
  }, [cases.length])

  // keep debugData and showDebug arrays aligned with cases length
  // debug arrays removed

  function addCase() { setCases(c => [...c, { input: '', expected: '' }]) }

  // simple line-by-line diff: returns array of { type: 'same'|'added'|'removed', line }
  function diffLines(expected, actual) {
    const a = expected.split('\n')
    const b = actual.split('\n')
    const n = Math.max(a.length, b.length)
    const out = []
    for (let i = 0; i < n; i++) {
      const ea = a[i] ?? ''
      const ba = b[i] ?? ''
      if (ea === ba) out.push({ type: 'same', line: ea })
      else {
        if (ea !== '') out.push({ type: 'removed', line: ea })
        if (ba !== '') out.push({ type: 'added', line: ba })
      }
    }
    return out
  }

  async function runCase(idx) {
    if (!compiledBinary) return setConsole(['No binary compiled'])
    const c = cases[idx]
    setConsole([`Running case ${idx+1}...`])
    // run binary with cwd set to cases dir, so program's debug.txt will be created there
    const dir = casesDir()
    const res = await window.api.runBinary(compiledBinary, c.input, dir)
    // read debug.txt directly from the cases folder
    // debug reading removed
    const ok = res.stdout.trim() === c.expected.trim() && !res.timedOut && !res.stderr
    const diff = ok ? [] : diffLines(c.expected.trim(), res.stdout.trim())
    setResults(r => { const copy = [...r]; copy[idx] = { stdout: res.stdout, stderr: res.stderr, timedOut: res.timedOut, ok, diff }; return copy })
  // auto-collapse if passed
  setCollapsed(c => { const copy = [...(c||[])]; copy[idx] = ok ? true : false; return copy })
    // also append summary to console
    setConsole(prev => [...(Array.isArray(prev)?prev:[]), `${ok? '✅':'❌'} Case ${idx+1}: ${ok ? 'OK' : 'FAIL'}`])
  }

  async function runAll() {
    if (!compiledBinary) return setConsole(['No binary compiled'])
    setConsole(['Running tests...'])
    const newResults = []
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i]
      const dir = casesDir()
      const res = await window.api.runBinary(compiledBinary, c.input, dir)
      // read debug.txt from cases folder after each run
      // debug reading removed
      const ok = res.stdout.trim() === c.expected.trim() && !res.timedOut && !res.stderr
      const diff = ok ? [] : diffLines(c.expected.trim(), res.stdout.trim())
      newResults.push({ stdout: res.stdout, stderr: res.stderr, timedOut: res.timedOut, ok, diff })
    }
    setResults(newResults)
    // auto-collapse passed cases
    setCollapsed(newResults.map(r => !!r.ok))
    const summary = newResults.map((r, i) => `${r.ok? '✅':'❌'} Case ${i+1}: ${r.ok ? 'OK' : 'FAIL'}`)
    setConsole(summary)
  }

  // Listen for global run-all-tests event (fired by EditorTabs when user presses Ctrl/Cmd+B)
  React.useEffect(() => {
    const handler = async (e) => {
      const bin = e.detail && e.detail.binaryPath
      if (!bin) return
      // temporarily set compiledBinary to this binary and run
      const prev = compiledBinary
      try {
        // run all using provided binary
        setConsole([`Running tests using ${bin}...`])
        const newResults = []
        for (let i = 0; i < cases.length; i++) {
          const c = cases[i]
          const res = await window.api.runBinary(bin, c.input)
          const ok = res.stdout.trim() === c.expected.trim() && !res.timedOut && !res.stderr
          const diff = ok ? [] : diffLines(c.expected.trim(), res.stdout.trim())
          newResults.push({ stdout: res.stdout, stderr: res.stderr, timedOut: res.timedOut, ok, diff })
        }
        setResults(newResults)
        const summary = newResults.map((r, i) => `${r.ok? '✅':'❌'} Case ${i+1}: ${r.ok ? 'OK' : 'FAIL'}`)
        setConsole(summary)
      } finally {
        // noop
      }
    }
    window.addEventListener('cpide:runAllTests', handler)
    return () => window.removeEventListener('cpide:runAllTests', handler)
  }, [cases, compiledBinary, setConsole])

  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
  const cardBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
  const inputBg = theme === 'dark' ? 'bg-black' : 'bg-gray-50'
  const inputText = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'

  return (
    <div className={`p-3 ${bgColor}`}>
      <div className={`mb-3 text-sm font-semibold ${textColor}`}>Test Cases</div>
      <div className="space-y-2 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {cases.map((c, i) => (
          <div key={i} className={`p-3 ${cardBg} rounded-lg border ${borderColor} transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`text-xs font-semibold ${textColor}`}>Case {i+1}</div>
                {results[i] && results[i].ok && <div className="text-green-400 text-xs font-medium">✅ PASS</div>}
                {results[i] && !results[i].ok && <div className="text-red-400 text-xs font-medium">❌ FAIL</div>}
              </div>
              <div className="flex gap-2 items-center">
                <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors" onClick={() => runCase(i)}>Run</button>
                <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors" onClick={() => { deleteCaseOnDisk(i); setCases(cs=> { const copy=[...cs]; copy.splice(i,1); return copy }) }}>Delete</button>
                <button className={`px-2 py-1 rounded text-xs transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} ${textColor}`} onClick={() => setCollapsed(s => { const copy = [...(s||[])]; copy[i] = !copy[i]; return copy })}>{collapsed[i] ? '▼' : '▲'}</button>
              </div>
            </div>

            <div className={collapsed[i] ? 'hidden' : ''}>
              <div className={`mt-2 text-xs font-medium ${textColor}`}>Input</div>
              <textarea className={`w-full h-20 ${inputBg} ${inputText} p-2 mt-1 rounded border ${borderColor} font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`} value={c.input} onChange={e=> { const v=e.target.value; setCases(cs => { const copy=[...cs]; copy[i].input=v; return copy }) }} placeholder="input"></textarea>

              <div className={`mt-2 text-xs font-medium ${textColor}`}>Expected Output</div>
              <textarea className={`w-full h-20 ${inputBg} ${inputText} p-2 mt-1 rounded border ${borderColor} font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`} value={c.expected} onChange={e=> { const v=e.target.value; setCases(cs => { const copy=[...cs]; copy[i].expected=v; return copy }) }} placeholder="expected output"></textarea>

              {results[i] && (
                <>
                  <div className={`mt-2 text-xs font-medium ${textColor}`}>Actual Output</div>
                  <textarea className={`w-full h-20 ${inputBg} ${inputText} p-2 mt-1 rounded border ${borderColor} font-mono text-xs`} value={(results[i] && results[i].stdout) || ''} readOnly></textarea>

                  <div className="mt-2 text-sm">
                    <div className="space-y-1">
                      <div>{results[i].ok ? <span className="text-green-400">✅ PASS</span> : <span className="text-red-400">❌ FAIL</span>}</div>
                      {results[i].stderr && <div className="text-yellow-400">stderr: {results[i].stderr}</div>}
                      {results[i].timedOut && <div className="text-yellow-400">Timed out</div>}
                      {!results[i].ok && results[i].diff && results[i].diff.length > 0 && (
                        <div className={`mt-2 font-mono text-xs ${inputBg} p-2 rounded border ${borderColor}`}>
                          {results[i].diff.map((d, k) => (
                            <div key={k} className={d.type==='same'? 'text-gray-400' : d.type==='added' ? 'text-green-400' : 'text-red-400'}>
                              {d.type === 'same' ? '  ' : d.type === 'added' ? '+ ' : '- '}{d.line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium" onClick={addCase}>Add Case</button>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium" onClick={runAll}>Run All</button>
      </div>
    </div>
  )
}
