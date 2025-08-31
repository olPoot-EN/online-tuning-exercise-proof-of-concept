# Python Extraction Technical Implementation Notes

## What Was Done
1. **Extracted Python from HTML**: Removed all embedded `<script type="py">` blocks from original HTML
2. **Created separate .py files**: 
   - `newton_raphson_clean.py` (8,610 chars) - Newton-Raphson solver
   - `voltage_control_clean.py` (11,223 chars) - Simulation system
3. **Modified app.js**: Replaced embedded Python loading with `loadSeparatePythonFiles()` function
4. **Fixed dependency order**: Newton-Raphson MUST load before voltage control (voltage calls `GenericNewtonRaphson()`)

## Critical Technical Hurdles Encountered

### Issue 1: "Cannot access uninitialized variable" Error
- **Problem**: `voltage_control_clean.py` calls `GenericNewtonRaphson()` but function not in scope
- **Root Cause**: Pyodide global scope not shared between runPython() calls if dependency not loaded first
- **Fix**: Sequential loading with verification:
```javascript
pyodide.runPython(newtonCode);
const nrFunction = pyodide.globals.get('GenericNewtonRaphson');
if (!nrFunction) throw new Error('GenericNewtonRaphson not found');
// Then load voltage control
```

### Issue 2: File:// Protocol Failure
- **Problem**: Fetch fails with "Load failed" when opening HTML directly in browser
- **Root Cause**: Same-Origin Policy blocks file:// fetch requests
- **Symptoms**: `file:///path/to/file.html` = FAIL, `http://localhost:8000/file.html` = SUCCESS
- **Fix**: MUST use HTTP server for local development

### Issue 3: Python Syntax Compatibility
- **Python files are valid Python syntax** (verified with `ast.parse()`)
- **Pyodide handles standard imports** (`numpy`, `math`, `random`) correctly
- **No syntax translation needed** - Python files work as-is in Pyodide

## Working Implementation Pattern
```javascript
async loadSeparatePythonFiles() {
    // 1. Fetch Newton-Raphson
    const newtonResponse = await fetch('newton_raphson_clean.py');
    const newtonCode = await newtonResponse.text();
    
    // 2. Execute and verify
    this.pyodide.runPython(newtonCode);
    const nrFunction = this.pyodide.globals.get('GenericNewtonRaphson');
    if (!nrFunction) throw new Error('GenericNewtonRaphson not found');
    
    // 3. Fetch voltage control
    const voltageResponse = await fetch('voltage_control_clean.py');
    const voltageCode = await voltageResponse.text();
    
    // 4. Execute (now safe - dependency available)
    this.pyodide.runPython(voltageCode);
}
```

## Verification Method
Created test files to isolate issues:
- `TEST_INLINE.html` - Embedded Python (works) → proves Pyodide functional  
- `DIAGNOSE_FETCH.html` - File fetch test → revealed file:// protocol issue
- `ACTUALLY_WORKING.html` - Sequential loading → confirmed solution