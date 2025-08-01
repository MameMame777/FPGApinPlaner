import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

// Simple test component
const TestComponent = () => {
  return <div>Hello Test World</div>
}

describe('Test Environment Setup', () => {
  it('should render a simple component', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test World')).toBeInTheDocument()
  })

  it('should perform basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toContain('ell')
    expect([1, 2, 3]).toHaveLength(3)
  })
})
