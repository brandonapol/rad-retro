import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).expect = expect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).vi = vi
