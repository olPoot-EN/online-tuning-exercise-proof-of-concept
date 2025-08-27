# Reactive Capability Exercise - Development Documentation

This document contains development workflows, commands, and procedures for the Reactive Capability Exercise browser migration project.

## Project Overview

**Technology Stack**: Pyodide (Python in WebAssembly) + HTML/CSS/JavaScript  
**Target**: Single HTML file for local distribution, future server hosting  
**Timeline**: <1 month for Phase 1 completion  

## Repository Management

### GitHub Setup
- **Repository**: Private repository at `olPoot-EN/reactive-capability-exercise`
- **Repository URL**: `https://github.com/olPoot-EN/reactive-capability-exercise`
- **SSH Clone**: `git@github.com:olPoot-EN/reactive-capability-exercise.git`
- **Visibility**: PRIVATE - This is proprietary work and must not be public
- **Session Reference**: Repository information logged for Claude Code session continuity
- **Branch Strategy**: 
  - `main`: Production-ready releases
  - `development`: Active development branch
  - Feature branches: `feature/[feature-name]` for specific implementations
- **Commit Management**: All commits managed through Claude Code
- **Documentation**: All project documentation tracked in repository

### Git Commit Guidelines
- **IMPORTANT**: Do NOT include AI attribution comments in any commits, code, or comments
- **Prohibited Content**: Never include phrases like "Generated with Claude Code" or "Co-Authored-By: Claude" 
- **Commit Timing**: Always commit and push after completing code iterations, not during development
- **Commit Messages**: Clear, descriptive messages focusing on what was accomplished
- **Code Comments**: Only functional comments that serve the codebase, no attribution or generation notes

### Development Workflow
```bash
# Initial setup (completed)
git init
git remote add origin git@github.com:olPoot-EN/reactive-capability-exercise.git
git checkout -b development

# Regular development cycle - COMMIT AFTER COMPLETING ITERATIONS
# 1. Complete development work (code, test, debug)
# 2. Only then add and commit finished work
git add .
git commit -m "descriptive commit message"
git push origin development

# Production releases
git checkout main
git merge development
git tag -a v1.0 -m "Phase 1 Release"
git push origin main --tags
```

### Development Best Practices
- **Complete Before Commit**: Finish development iterations completely before staging commits
- **No Mid-Development Commits**: Avoid committing incomplete or broken code
- **Clean Code Only**: Only commit tested, working code iterations
- **Repository Privacy**: Always verify repository remains private for proprietary work

## Development Environment

### Local Development Setup
- **Primary IDE**: Claude Code
- **Testing Browser**: Microsoft Edge (target environment)
- **Python Version**: Compatible with Pyodide (CPython 3.11+)
- **File Structure**: Single HTML file with embedded resources

### Required Dependencies
- **Runtime**: Pyodide CDN (embedded in HTML)
- **Plotting**: Chart.js CDN (embedded in HTML)
- **Python Libraries**: numpy (via Pyodide)
- **No Local Installation**: All dependencies loaded via CDN

## Development Commands

### Testing and Validation

```bash
# Mathematical accuracy verification
# Compare Python original vs JavaScript implementation
python test_math_accuracy.py

# Performance testing
# Test startup time and animation smoothness
python performance_benchmark.py

# Cross-reference testing
# Validate against original Python version
python validate_outputs.py --scenarios all
```

### Code Quality

```bash
# JavaScript linting (if separate JS files used during development)
npx eslint reactive-app.js

# Python code validation (for embedded Python modules)
python -m py_compile embedded_newton_raphson.py
python -m py_compile embedded_reactive_control.py

# HTML validation
# Open HTML file in browser developer tools for validation
```

### Build Process

```bash
# Development version (readable code)
python build_dev.py
# Output: reactive-capability-exercise-dev.html

# Production version (obfuscated)
python build_production.py
# Output: reactive-capability-exercise.html
```

### Security Implementation

```bash
# Configure time-based expiration
python configure_expiration.py --start-date 2024-02-01 --duration 90

# Generate internal bypass key
python generate_bypass.py --admin-key [admin-password]

# Test expiration system
python test_expiration.py --test-date 2024-05-01
```

## File Structure

```
/Reactive Capability Exercise/
├── PRD.md                              # Product Requirements Document
├── CLAUDE.md                           # This file - Development documentation
├── TECHNICAL_ARCHITECTURE.md           # Technical implementation details
├── original code/                      # Original Python implementation
│   ├── reactive.py                     # Main application
│   └── NewtonRaphson.py               # Power flow solver
├── development/                        # Development files
│   ├── test_suite.py                  # Mathematical accuracy tests
│   ├── performance_benchmark.py       # Performance validation
│   ├── build_dev.py                   # Development build script
│   ├── build_production.py            # Production build script
│   └── embedded_modules/               # Python modules for embedding
│       ├── newton_raphson.py          # Ported Newton-Raphson solver
│       └── reactive_control.py        # Ported control logic
├── dist/                              # Built applications
│   ├── reactive-capability-exercise-dev.html    # Development version
│   └── reactive-capability-exercise.html        # Production version
└── docs/                              # Additional documentation
    └── user_guide.md                  # End-user documentation
```

## Testing Procedures

### Mathematical Accuracy Validation

**Purpose**: Ensure JavaScript implementation produces identical results to Python original

**Process**:
1. Create comprehensive test scenarios with known inputs/outputs
2. Run identical scenarios in both Python original and JavaScript port
3. Compare all numerical outputs to high precision (1e-9 tolerance)
4. Validate Newton-Raphson convergence behavior
5. Test edge cases and boundary conditions

**Test Scenarios**:
- Various voltage reference setpoints (90-110%)
- Different noise levels and system parameters
- Convergence testing with difficult power flow conditions
- Extended simulation runs for stability verification

### Performance Validation

**Purpose**: Ensure smooth operation on target hardware (0-6 year old corporate laptops)

**Metrics**:
- **Startup Time**: <10 seconds initial, <3 seconds cached
- **Animation Smoothness**: Consistent 50ms update intervals
- **Memory Usage**: Stable during extended operation
- **CPU Usage**: Reasonable load on older hardware

**Testing Hardware**:
- Test on range of corporate laptop specifications
- Validate in Microsoft Edge across versions
- Test with corporate firewall/proxy configurations
- Verify offline operation capability

### User Acceptance Testing

**Purpose**: Validate usability and professional appearance

**Process**:
1. Test with 5+ power industry professionals
2. Evaluate interface clarity and responsiveness
3. Assess learning curve and intuitive operation
4. Gather feedback on visual design and professionalism
5. Validate educational effectiveness

**Scenarios**:
- First-time user experience (cold start)
- Typical training session workflow
- Advanced parameter adjustment
- Error recovery and edge cases

## Security Implementation

### Code Obfuscation
- **Development**: Keep code readable for debugging and maintenance
- **Production**: Apply JavaScript minification and obfuscation
- **Python Code**: Embed as minified strings in JavaScript
- **Configuration**: Separate obfuscation settings for easy toggle

### Time-Based Expiration
- **Implementation**: Embedded expiration logic in JavaScript
- **Configuration**: Easily adjustable start date and duration
- **Bypass Mechanism**: Admin override for internal use
- **Offline Operation**: All checks must work without network access

### IP Protection Strategy
- **Primary Goal**: Prevent casual copying and redistribution
- **Secondary Goal**: Protect training material intellectual property
- **Approach**: Basic obfuscation, not high-security encryption
- **Balance**: Maintainability vs. protection level

## Configuration Management

### Simulation Parameters
```javascript
// Configurable parameters (embedded in HTML)
const CONFIG = {
    simulation: {
        updateInterval: 50,        // milliseconds
        displayWindow: 10.0,       // seconds
        tolerance: 1e-9           // Newton-Raphson tolerance
    },
    system: {
        noiseLevel: 0.002,        // pu
        systemReactance: 0.05,    // pu
        voltageBase: 1.0          // pu
    },
    control: {
        voltageKp: 10.0,          // proportional gain
        voltageKi: 50.0,          // integral gain
        plantTimeConstant: 0.25   // seconds
    },
    ui: {
        voltageRangeMin: 90,      // percent
        voltageRangeMax: 110,     // percent
        sliderStep: 0.1           // percent
    },
    security: {
        startDate: "2024-02-01",  // YYYY-MM-DD
        expirationDays: 90,       // days
        bypassEnabled: true       // admin override
    }
};
```

### Build Configuration
```python
# build_config.py
BUILD_CONFIG = {
    'development': {
        'minify': False,
        'obfuscate': False,
        'debug_console': True,
        'performance_logging': True
    },
    'production': {
        'minify': True,
        'obfuscate': True,
        'debug_console': False,
        'performance_logging': False
    }
}
```

## Deployment Process

### Phase 1: Local Distribution
1. **Build Production Version**: Apply obfuscation and minification
2. **Validate Package**: Test complete functionality in target environment
3. **SharePoint Upload**: Ensure file size and format compatibility
4. **User Instructions**: Provide simple download and open instructions
5. **Support Documentation**: Create troubleshooting guide

### Phase 2: Server Deployment (Future)
1. **Server Environment**: Standard web hosting with static file serving
2. **Authentication Integration**: Migrate from time-based to user login
3. **Database Setup**: User management and progress tracking
4. **Load Testing**: Validate 50 concurrent user capacity
5. **Monitoring**: Server performance and usage analytics

## Troubleshooting Guide

### Common Development Issues

**Pyodide Loading Errors**:
- Check CDN availability and version compatibility
- Verify Python library imports work in browser environment
- Test with different browser versions

**Mathematical Accuracy Problems**:
- Compare floating-point precision between Python and JavaScript
- Validate NumPy operations in Pyodide environment
- Check for rounding or truncation differences

**Performance Issues**:
- Profile JavaScript execution timing
- Monitor memory usage during extended operation
- Test on minimum specification hardware

**Security Implementation**:
- Test expiration logic with various date scenarios
- Verify obfuscation doesn't break functionality
- Validate offline operation of all security features

### Support Contacts
- **Development Issues**: Claude Code development environment
- **Technical Questions**: Internal development team
- **User Issues**: Training coordinator and IT support

## Change Management

### Requirements Changes
- All changes must reference and update PRD.md
- Impact assessment required for timeline and scope
- Approval process for significant modifications

### Code Changes
- Feature branches for all new development
- Code review process for production releases
- Comprehensive testing before merge to main branch

### Documentation Updates
- Keep CLAUDE.md synchronized with development practices
- Update technical architecture document for major changes
- Maintain user documentation for interface modifications

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Maintained By**: Claude Code Development Environment