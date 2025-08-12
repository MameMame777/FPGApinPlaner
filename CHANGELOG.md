# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.9] - 2025-01-05

### ✨ Added

- **I/O Configuration GUI** (Issue #34): Comprehensive I/O voltage and standard configuration interface
  - Dual-dropdown layout for voltage and I/O standard selection
  - Collapsible advanced settings panel with improved UX
  - Real-time voltage/standard compatibility validation
  - Enhanced placeholder text and visual indicators

- **Extended I/O Standards Support**: Expanded from 23 to 38 I/O standards
  - Added high-speed standards: LVDS_18, LVDS_25, LVDS_33, LVDS_E_25
  - Added DDR memory standards: DDR3_1_35V, DDR3_1_5V, DDR4_1_2V, DDR5_1_1V
  - Added TMDS standards: TMDS_33
  - Added PCI standards: PCI33_3, PCI66_3, PCIX_3
  - Added differential standards: LVPECL_25, LVPECL_33
  - Added mobile standards: MOBILE_DDR_1_8V
  - And 7 additional specialized standards

- **List Mode Column Sorting**: Click column headers to sort by Bank, Pin#, Voltage, I/O Type, I/O Standard, Signal, Comment
- **Visual Sort Indicators**: Ascending (▲), descending (▼), and sortable (↕) icons in column headers
- **Enhanced Bulk Editing**: Direction, Voltage, and I/O Standard bulk assignment for selected pins
- **Advanced BANK Filtering**: Interactive toggle buttons with Show All/Hide All functionality
- **Clear Selection Button**: Added to bulk editing actions for better workflow management

### 🔧 Improved

- **Bulk Comment Application**: Fixed Apply Comment button functionality with proper state management
- **BANK Filter Integration**: Unified filtering state between Grid and List views
- **UI Responsiveness**: Enhanced visual feedback for all interactive elements
- **State Management**: Consistent data flow using global filtered pins throughout the application
- **User Experience**: Enhanced List mode with comprehensive sorting and filtering capabilities
- **Performance**: Optimized virtual list rendering with improved state management

### 🐛 Fixed

- **POWER/GROUND Pin Validation**: Excluded power and ground pins from duplicate signal validation
- **List View Filtering**: Fixed BANK filtering not working properly in List mode
- **Apply Comment Bug**: Resolved issue where bulk comment application wasn't working
- **State Synchronization**: Fixed filtering inconsistencies between components
- **Validation System**: Enhanced pin validation with proper special pin type handling

### 🔧 Technical Changes

- Enhanced VirtualizedPinList component with sorting capabilities
- Improved PinListTabs with comprehensive filtering and sorting logic
- Refactored validation service with type-aware duplicate checking
- Optimized re-rendering with improved useMemo dependencies
- Enhanced PinItem component with I/O configuration UI
- Updated pin-constants with comprehensive I/O standards library

## [1.0.8] - 2025-01-04

### Previous Development Iteration

- Enhanced I/O configuration foundation
- Initial List mode improvements
- Code structure enhancements for release 1.0.9


## [1.0.7] - 2025-08-11

### 🆕 New Features

- Enhanced I/O configuration with comprehensive standards support
- Expanded I/O standards library (38 types including LVDS, DDR, TMDS)
- Improved pin configuration UI with collapsible advanced settings

### � Improvements

- Enhanced CSV processing with better direction handling
- Improved package canvas with I/O information display
- Better voltage-to-standard compatibility mapping

### 🐛 Bug Fixes

- Various UI improvements and bug fixes
- Enhanced error handling in CSV processing

## [1.0.6] - Previous Release

### 🆕 Initial Release

- Initial FPGA Pin Planner implementation
- VS Code extension support
- Grid and List view modes
- CSV import/export functionality
- Basic validation system

---

For more detailed release notes, see individual RELEASE-NOTES-v*.md files.
