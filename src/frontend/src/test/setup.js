import '@testing-library/jest-dom/vitest'

function memoryStorage() {
  const values = new Map()
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value)),
  }
}

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage() })
