import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Card } from '../Card'
import type { Card as CardType } from '../../types/index.js'

vi.mock('../../utils/api', () => ({
  deleteCard: vi.fn(() => Promise.resolve()),
}))

describe('Card Component', () => {
  const mockCard: CardType = {
    id: 1,
    session_id: 'test123',
    category: 'well',
    content: 'Great teamwork!',
    author: 'Alice',
    created_at: '2024-01-01T00:00:00Z',
  }

  const mockOnDelete = vi.fn()

  it('renders card content and author', () => {
    render(<Card card={mockCard} onDelete={mockOnDelete} />)

    expect(screen.getByText('Great teamwork!')).toBeInTheDocument()
    expect(screen.getByText('- Alice')).toBeInTheDocument()
  })

  it('shows delete button on hover', () => {
    render(<Card card={mockCard} onDelete={mockOnDelete} />)

    const deleteButton = screen.getByLabelText('Delete card')
    expect(deleteButton).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', async () => {
    render(<Card card={mockCard} onDelete={mockOnDelete} />)

    const deleteButton = screen.getByLabelText('Delete card')
    fireEvent.click(deleteButton)

    await vi.waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(1)
    })
  })
})
