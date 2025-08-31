# Claude Agent Onboarding Documentation
## Power Systems Voltage Tuning Exercise Project

### PROJECT OVERVIEW
**Mission**: Browser-based power systems simulation using Pyodide  
**Status**: Phase 1 (2-bus system) ✅ COMPLETE → Phase 2 (5-bus IBR_PPC_Tuning.py) 🔄 READY  
**Architecture**: Embedded Python in HTML vs separate .py files decision pending

### ARCHITECTURE SUMMARY

**Phase 1 Implementation (✅ COMPLETE)**:
- **Frontend**: HTML5/CSS3/JavaScript with Chart.js for real-time plotting
- **Backend**: Python 3.11+ via Pyodide WebAssembly runtime
- **Mathematics**: Newton-Raphson power flow solver with voltage control simulation
- **Deployment**: GitHub Pages serving from `/docs` folder
- **Current File Structure**: 
  - `docs/index.html` - Main application with embedded Python code
  - `docs/app.js` - JavaScript application logic and Pyodide bridge
  - `docs/styles.css` - Professional responsive styling

**Phase 1 Python Architecture (Working)**:
- **Embedded Approach**: Python code directly in HTML `<script type="text/python">` tags
- **Simple 2-bus System**: Basic Newton-Raphson solver with voltage control
- **Real-time Simulation**: PI controller with Chart.js visualization
- **Proven Stable**: Ready for production deployment

### CRITICAL TECHNICAL DETAILS

**GitHub Pages + Separate Python Files**: 
✅ **CONFIRMED POSSIBLE** - GitHub Pages serves `.py` files as static content
- Pyodide loads via: `pyodide.runPython(await (await fetch('filename.py')).text())`
- No server-side execution required
- Existing deployment pipeline unchanged

**Current System Specifications**:
- **2-bus power system** with voltage regulation
- **Real-time simulation** at 10ms timestep (configurable)
- **Interactive controls**: Voltage reference slider, PI gain tuning
- **Live plotting**: Voltage and reactive power with 15-second rolling window
- **Performance target**: <10s initial load, smooth animation on 6-year-old laptops

### PHASE 2 MILESTONE CHALLENGE 🔄

**Complex System Integration** (`Python/IBR_PPC_Tuning.py`):
- **5-bus power system** with detailed inverter-based resource modeling
- **Advanced inverter controls** (PPC tuning, voltage ride-through capabilities)
- **Multiple control modes** (REPC vs Q(V) droop control strategies)
- **GUI Migration**: tkinter/matplotlib → modern web UI with advanced parameter controls
- **Code Volume**: ~700+ lines complex system vs current ~200 lines simple system

**Architecture Decision Required**:
1. **Embedded vs Modular**: Continue embedded approach vs separate .py files
2. **Python Package Development**: Create maintainable, modular Python architecture
3. **Obfuscation Strategy**: IP protection approach for production deployment
4. **UI Enhancement**: Design advanced control interfaces for complex parameters

**Critical Success Factors**:
1. **Mathematical Fidelity**: All results must match original IBR_PPC_Tuning.py exactly
2. **Performance**: Complex calculations must maintain smooth real-time animation
3. **Maintainability**: Code structure must support ongoing development and updates
4. **Security**: Obfuscation workflow must protect proprietary algorithms

### KEY FILES
**Working System**: docs/ (Phase 1 complete - embedded Python)  
**Target**: Python/IBR_PPC_Tuning.py (~700 lines, complex 5-bus system)  
**Documentation**: project_documentation/ (this folder)

### PHASE 2 INTEGRATION STRATEGY 📋

**Recommended Development Approach**:
1. **Algorithm Extraction**: Separate mathematical logic from tkinter GUI in IBR_PPC_Tuning.py
2. **Modular Architecture**: Design Python package structure:
   - `power_system.py` - 5-bus network modeling and parameters
   - `inverter_controls.py` - PPC tuning and voltage ride-through algorithms  
   - `plant_dynamics.py` - Inverter dynamics and response modeling
   - `simulation_engine.py` - Coordination and real-time execution
3. **Progressive Integration**: Add complexity incrementally while preserving working system
4. **Web UI Enhancement**: Design advanced control panels for complex parameter sets

**Architecture Decision Points**:
1. **File Structure**: Embedded (current working approach) vs Separate .py files
2. **Obfuscation Timing**: During development vs post-development
3. **Package Organization**: Monolithic vs modular Python structure
4. **UI Complexity**: Parameter organization for user-friendly interface

### CRITICAL SUCCESS FACTORS

**Technical Requirements**:
- Mathematical accuracy must match original Python exactly
- Performance: Smooth real-time animation on older corporate hardware
- Browser compatibility: Microsoft Edge focus (corporate environments)
- Offline operation: Full functionality after initial resource load

**Security/IP Protection**:
- Code obfuscation workflow documented in PYTHON_OBFUSCATION_WORKFLOW.md
- Time-based expiration system for access control
- Function/variable name obfuscation to protect algorithms
- Remove all domain-specific terminology and academic references

**Deployment Constraints**:
- GitHub Pages static hosting only
- Corporate SharePoint compatibility
- No external API dependencies for core functionality
- Single HTML file distribution capability

### DEVELOPMENT WORKFLOW

**Testing Protocol**:
1. **Always test after each major change**
2. **Never modify original working files** - use copies
3. **Side-by-side regression testing** - compare outputs exactly
4. **Browser console verification** - no JavaScript/Python errors
5. **Performance testing** - maintain animation smoothness

**Quality Gates**:
- Functional: All interactive features work identically
- Mathematical: Results match original Python exactly
- Performance: Acceptable speed on target hardware  
- Security: Proper obfuscation without breaking functionality

### COMMON PITFALLS TO AVOID

**Technical**:
- Inconsistent parameter renaming during obfuscation
- Missing function call updates when renaming
- Mathematical logic changes (accidentally modifying calculations)
- Breaking Pyodide module loading

**Project Management**:
- Don't break working system during integration
- Test incrementally, not in large batches
- Performance optimization comes after functionality
- Document all obfuscation mappings

### CURRENT PROJECT STATUS

**Completed** ✅:
- Phase 1: Simple 2-bus system fully functional
- Professional web UI with real-time charts
- GitHub Pages deployment working
- Pyodide integration stable
- Code obfuscation workflow established
- **Separate Python files implementation** (in `docs_test_sandbox/`)
  - Python extracted from HTML to `.py` files for IP protection
  - Sequential loading with dependency management  
  - Automatic `file://` protocol detection with user guidance
  - Technical hurdles documented for future reference

**In Progress** 🔄:
- Planning Phase 2 complex system integration
- UI/UX design for advanced control parameters

**Next Steps for Phase 2** 📋:
1. **Architecture Decision**: Choose embedded vs separate .py files approach based on:
   - Code maintainability requirements
   - Obfuscation complexity needs
   - Performance considerations
2. **Algorithm Analysis**: Analyze IBR_PPC_Tuning.py to identify:
   - Core mathematical algorithms (preserve exactly)
   - GUI-specific code (replace with web UI)
   - Parameter structures (design web controls)
   - Performance bottlenecks (optimize for browser)
3. **Python Package Design**: Create modular structure for complex system
4. **Web UI Design**: Plan advanced control interfaces for 5-bus system parameters  
5. **Progressive Implementation**: Integrate complexity while maintaining working system

### QUICK START FOR AI AGENTS

**Test Current System**:
```bash
cd /Users/davidparry/claude_code/Voltage\ Tuning\ Exercise/docs/
python3 -m http.server 8080     # Open http://localhost:8080
```

**Phase 2 Next Steps**:
1. Analyze IBR_PPC_Tuning.py structure and extract core algorithms
2. Decide: Continue embedded approach vs separate .py files  
3. Design UI for complex 5-bus system parameters
4. Implement incrementally while preserving working Phase 1 system

### EMERGENCY PROCEDURES

**If System Breaks**:
1. STOP immediately, don't compound problems
2. Revert to last known working state
3. Identify breaking change through git diff
4. Fix incrementally with testing at each step
5. Never deploy broken functionality

**Critical Backup Locations**:
- Original working system: `/docs` folder
- Obfuscation testing: `/docs_copy` folder  
- Original Python: `/Python` folder
- All documentation: `/project_documentation` folder

This document provides complete project context for rapid agent onboarding and effective collaboration continuation.