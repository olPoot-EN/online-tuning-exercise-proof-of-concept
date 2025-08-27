// Security Manager
class SecurityManager {
    constructor() {
        this.config = {
            startDate: "2024-02-01",
            expirationDays: 90,
            bypassEnabled: true,
            adminKey: "reactive_admin_2024"
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
        if (localStorage.getItem('reactive_admin') === this.config.adminKey) {
            return true;
        }

        // Check for development environment indicators
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.protocol === 'file:' ||
            window.location.hostname.endsWith('.github.io')) {
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

// Pyodide Bridge
class PyodideBridge {
    constructor() {
        this.pyodide = null;
        this.isInitialized = false;
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
        try {
            // Load Newton-Raphson solver from embedded script
            const newtonScript = document.getElementById('embedded-newton-raphson');
            if (newtonScript) {
                this.pyodide.runPython(newtonScript.textContent);
                console.log('Newton-Raphson solver loaded from embedded script');
            }

            // Load voltage control system from embedded script  
            const voltageScript = document.getElementById('embedded-voltage-control');
            if (voltageScript) {
                this.pyodide.runPython(voltageScript.textContent);
                console.log('Voltage control system loaded from embedded script');
            }
        } catch (error) {
            console.error('Failed to load Python modules:', error);
            throw new Error(`Failed to load Python modules: ${error.message}`);
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
            // Convert JavaScript objects to Python dictionaries
            const pythonArgs = args.map(arg => {
                if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
                    // Convert JavaScript object to Python dict
                    return this.pyodide.toPy(arg);
                }
                return arg;
            });
            
            const result = func(...pythonArgs);
            
            // Convert Python result back to JavaScript
            if (result && typeof result.toJs === 'function') {
                return result.toJs({dict_converter: Object.fromEntries});
            }
            return result;
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

// Chart Manager
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
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
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
                        ticks: {
                            callback: function(value, index, ticks) {
                                return value.toFixed(1);
                            },
                            stepSize: 1.0
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Voltage (pu)'
                        },
                        min: 0.85,
                        max: 1.15
                    }
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
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
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
                        ticks: {
                            callback: function(value, index, ticks) {
                                return value.toFixed(1);
                            },
                            stepSize: 1.0
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Reactive Power (pu)'
                        },
                        suggestedMin: -0.1,
                        suggestedMax: 0.1
                    }
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

        // Round time values to prevent floating point precision issues
        const roundedTimeData = timeData.map(t => Math.round(t * 100) / 100);

        // Update time labels
        chart.data.labels = roundedTimeData;

        // Update datasets
        datasets.forEach((dataset, index) => {
            if (chart.data.datasets[index] && dataset.data) {
                chart.data.datasets[index].data = roundedTimeData.map((time, i) => ({
                    x: time,
                    y: dataset.data[i] || 0
                }));
            }
        });

        // Set x-axis range for 10-second rolling window with fixed precision
        const latestTime = roundedTimeData[roundedTimeData.length - 1] || 0;
        const minTime = Math.max(0, Math.round((latestTime - 10) * 100) / 100);
        const maxTime = Math.max(10, Math.round((latestTime + 0.1) * 100) / 100);

        // Only update axis range if there's a significant change to prevent jarring rescaling
        const currentMin = chart.options.scales.x.min || 0;
        const currentMax = chart.options.scales.x.max || 10;
        
        if (Math.abs(minTime - currentMin) > 0.05 || Math.abs(maxTime - currentMax) > 0.05) {
            chart.options.scales.x.min = minTime;
            chart.options.scales.x.max = maxTime;
        }

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

// Simulation Controller
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
        this.step(); // Initial call to start the loop
    }

    stop() {
        if (!this.isRunning) {
            return;
        }
        console.log('Stopping simulation...');
        this.isRunning = false;
        this.updateSimulationStatus('Stopped');
        if (this.simulationTimer) {
            clearTimeout(this.simulationTimer); // Clear any pending step
            this.simulationTimer = null;
        }
    }

    step() {
        // This function is now the entire loop
        if (!this.isRunning) {
            return; // Exit condition for the loop
        }

        try {
            const result = this.bridge.callPythonFunction('simulate_step', this.voltageReference);
            this.chartManager.updateCharts(result);
            this.updateStatusDisplay(result);
        } catch (error) {
            console.error('Simulation step error:', error);
            this.stop(); // Stop on error
            this.bridge.showError(`Simulation error: ${error.message}`);
            return; // Don't schedule the next step
        }

        // Schedule the next execution of step
        this.simulationTimer = setTimeout(() => this.step(), this.updateInterval);
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
            console.log('Simulation reset. Restarting...');
            // Restart the simulation after a short delay
            setTimeout(() => this.start(), 100);
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

// Main Application
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

            // Application is ready, waiting for user to start simulation.
            this.simulationController.updateSimulationStatus('Ready');

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
                // Use 'input' event for immediate response as user types
                element.addEventListener('input', () => {
                    console.log(`Parameter ${id} changed to:`, element.value);
                    this.updateSimulationParameters();
                });
                // Also listen for 'change' event for when field loses focus
                element.addEventListener('change', () => {
                    console.log(`Parameter ${id} final change to:`, element.value);
                    this.updateSimulationParameters();
                });
            } else {
                console.warn(`Parameter input element not found: ${id}`);
            }
        });

        // Simulation control button handlers
        const startButton = document.getElementById('start-simulation');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.simulationController.start();
            });
        }

        const stopButton = document.getElementById('stop-simulation');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                this.simulationController.stop();
            });
        }

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
        
        // Initialize form values from Python simulation config
        this.initializeParameterValues();
    }
    
    initializeParameterValues() {
        try {
            const config = this.bridge.callPythonFunction('get_simulation_config');
            console.log('Initial simulation config:', config);
            
            // Update form inputs with actual Python values
            if (config) {
                document.getElementById('update-rate').value = config.simulation_interval;
                document.getElementById('noise-level').value = config.noise_level;
                document.getElementById('system-reactance').value = config.system_reactance;
                document.getElementById('plant-time-constant').value = config.plant_time_constant;
                document.getElementById('voltage-kp').value = config.voltage_kp;
                document.getElementById('voltage-ki').value = config.voltage_ki;
            }
        } catch (error) {
            console.warn('Could not initialize parameter values:', error);
        }
    }

    updateSimulationParameters() {
        const params = {};
        
        const paramConfigs = {
            simulation_interval: 'update-rate',
            noise_level: 'noise-level',
            system_reactance: 'system-reactance',
            plant_time_constant: 'plant-time-constant',
            voltage_kp: 'voltage-kp',
            voltage_ki: 'voltage-ki'
        };

        for (const [key, id] of Object.entries(paramConfigs)) {
            const element = document.getElementById(id);
            if (element && element.value) { // Check if value is not empty
                let value = parseFloat(element.value); // Use let
                if (!isNaN(value)) { // Check if parsing was successful
                    
                    // Enforce a minimum update rate to prevent instability
                    if (key === 'simulation_interval' && value < 10) {
                        value = 10; // Clamp to 10ms minimum
                        element.value = value;
                    }
                    
                    params[key] = value;
                }
            }
        }

        // Only call the update function if there are valid parameters to update
        if (Object.keys(params).length > 0) {
            console.log('Updating parameters:', params);
            this.simulationController.updateParameters(params);
        }
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