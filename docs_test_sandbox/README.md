# Voltage Tuning Exercise - Test Sandbox

## Files to Test

### 🎯 **WORKING_VERSION.html** - USE THIS ONE
This is the simplified, verified working version that:
- Loads Pyodide from CDN
- Sequentially loads Python files in correct order
- Has detailed status reporting
- Includes comprehensive error handling
- **This file has been tested and works correctly**

### index.html - Full Application
This is the complete application with all UI features:
- Uses app.js for application logic
- Uses styles.css for styling
- Loads Python files via app.js's `loadSeparatePythonFiles()` function
- Has the full voltage control interface

## Python Files (Required)
- **newton_raphson_clean.py** - Newton-Raphson solver (must load first)
- **voltage_control_clean.py** - Voltage control simulation (depends on Newton-Raphson)

## How to Test

1. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open in browser:
   - For verified working test: http://localhost:8000/WORKING_VERSION.html
   - For full application: http://localhost:8000/index.html

## Key Points
- Python files MUST be loaded sequentially (Newton-Raphson first, then voltage control)
- The system requires Pyodide v0.24.1 and NumPy
- All algorithm code has been extracted to separate .py files for IP protection
- HTML files no longer contain embedded Python code

## Troubleshooting
If WORKING_VERSION.html works but index.html doesn't:
- Check browser console for specific errors
- Verify app.js is loading correctly
- Ensure loadSeparatePythonFiles() is being called
- Check that both .py files are accessible via HTTP