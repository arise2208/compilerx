# CP IDE (Electron + React + Monaco)

Minimal competitive programming desktop IDE scaffold using Electron, React, Tailwind, and Monaco Editor. It supports local C++ compilation (g++), testcases, and basic file management.

Setup

1. Install dependencies:

   npm install

2. Run in development (starts Vite and Electron):

   npm run dev

Notes

- Requires g++ available in PATH (supports C++20 via -std=gnu++20).
- Project is a scaffold and can be extended. Compilation outputs are cached under `.cache`.
