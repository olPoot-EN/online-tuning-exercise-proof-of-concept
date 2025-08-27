# Reactive Capability Exercise

A browser-based power system simulation tool for training industry professionals on reactive power control and voltage regulation.

## Overview

This project migrates a Python/tkinter-based reactive power simulation to a modern web application using Pyodide (Python in WebAssembly). The tool provides real-time interactive simulation of generator reactive capability and voltage control systems.

## Features

- **Interactive Voltage Control**: Real-time voltage reference adjustment with slider and precision buttons
- **Live Visualization**: Animated charts showing voltage and reactive power responses
- **Newton-Raphson Power Flow**: Accurate power system calculations
- **Configuration Interface**: Adjustable simulation parameters
- **Single File Distribution**: Self-contained HTML application for easy deployment

## Quick Start

### For End Users
1. Download the `reactive-capability-exercise.html` file
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
├── PRD.md                              # Product Requirements Document
├── CLAUDE.md                           # Development documentation
├── TECHNICAL_ARCHITECTURE.md           # Technical architecture
├── original code/                      # Original Python implementation
│   ├── reactive.py                     # Main application
│   └── NewtonRaphson.py               # Power flow solver
├── development/                        # Development files (to be created)
├── dist/                              # Built applications (to be created)
└── docs/                              # Additional documentation (to be created)
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

**Phase 2: Core Implementation** 🚧 In Progress
- Python code migration to Pyodide
- JavaScript UI development
- Real-time simulation engine

**Phase 3: Testing and Validation** ⏳ Pending
- Mathematical accuracy verification
- Performance testing
- User acceptance testing

**Phase 4: Production and Deployment** ⏳ Pending
- Code obfuscation and minification
- Security implementation
- Final distribution package

## Contributing

This is an internal project for power industry training. Development is managed through Claude Code with specific workflows documented in `CLAUDE.md`.

## License

Internal use only. This software is developed for specific training applications in the power industry.

## Support

For technical issues or questions, please refer to the troubleshooting section in `CLAUDE.md` or contact the development team.

---

**Version**: 1.0.0-dev  
**Last Updated**: [Date]  
**Maintained By**: Claude Code Development Team