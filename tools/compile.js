const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const cacheDir = path.join(__dirname, '..', '.cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(content).digest('hex');
}

function compileSource(srcPath) {
  return new Promise((resolve, reject) => {
    const hash = hashFile(srcPath);
    const binName = `bin-${path.basename(srcPath, path.extname(srcPath))}-${hash}`;
    const binPath = path.join(cacheDir, binName);

    if (fs.existsSync(binPath)) {
      return resolve({ success: true, errors: [], binaryPath: binPath });
    }
    // choose a compiler available on the system
    const preferred = process.env.CP_COMPILER; // allow overriding, e.g. CP_COMPILER=g++-13
    const candidates = preferred ? [preferred, 'g++-13', 'g++', 'clang++'] : ['g++-13', 'g++', 'clang++'];
    let compiler = null;
    for (const c of candidates) {
      try { execSync(`which ${c}`, { stdio: 'ignore' }); compiler = c; break } catch (e) {}
    }
    if (!compiler) return reject(new Error('No C++ compiler found (g++ or clang++ required). Set CP_COMPILER to the compiler path to force one.'))

    const args = ['-std=gnu++20', srcPath, '-O2', '-o', binPath];
    const g = spawn(compiler, args);
    let stderr = '';
    g.stderr.on('data', d => stderr += d.toString());
    g.on('close', code => {
      if (code === 0) {
        resolve({ success: true, errors: [], binaryPath: binPath });
      } else {
        // parse stderr into simple errors and add helpful hints for mac/arm issues
        const lines = stderr.split('\n').filter(Boolean).map(l => ({ message: l }));
        const stderrLower = stderr.toLowerCase();
        if (stderrLower.includes('ld: symbol(s) not found for architecture') || stderrLower.includes('undefined symbols for architecture')) {
          // linker error: could be missing main or object file architecture mismatch
          lines.unshift({ message: 'Linker error: undefined symbols for architecture. Common causes: missing `int main(...)` in source, mixing object files compiled for different architectures (e.g. x86_64 vs arm64), or using libraries built for another architecture.' });
          if (process.platform === 'darwin') {
            lines.unshift({ message: `On macOS ARM (M1/M2), try using the system 'clang++' or install gcc via Homebrew and ensure the compiler matches your system architecture. Compiler used: ${compiler}` });
          }
        }

        // detect missing main specific message
        if (stderrLower.includes('undefined symbol: _main') || stderrLower.includes("'_main'") || stderrLower.includes('symbol _main')) {
          lines.unshift({ message: 'Missing `main` function: the linker cannot find `main`. Make sure your source defines `int main()` or you are linking object files that contain main.' });
        }

        resolve({ success: false, errors: lines });
      }
    });
    g.on('error', err => reject(err));
  });
}

function runBinaryOnInput(binaryPath, input, timeoutMs = 2000, workingDir = null) {
  return new Promise((resolve, reject) => {
    // If workingDir is supplied, run there. Otherwise, create a temporary working directory
    let tmpDir = null
    const cwd = workingDir || (tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-run-')))

    const p = spawn(binaryPath, [], { stdio: ['pipe', 'pipe', 'pipe'], cwd });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const t = setTimeout(() => {
      timedOut = true;
      try { p.kill('SIGKILL') } catch (e) {}
    }, timeoutMs);

    p.stdout.on('data', d => stdout += d.toString());
    p.stderr.on('data', d => stderr += d.toString());
    p.on('close', (code, sig) => {
      clearTimeout(t);
      // cleanup tmp dir if we created one
      if (tmpDir) {
        try { fs.rmdirSync(tmpDir, { recursive: true }) } catch (e) {}
      }
      resolve({ stdout, stderr, timedOut });
    });
    p.on('error', err => {
      if (tmpDir) try { fs.rmdirSync(tmpDir, { recursive: true }) } catch (e) {}
      reject(err)
    });
    if (input) p.stdin.write(input);
    p.stdin.end();
  });
}

module.exports = { compileSource, runBinaryOnInput };
