import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchOperationPanel } from '@/components/common/BatchOperationPanel'

// Mock the app store
const mockUseAppStore = {
  pins: [],
  selectedPins: new Set(),
  assignSignal: () => {}
}

// Mock the services
vi.mock('@/stores/app-store', () => ({
  useAppStore: () => mockUseAppStore
}))

vi.mock('@/services/undo-redo-service', () => ({
  UndoRedoService: {
    recordAction: vi.fn()
  }
}))

vi.mock('@/services/batch-operation-service', () => ({
  BatchOperationService: {
    filterPinsByCriteria: vi.fn(() => []),
    validateBatchOperation: vi.fn(() => []),
    assignArrayPattern: vi.fn(() => ({
      success: true,
      processedPins: 0,
      skippedPins: 0,
      assignments: [],
      errors: []
    })),
    assignDifferentialPattern: vi.fn(() => ({
      success: true,
      processedPins: 0,
      skippedPins: 0,
      assignments: [],
      errors: []
    })),
    clearSignals: vi.fn(() => ({
      success: true,
      processedPins: 0,
      skippedPins: 0,
      assignments: [],
      errors: []
    }))
  }
}))

describe('BatchOperationPanel', () => {
  beforeEach(() => {
    mockUseAppStore.pins = []
    mockUseAppStore.selectedPins = new Set()
  })

  it('should render when visible', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    expect(screen.getByText('Batch Operations')).toBeInTheDocument()
    expect(screen.getByText('Assign patterns to multiple pins efficiently')).toBeInTheDocument()
  })

  it('should not render when not visible', () => {
    render(<BatchOperationPanel isVisible={false} />)
    
    expect(screen.queryByText('Batch Operations')).not.toBeInTheDocument()
  })

  it('should display operation type options', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    expect(screen.getByLabelText(/Array Pattern/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Differential Pairs/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Clear Signals/)).toBeInTheDocument()
  })

  it('should display selection mode options', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    expect(screen.getByLabelText(/Use Selected Pins/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Auto-select by Criteria/)).toBeInTheDocument()
  })

  it('should show Generate Preview button', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    expect(screen.getByText('Generate Preview')).toBeInTheDocument()
  })

  it('should disable Generate Preview button when no pins selected', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    const previewButton = screen.getByText('Generate Preview')
    expect(previewButton).toBeDisabled()
  })

  it('should change operation type when radio button is clicked', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    const differentialOption = screen.getByLabelText(/Differential Pairs/)
    fireEvent.click(differentialOption)
    
    expect(differentialOption).toBeChecked()
    expect(screen.getByText('Differential Pair Configuration')).toBeInTheDocument()
  })

  it('should show array configuration when array operation is selected', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    // Array should be selected by default
    expect(screen.getByText('Array Pattern Configuration')).toBeInTheDocument()
    expect(screen.getByDisplayValue('DATA')).toBeInTheDocument()
    expect(screen.getByDisplayValue('[{i}]')).toBeInTheDocument()
  })

  it('should show criteria configuration when criteria mode is selected', () => {
    render(<BatchOperationPanel isVisible={true} />)
    
    const criteriaOption = screen.getByLabelText(/Auto-select by Criteria/)
    fireEvent.click(criteriaOption)
    
    expect(screen.getByText('Pin Types')).toBeInTheDocument()
    expect(screen.getByText('Assignment Status')).toBeInTheDocument()
  })
})
