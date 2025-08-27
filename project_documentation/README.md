# Voltage Tuning Exercise

A browser-based power system simulation tool for training industry professionals on voltage control and system tuning.

## Overview

This project migrates a Python/tkinter-based voltage tuning simulation to a modern web application using Pyodide (Python in WebAssembly). The tool provides real-time interactive simulation of voltage control systems and power system tuning.

## Features

- **Interactive Voltage Control**: Real-time voltage reference adjustment with slider and precision buttons
- **Live Visualization**: Animated charts showing voltage and reactive power responses
- **Newton-Raphson Power Flow**: Accurate power system calculations
- **Configuration Interface**: Adjustable simulation parameters
- **Single File Distribution**: Self-contained HTML application for easy deployment

## Quick Start

### For End Users
1. Download the `voltage-tuning-exercise.html` file
2. Double-click to open in Microsoft Edge or any modern browser
3. Use the voltage reference controls to interact with the simulation

### For Developers
1. Clone this repository
2. Review the documentation:
   - `PRD.md` - Product requirements and specifications
   - `CLAUDE.md` - Development workflows and commands
   - `TECHNICAL_ARCHITECTURE.md` - Implementation details
3. Follow the development setup in `CLAUDE.md`

## Documentation

- **[PRD.md](PRD.md)** - Complete product requirements document
- **[CLAUDE.md](CLAUDE.md)** - Development documentation and workflows
- **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** - Technical implementation details

## Project Structure

```
/
├── project_documentation/              # All project documentation
│   ├── README.md                       # This file - project overview
│   ├── PRD.md                         # Product Requirements Document
│   ├── CLAUDE.md                      # Development documentation
│   ├── TECHNICAL_ARCHITECTURE.md      # Technical architecture
│   ├── DEVELOPMENT_TODOS.md           # Task tracking
│   └── GITHUB_PAGES_DEPLOYMENT.md     # Deployment guide
├── docs/                              # Working application (GitHub Pages ready)
│   ├── index.html                     # Main application
│   ├── styles.css                     # Application styling
│   ├── app.js                         # JavaScript application logic
│   ├── newton_raphson.py              # Ported Newton-Raphson solver
│   ├── voltage_control.py             # Ported control system
│   ├── build_dev.py                   # Development build script
│   ├── test_accuracy.py               # Mathematical accuracy tests
│   └── quick_test.py                  # Local testing utilities
├── src/                               # Source files (empty)
└── Tuning/                            # Original implementation files (empty)
```

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, Chart.js
- **Backend**: Pyodide (Python in WebAssembly), NumPy
- **Distribution**: Single HTML file with embedded resources
- **Target**: Microsoft Edge browser in corporate environments

## Development Status

**Phase 1: Documentation and Planning** ✅ Complete
- Product Requirements Document
- Technical Architecture Design  
- Development Workflows

**Phase 2: Core Implementation** ✅ Complete
- Python code migration to Pyodide ✅
- JavaScript UI development ✅
- Real-time simulation engine ✅
- Security manager implementation ✅
- Chart.js visualization system ✅

**Phase 3: Testing and Validation** 🚧 In Progress
- Mathematical accuracy verification 🚧
- Performance testing 🚧
- User acceptance testing ⏳

**Phase 4: Production and Deployment** 🚧 Ready for Deployment
- Code obfuscation and minification 🚧
- Security implementation ✅
- GitHub Pages deployment ready ✅
- Build system implemented ✅

## Contributing

This is an internal project for power industry training. 

## License

Internal use only. This software is developed for specific training applications in the power industry.

---

**Version**: 1.0.0-dev  
**Last Updated**: [Date]  