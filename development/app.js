/**
 * Voltage Tuning Exercise - Main JavaScript Application
 * 
 * This implements the browser-based version of the voltage tuning
 * training simulation using Pyodide for Python execution and Chart.js for visualization.
 */

class SecurityManager {
    constructor() {
        this.config = {
            startDate: "2024-02-01",
            expirationDays: 90,
            bypassEnabled: true,
            adminKey: "voltage_admin_2024"
        };
    }

    checkAccess() {
        const now = new Date();
        const startDate = new Date(this.config.startDate);
        const expirationDate = new Date(startDate.getTime() + 
                                       this.config.expirationDays * 24 * 60 * 60 * 1000);

        // Check for bypass first
        if (this.config.bypassEnabled && this.checkBypass()) {
            return { allowed: true, reason: "bypass" };
        }

        // Check date range
        if (now < startDate) {
            return { 
                allowed: false, 
                reason: "not_started",
                message: `Training materials available starting ${startDate.toDateString()}`
            };
        }

        if (now > expirationDate) {
            return { 
                allowed: false, 
                reason: "expired",
                message: `Training materials expired on ${expirationDate.toDateString()}`
            };
        }

        return { allowed: true, reason: "valid" };
    }

    checkBypass() {
        // Check URL parameters
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === this.config.adminKey) {
            return true;
        }

        // Check localStorage
        if (localStorage.getItem('voltage_admin') === this.config.adminKey) {
            return true;
        }

        // Check for development environment indicators
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:') {
            return true;
        }

        return false;
    }

    showAccessDenied(accessResult) {
        const container = document.getElementById('app-container');
        const loading = document.getElementById('loading-overlay');
        
        loading.style.display = 'none';
        container.innerHTML = `
            <div class="access-denied">
                <h1>Access Not Available</h1>
                <p>${accessResult.message}</p>
                <p>Please contact your training coordinator for assistance.</p>
                <hr style="margin: 2rem 0;">
                <p style="font-size: 0.9rem; color: var(--text-muted);">
                    If you are an administrator, you can bypass this check by adding 
                    <code>?admin=${this.config.adminKey}</code> to the URL.
                </p>
            </div>
        `;
        container.style.display = 'block';
    }
}

class PyodideBridge {
    constructor() {
        this.pyodide = null;
        this.isInitialized = false;
        this.pythonGlobals = {};
        this.simulationFunctions = {};
    }

    async initialize() {
        try {
            console.log('Loading Pyodide...');
            this.updateLoadingStatus('Loading Pyodide runtime...');
            
            this.pyodide = await loadPyodide();
            console.log('Pyodide loaded successfully');

            this.updateLoadingStatus('Loading NumPy...');
            await this.pyodide.loadPackage(['numpy']);
            console.log('NumPy loaded successfully');

            this.updateLoadingStatus('Loading Python modules...');
            await this.loadEmbeddedPythonCode();
            
            this.updateLoadingStatus('Initializing simulation...');
            await this.setupPythonFunctions();

            this.isInitialized = true;
            console.log('PyodideBridge initialized successfully');
            
            return true;

        } catch (error) {
            console.error('Failed to initialize PyodideBridge:', error);
            this.showError(`Failed to initialize simulation environment: ${error.message}`);
            return false;
        }
    }

    updateLoadingStatus(message) {
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    async loadEmbeddedPythonCode() {
        // Load Newton-Raphson solver
        const newtonRaphsonCode = await this.loadPythonModule('newton_raphson');
        this.pyodide.runPython(newtonRaphsonCode);
        console.log('Newton-Raphson solver loaded');

        // Load voltage control system
        const voltageControlCode = await this.loadPythonModule('voltage_control');
        this.pyodide.runPython(voltageControlCode);
        console.log('Voltage control system loaded');
    }

    async loadPythonModule(moduleName) {
        // In development, load from separate files
        // In production, this will be embedded in the HTML
        try {
            const response = await fetch(`/development/embedded_modules/${moduleName}.py`);
            if (!response.ok) {
                throw new Error(`Failed to load ${moduleName}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            // Fallback to embedded content in script tags
            const scriptElement = document.getElementById(`embedded-${moduleName.replace('_', '-')}`);
            if (scriptElement && scriptElement.textContent.trim()) {
                return scriptElement.textContent;
            }
            throw new Error(`Could not load Python module: ${moduleName}`);
        }
    }

    async setupPythonFunctions() {
        // Get references to Python functions
        this.simulationFunctions = {
            simulate_step: this.pyodide.globals.get('simulate_step'),
            update_simulation_parameters: this.pyodide.globals.get('update_simulation_parameters'),
            get_simulation_data: this.pyodide.globals.get('get_simulation_data'),
            reset_simulation: this.pyodide.globals.get('reset_simulation'),
            get_simulation_config: this.pyodide.globals.get('get_simulation_config'),
            validate_simulation_health: this.pyodide.globals.get('validate_simulation_health')
        };

        // Verify all functions are available
        for (const [name, func] of Object.entries(this.simulationFunctions)) {
            if (!func) {
                throw new Error(`Python function not found: ${name}`);
            }
        }
    }

    callPythonFunction(functionName, ...args) {
        if (!this.isInitialized) {
            throw new Error('PyodideBridge not initialized');
        }

        const func = this.simulationFunctions[functionName];
        if (!func) {
            throw new Error(`Python function not found: ${functionName}`);
        }

        try {
            const result = func(...args);
            return result.toJs({dict_converter: Object.fromEntries});
        } catch (error) {
            console.error(`Error calling Python function ${functionName}:`, error);
            throw error;
        }
    }

    showError(message) {
        const errorDisplay = document.getElementById('error-display');
        if (errorDisplay) {
            errorDisplay.innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }
    }
}

class ChartManager {
    constructor() {
        this.voltageChart = null;
        this.reactiveChart = null;
        this.maxDataPoints = 200; // 10 seconds at 50ms
    }

    initialize() {
        this.initializeVoltageChart();
        this.initializeReactiveChart();
    }

    initializeVoltageChart() {
        const ctx = document.getElementById('voltage-chart').getContext('2d');
        
        this.voltageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Voltage Reference',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }, {
                    label: 'Voltage Actual',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} pu`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Voltage (pu)'
                        },
                        min: 0.85,
                        max: 1.15,
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 0 // Disable animation for real-time updates
                }
            }
        });
    }

    initializeReactiveChart() {
        const ctx = document.getElementById('reactive-chart').getContext('2d');
        
        this.reactiveChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Reactive Reference',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }, {
                    label: 'Reactive Actual',
                    data: [],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(4)} pu`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Reactive Power (pu)'
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 0
                }
            }
        });
    }

    updateCharts(data) {
        if (!data || !data.data_arrays) {
            return;
        }

        const chartData = data.data_arrays;
        
        // Update voltage chart
        this.updateChart(this.voltageChart, chartData.time_values, [
            { data: chartData.voltage_reference, label: 'Voltage Reference' },
            { data: chartData.voltage_actual, label: 'Voltage Actual' }
        ]);

        // Update reactive power chart
        this.updateChart(this.reactiveChart, chartData.time_values, [
            { data: chartData.reactive_reference, label: 'Reactive Reference' },
            { data: chartData.reactive_actual, label: 'Reactive Actual' }
        ]);
    }

    updateChart(chart, timeData, datasets) {
        if (!chart || !timeData || timeData.length === 0) {
            return;
        }

        // Update time labels
        chart.data.labels = timeData;

        // Update datasets
        datasets.forEach((dataset, index) => {
            if (chart.data.datasets[index] && dataset.data) {
                chart.data.datasets[index].data = timeData.map((time, i) => ({
                    x: time,
                    y: dataset.data[i] || 0
                }));
            }
        });

        // Set x-axis range for 10-second rolling window
        const latestTime = timeData[timeData.length - 1] || 0;
        const minTime = Math.max(0, latestTime - 10);
        const maxTime = Math.max(10, latestTime);

        chart.options.scales.x.min = minTime;
        chart.options.scales.x.max = maxTime;

        // Update chart without animation
        chart.update('none');
    }

    resetCharts() {
        if (this.voltageChart) {
            this.voltageChart.data.labels = [];
            this.voltageChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            this.voltageChart.update('none');
        }

        if (this.reactiveChart) {
            this.reactiveChart.data.labels = [];
            this.reactiveChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            this.reactiveChart.update('none');
        }
    }
}

class SimulationController {
    constructor(bridge, chartManager) {
        this.bridge = bridge;
        this.chartManager = chartManager;
        this.isRunning = false;
        this.simulationTimer = null;
        this.updateInterval = 50; // milliseconds
        this.voltageReference = 1.0; // per unit
    }

    start() {
        if (this.isRunning || !this.bridge.isInitialized) {
            return;
        }

        console.log('Starting simulation...');
        this.isRunning = true;
        this.updateSimulationStatus('Running');

        this.simulationTimer = setInterval(() => {
            this.step();
        }, this.updateInterval);
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('Stopping simulation...');
        this.isRunning = false;
        this.updateSimulationStatus('Stopped');

        if (this.simulationTimer) {
            clearInterval(this.simulationTimer);
            this.simulationTimer = null;
        }
    }

    step() {
        try {
            // Execute Python simulation step
            const result = this.bridge.callPythonFunction('simulate_step', this.voltageReference);
            
            // Update charts
            this.chartManager.updateCharts(result);
            
            // Update status display
            this.updateStatusDisplay(result);

        } catch (error) {
            console.error('Simulation step error:', error);
            this.stop();
            this.bridge.showError(`Simulation error: ${error.message}`);
        }
    }

    setVoltageReference(value) {
        this.voltageReference = parseFloat(value) / 100.0; // Convert percentage to per-unit
        
        // Update display
        const display = document.getElementById('voltage-display');
        if (display) {
            display.textContent = this.voltageReference.toFixed(2);
        }
    }

    updateParameters(params) {
        try {
            const updated = this.bridge.callPythonFunction('update_simulation_parameters', params);
            console.log('Updated parameters:', updated);

            // Update simulation interval if changed
            if (params.simulation_interval) {
                this.updateInterval = params.simulation_interval;
                
                // Restart simulation with new interval
                if (this.isRunning) {
                    this.stop();
                    setTimeout(() => this.start(), 100);
                }
            }

        } catch (error) {
            console.error('Parameter update error:', error);
            this.bridge.showError(`Parameter update failed: ${error.message}`);
        }
    }

    resetSimulation() {
        try {
            this.stop();
            this.bridge.callPythonFunction('reset_simulation');
            this.chartManager.resetCharts();
            this.updateStatusDisplay({
                current_time: 0,
                iteration: 0,
                voltage_actual: 1.0,
                reactive_actual: 0.0,
                converged: true
            });
            console.log('Simulation reset');
        } catch (error) {
            console.error('Reset error:', error);
            this.bridge.showError(`Reset failed: ${error.message}`);
        }
    }

    updateSimulationStatus(status) {
        const statusElement = document.getElementById('simulation-status');
        const indicatorElement = document.getElementById('status-indicator');
        
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        if (indicatorElement) {
            indicatorElement.className = `status-indicator ${status.toLowerCase()}`;
        }
    }

    updateStatusDisplay(data) {
        const updates = {
            'current-time': data.current_time ? `${data.current_time.toFixed(2)} s` : '0.00 s',
            'iteration-count': data.iteration || '0',
            'power-flow-status': data.converged ? 'Converged' : 'Failed',
            'bus-voltage': data.voltage_actual ? `${data.voltage_actual.toFixed(3)} pu` : '1.000 pu',
            'reactive-power': data.reactive_actual ? `${data.reactive_actual.toFixed(3)} pu` : '0.000 pu'
        };

        for (const [id, value] of Object.entries(updates)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    }
}

class VoltageExerciseApp {
    constructor() {
        this.security = new SecurityManager();
        this.bridge = new PyodideBridge();
        this.chartManager = new ChartManager();
        this.simulationController = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Check access permissions
            const accessCheck = this.security.checkAccess();
            if (!accessCheck.allowed) {
                this.security.showAccessDenied(accessCheck);
                return false;
            }

            console.log('Access granted:', accessCheck.reason);

            // Initialize Python bridge
            const bridgeInitialized = await this.bridge.initialize();
            if (!bridgeInitialized) {
                return false;
            }

            // Initialize charts
            this.chartManager.initialize();

            // Initialize simulation controller
            this.simulationController = new SimulationController(this.bridge, this.chartManager);

            // Set up UI event handlers
            this.setupEventHandlers();

            // Initialize UI values
            this.initializeUI();

            // Hide loading overlay and show application
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';

            this.isInitialized = true;
            console.log('Voltage Tuning Exercise initialized successfully');

            // Auto-start simulation
            setTimeout(() => {
                if (this.simulationController) {
                    this.simulationController.start();
                }
            }, 1000);

            return true;

        } catch (error) {
            console.error('Application initialization error:', error);
            this.bridge.showError(`Application initialization failed: ${error.message}`);
            return false;
        }
    }

    setupEventHandlers() {
        // Voltage control handlers
        const voltageSlider = document.getElementById('voltage-slider');
        const voltageUp = document.getElementById('voltage-up');
        const voltageDown = document.getElementById('voltage-down');

        if (voltageSlider) {
            voltageSlider.addEventListener('input', (e) => {
                this.simulationController.setVoltageReference(e.target.value);
            });
        }

        if (voltageUp) {
            voltageUp.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const newValue = Math.min(110, currentValue + 0.5);
                voltageSlider.value = newValue;
                this.simulationController.setVoltageReference(newValue);
            });
        }

        if (voltageDown) {
            voltageDown.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const newValue = Math.max(90, currentValue - 0.5);
                voltageSlider.value = newValue;
                this.simulationController.setVoltageReference(newValue);
            });
        }

        // Parameter update handlers
        const parameterInputs = [
            'update-rate', 'noise-level', 'system-reactance', 
            'plant-time-constant', 'voltage-kp', 'voltage-ki'
        ];

        parameterInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateSimulationParameters();
                });
            }
        });

        // Reset button handler
        const resetButton = document.getElementById('reset-simulation');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.simulationController.resetSimulation();
            });
        }

        // Window event handlers
        window.addEventListener('beforeunload', () => {
            if (this.simulationController) {
                this.simulationController.stop();
            }
        });
    }

    initializeUI() {
        // Set initial voltage reference
        this.simulationController.setVoltageReference(100);
    }

    updateSimulationParameters() {
        const params = {
            simulation_interval: parseInt(document.getElementById('update-rate').value),
            noise_level: parseFloat(document.getElementById('noise-level').value),
            system_reactance: parseFloat(document.getElementById('system-reactance').value),
            plant_time_constant: parseFloat(document.getElementById('plant-time-constant').value),
            voltage_kp: parseFloat(document.getElementById('voltage-kp').value),
            voltage_ki: parseFloat(document.getElementById('voltage-ki').value)
        };

        this.simulationController.updateParameters(params);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Voltage Tuning Exercise...');
    
    const app = new VoltageExerciseApp();
    const success = await app.initialize();
    
    if (!success) {
        console.error('Failed to initialize application');
    }
});

// Export for debugging
window.VoltageExerciseApp = VoltageExerciseApp;