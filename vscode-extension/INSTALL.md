# FPGA Pin Planner VS Code Extension - Installation Guide

## Quick Installation

### Method 1: Install from VSIX file (Recommended for initial release)

1. **Download the extension package:**
   ```
   fpga-pin-planner-1.0.5.vsix
   ```

2. **Install in VS Code:**
   - Open VS Code
   - Press `Ctrl+Shift+P` to open Command Palette
   - Type "Extensions: Install from VSIX..."
   - Select the downloaded `fpga-pin-planner-1.0.5.vsix` file
   - Click "Install"

3. **Verify Installation:**
   - Press `Ctrl+Shift+P`
   - Type "FPGA" - you should see commands like:
     - `FPGA: Open Pin Planner`
     - `FPGA: Import CSV Pin Data`
     - `FPGA: Export XDC Constraints`
     - etc.

### Method 2: VS Code Marketplace (Future release)

Once published to the marketplace:
1. Open VS Code Extensions view (`Ctrl+Shift+X`)
2. Search for "FPGA Pin Planner"
3. Click "Install"

## Quick Start

1. **Open the Pin Planner:**
   - Press `Ctrl+Shift+P`
   - Type "FPGA: Open Pin Planner"
   - Press Enter

2. **Import CSV data:**
   - Right-click on a CSV file in Explorer
   - Select "Import CSV Pin Data"
   - Or use Command Palette: "FPGA: Import CSV Pin Data"

3. **Export constraints:**
   - Use Command Palette commands:
     - "FPGA: Export XDC Constraints" (Xilinx)
     - "FPGA: Export SDC Constraints" (Synopsys) 
     - "FPGA: Export QSF Constraints" (Intel Quartus)

## Features Included in v1.0.5

✅ **Enhanced Quality & Reliability:**
- Zero ESLint warnings achieved
- 100% test coverage (54/54 tests passing)
- Improved CI/CD pipeline stability
- Enhanced build process automation

✅ **Core Commands:**
- Open Pin Planner interface
- Import CSV pin data
- Export XDC/SDC/QSF constraints
- Validate pin constraints

✅ **Context Integration:**
- Right-click context menus for CSV files
- Command Palette integration
- File type associations

✅ **User Interface:**
- Clean webview interface
- VS Code theme integration
- Interactive pin management

## Extension Details

- **Package Size:** 25.11 KB (optimized)
- **VS Code Version:** 1.74.0 or later
- **License:** MIT
- **Publisher:** fpga-tools

## Configuration

Access settings via `File > Preferences > Settings` and search for "FPGA Pin Planner":

- **Default Voltage:** 3.3V (configurable)
- **Default I/O Standard:** AUTO
- **Auto Save:** Enabled
- **Validation Level:** Strict
- **Export Format:** XDC

## Supported File Types

### Import Formats
- **.csv** - Comma-separated values with pin data
- **.txt** - Text files with CSV-like format

### Export Formats  
- **.xdc** - Xilinx Design Constraints
- **.sdc** - Synopsys Design Constraints
- **.qsf** - Quartus Settings File

## Troubleshooting

### Common Issues

1. **Extension not appearing:**
   - Restart VS Code after installation
   - Check VS Code version (requires 1.74.0+)

2. **Commands not working:**
   - Ensure extension is enabled
   - Check Output panel for error messages

3. **File import issues:**
   - Verify CSV format is correct
   - Check file permissions

### Getting Help

- Check the README.md for detailed documentation
- Create issues on the GitHub repository
- Use VS Code's built-in help system

## Development Setup (For Contributors)

If you want to contribute or modify the extension:

```bash
# Clone the repository
git clone https://github.com/your-username/FPGApinPlaner.git
cd FPGApinPlaner/vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package
```

## Next Steps

After installation, try these workflows:

1. **Sample CSV Import:**
   - Create a test CSV file with pin data
   - Use the import command to load it
   - Export to your preferred constraint format

2. **Validation Workflow:**
   - Import pin assignments
   - Run validation to check for issues
   - Fix any errors or warnings

3. **Multi-Format Export:**
   - Test exporting to XDC, SDC, and QSF
   - Compare formats for your toolchain

## Release Notes

### Version 1.0.0 (Initial Release)
- Core pin management functionality
- CSV import/export capabilities
- Multi-format constraint export
- VS Code integration and theming
- Basic validation features

---

**Happy FPGA designing with VS Code!** 🚀
