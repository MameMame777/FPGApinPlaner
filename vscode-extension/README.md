# FPGA Pin Planner - VS Code Extension

Advanced FPGA Pin Assignment and Management Tool with Voltage/IO Standard Selection for VS Code.

## Features

- 📥 **CSV Import**: Import pin data from CSV files with intelligent parsing
- 📤 **Multi-Format Export**: Export constraints in XDC (Xilinx), SDC (Synopsys), and QSF (Intel Quartus) formats
- ⚡ **Voltage & I/O Standards**: Comprehensive voltage level and I/O standard management
- 🔍 **Pin Validation**: Real-time constraint validation and error detection
- 📊 **Interactive Interface**: User-friendly webview interface with resizable panels
- 🎯 **Context Integration**: Right-click context menus for CSV and constraint files
- 📊 **Bank Analysis**: Dynamic bank statistics and differential pair management

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Search for "FPGA" to see all available commands
4. Use `FPGA: Open Pin Planner` to start the main interface

## Development Build

### Prerequisites
- Node.js (v16 or later)
- npm
- TypeScript
- vsce (VS Code Extension Manager)

### Clean Build Process
For developers who want to build the extension from source:

```bash
# Option 1: Use the automated PowerShell script
.\clean-build.ps1

# Option 2: Use the batch file
.\clean-build.cmd

# Option 3: Manual step-by-step build
cd .. && npm run build && cd vscode-extension
npm install
npm run package
```

**Important**: Always build the main application first (`npm run build` in root directory) before building the extension to ensure the latest webview content is included.

### Installation
After building, install the generated `.vsix` file:
```bash
code --install-extension fpga-pin-planner-1.0.1.vsix --force
```

## Commands

- `FPGA: Open Pin Planner` - Open the main pin planner interface
- `FPGA: Import CSV Pin Data` - Import pin assignments from CSV files
- `FPGA: Export XDC Constraints` - Export Xilinx Design Constraints (XDC)
- `FPGA: Export SDC Constraints` - Export Synopsys Design Constraints (SDC)
- `FPGA: Export QSF Constraints` - Export Quartus Settings File (QSF)
- `FPGA: Validate Pin Constraints` - Validate pin assignments and detect issues

## Supported File Formats

### Import
- **CSV**: Pin number, signal name, direction, voltage, I/O standard, package, bank, comments

### Export
- **XDC**: Xilinx Design Constraints for Vivado
- **SDC**: Synopsys Design Constraints for various tools
- **QSF**: Quartus Settings File for Intel Quartus Prime

## CSV Format

The extension supports flexible CSV formats with the following columns:

```csv
Pin Number, Signal Name, Direction, Voltage, IO Standard, Package, Bank, Comments
A1, clk_100mhz, input, 3.3V, LVCMOS33, BGA484, 15, Main clock input
B2, reset_n, input, 3.3V, LVCMOS33, BGA484, 15, Active-low reset
C3, led[0], output, 3.3V, LVCMOS33, BGA484, 16, Status LED
```

## Configuration

Access extension settings via `File > Preferences > Settings` and search for "FPGA Pin Planner":

- **Default Voltage**: Set default voltage level for new pins
- **Default I/O Standard**: Set default I/O standard
- **Auto Save**: Enable automatic saving of changes
- **Validation Level**: Set validation strictness (strict/moderate/relaxed)
- **Export Format**: Set default export format

## Requirements

- VS Code 1.74.0 or later
- No additional dependencies required

## Release Notes

### 1.0.0
- Initial release
- Basic pin management interface
- CSV import functionality
- XDC, SDC, and QSF export support
- Pin constraint validation
- Context menu integration

## Contributing

This extension is part of the larger FPGA Pin Planner project. Contributions are welcome!

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Create an issue on the GitHub repository
- Check the documentation for detailed usage instructions

---

**Enjoy managing your FPGA pins with VS Code!** 🚀
