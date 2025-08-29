// Retry Manager for handling race conditions and network issues
class RetryManager {
    constructor() {
        this.defaultConfig = {
            maxAttempts: 5,
            initialDelay: 100, // ms
            maxDelay: 5000, // ms
            backoffFactor: 2,
            jitter: true
        };
    }

    async withRetry(operation, config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        let lastError;
        
        for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
            try {
                const result = await operation(attempt);
                return { success: true, result, attempt };
            } catch (error) {
                lastError = error;
                console.warn(`Attempt ${attempt}/${finalConfig.maxAttempts} failed:`, error.message);
                
                if (attempt === finalConfig.maxAttempts) {
                    break;
                }
                
                const delay = this.calculateDelay(attempt, finalConfig);
                console.log(`Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        
        return { success: false, error: lastError, attempts: finalConfig.maxAttempts };
    }

    calculateDelay(attempt, config) {
        let delay = Math.min(
            config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
            config.maxDelay
        );
        
        if (config.jitter) {
            // Add ±25% jitter to prevent thundering herd
            const jitterRange = delay * 0.25;
            delay += (Math.random() - 0.5) * 2 * jitterRange;
        }
        
        return Math.max(50, Math.floor(delay)); // Minimum 50ms delay
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Specific retry configurations for different types of operations
    static getConfig(type) {
        const configs = {
            'dependency-load': {
                maxAttempts: 8,
                initialDelay: 100,
                maxDelay: 2000,
                backoffFactor: 1.5
            },
            'network-request': {
                maxAttempts: 5,
                initialDelay: 500,
                maxDelay: 5000,
                backoffFactor: 2
            },
            'initialization': {
                maxAttempts: 3,
                initialDelay: 200,
                maxDelay: 1000,
                backoffFactor: 2
            }
        };
        
        return configs[type] || {};
    }
}

// Loading Manager for enhanced UI feedback
class LoadingManager {
    constructor() {
        this.currentStep = null;
        this.totalSteps = 5;
        this.completedSteps = 0;
    }

    setStep(stepId, status = 'active', message = '', detail = '') {
        // Update previous step to completed if this is a new step
        if (this.currentStep && this.currentStep !== stepId && status === 'active') {
            this.setStepCompleted(this.currentStep);
        }

        const stepElement = document.getElementById(stepId);
        const statusElement = document.getElementById('loading-status');
        const detailElement = document.getElementById('loading-detail');
        const progressElement = document.getElementById('loading-progress');

        if (stepElement) {
            stepElement.className = `loading-step ${status}`;
        }

        if (statusElement && message) {
            statusElement.textContent = message;
        }

        if (detailElement && detail) {
            detailElement.textContent = detail;
        }

        // Update progress bar
        if (status === 'completed') {
            this.completedSteps++;
        }
        
        if (progressElement) {
            const progress = (this.completedSteps / this.totalSteps) * 100;
            progressElement.style.width = `${progress}%`;
        }

        this.currentStep = stepId;
    }

    setStepCompleted(stepId) {
        const stepElement = document.getElementById(stepId);
        if (stepElement) {
            stepElement.className = 'loading-step completed';
        }
        this.completedSteps++;
    }

    setStepError(stepId, errorMessage) {
        const stepElement = document.getElementById(stepId);
        const detailElement = document.getElementById('loading-detail');
        
        if (stepElement) {
            stepElement.className = 'loading-step error';
        }

        if (detailElement) {
            detailElement.textContent = errorMessage;
            detailElement.style.color = 'var(--accent-color)';
        }
    }

    updateRetryStatus(stepId, attempt, maxAttempts, error = null) {
        const message = error ? 
            `Retrying... (attempt ${attempt}/${maxAttempts})` :
            `Loading... (attempt ${attempt}/${maxAttempts})`;
            
        const detail = error ?
            `Issue: ${error.message.split(' - ')[0]}` :
            'This may take a moment on first load';

        this.setStep(stepId, 'active', message, detail);
    }

    complete() {
        const statusElement = document.getElementById('loading-status');
        const detailElement = document.getElementById('loading-detail');
        const progressElement = document.getElementById('loading-progress');

        if (statusElement) {
            statusElement.textContent = 'Ready to use!';
        }

        if (detailElement) {
            detailElement.textContent = 'Application initialized successfully';
            detailElement.style.color = 'var(--success-color)';
        }

        if (progressElement) {
            progressElement.style.width = '100%';
            progressElement.style.background = 'var(--success-color)';
        }

        // Mark all steps as completed
        ['step-pyodide', 'step-numpy', 'step-charts', 'step-python', 'step-simulation'].forEach(id => {
            this.setStepCompleted(id);
        });
    }

    showError(message, detail = '') {
        const statusElement = document.getElementById('loading-status');
        const detailElement = document.getElementById('loading-detail');

        if (statusElement) {
            statusElement.textContent = 'Initialization Failed';
            statusElement.style.color = 'var(--accent-color)';
        }

        if (detailElement) {
            detailElement.innerHTML = `${detail}<br><strong>Please refresh the page to try again</strong>`;
            detailElement.style.color = 'var(--accent-color)';
        }
    }
}

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
        this.retryManager = new RetryManager();
        this.loadingManager = new LoadingManager();
    }

    async initialize() {
        try {
            // Step 1: Load Pyodide with retry logic
            console.log('Loading Pyodide...');
            this.loadingManager.setStep('step-pyodide', 'active', 'Loading Pyodide runtime...', 'Downloading WebAssembly runtime (~3MB)');
            
            const pyodideResult = await this.retryManager.withRetry(async (attempt) => {
                if (attempt > 1) {
                    this.loadingManager.updateRetryStatus('step-pyodide', attempt, 8);
                }
                
                // Check if loadPyodide is available
                if (typeof loadPyodide === 'undefined') {
                    throw new Error('loadPyodide function not available - CDN script may not be loaded yet');
                }
                
                return await loadPyodide();
            }, RetryManager.getConfig('dependency-load'));

            if (!pyodideResult.success) {
                this.loadingManager.setStepError('step-pyodide', 'Failed to load Pyodide runtime');
                throw new Error(`Failed to load Pyodide after ${pyodideResult.attempts} attempts: ${pyodideResult.error.message}`);
            }
            
            this.pyodide = pyodideResult.result;
            this.loadingManager.setStep('step-pyodide', 'completed');
            console.log(`Pyodide loaded successfully on attempt ${pyodideResult.attempt}`);

            // Step 2: Load NumPy with retry logic
            this.loadingManager.setStep('step-numpy', 'active', 'Loading NumPy...', 'Downloading scientific computing library (~8MB)');
            const numpyResult = await this.retryManager.withRetry(async (attempt) => {
                if (attempt > 1) {
                    this.loadingManager.updateRetryStatus('step-numpy', attempt, 5, numpyResult.error);
                }
                return await this.pyodide.loadPackage(['numpy']);
            }, RetryManager.getConfig('network-request'));

            if (!numpyResult.success) {
                this.loadingManager.setStepError('step-numpy', 'Failed to load NumPy package');
                throw new Error(`Failed to load NumPy after ${numpyResult.attempts} attempts: ${numpyResult.error.message}`);
            }
            
            this.loadingManager.setStep('step-numpy', 'completed');
            console.log(`NumPy loaded successfully on attempt ${numpyResult.attempt}`);

            // Step 3: Load Python modules with retry logic
            this.loadingManager.setStep('step-python', 'active', 'Loading Python modules...', 'Loading Newton-Raphson and control system code');
            const moduleResult = await this.retryManager.withRetry(async (attempt) => {
                if (attempt > 1) {
                    this.loadingManager.updateRetryStatus('step-python', attempt, 3, moduleResult.error);
                }
                return await this.loadEmbeddedPythonCode();
            }, RetryManager.getConfig('initialization'));

            if (!moduleResult.success) {
                this.loadingManager.setStepError('step-python', 'Failed to load Python modules');
                throw new Error(`Failed to load Python modules after ${moduleResult.attempts} attempts: ${moduleResult.error.message}`);
            }
            
            this.loadingManager.setStep('step-python', 'completed');
            
            // Step 4: Setup Python functions with retry logic
            this.loadingManager.setStep('step-simulation', 'active', 'Setting up simulation...', 'Initializing simulation functions and state');
            const setupResult = await this.retryManager.withRetry(async (attempt) => {
                if (attempt > 1) {
                    this.loadingManager.updateRetryStatus('step-simulation', attempt, 3, setupResult.error);
                }
                return await this.setupPythonFunctions();
            }, RetryManager.getConfig('initialization'));

            if (!setupResult.success) {
                this.loadingManager.setStepError('step-simulation', 'Failed to setup simulation');
                throw new Error(`Failed to setup simulation functions after ${setupResult.attempts} attempts: ${setupResult.error.message}`);
            }

            this.loadingManager.setStep('step-simulation', 'completed');
            this.isInitialized = true;
            console.log('PyodideBridge initialized successfully with retry support');
            
            return true;

        } catch (error) {
            console.error('Failed to initialize PyodideBridge:', error);
            this.loadingManager.showError('Initialization Failed', error.message);
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




// Simple Chart Manager using Chart.js built-in scaling
class ChartManager {
    constructor() {
        this.voltageChart = null;
        this.reactiveChart = null;
        this.retryManager = new RetryManager();
        
        console.log('ChartManager initialized with Chart.js built-in scaling');
    }

    async initialize() {
        // Initialize voltage chart with retry logic
        const voltageResult = await this.retryManager.withRetry(async (attempt) => {
            console.log(`Initializing voltage chart (attempt ${attempt})...`);
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js library not available - CDN script may not be loaded yet');
            }
            
            return this.initializeVoltageChart();
        }, RetryManager.getConfig('dependency-load'));

        if (!voltageResult.success) {
            throw new Error(`Failed to initialize voltage chart after ${voltageResult.attempts} attempts: ${voltageResult.error.message}`);
        }

        // Initialize reactive chart with retry logic
        const reactiveResult = await this.retryManager.withRetry(async (attempt) => {
            console.log(`Initializing reactive chart (attempt ${attempt})...`);
            return this.initializeReactiveChart();
        }, RetryManager.getConfig('initialization'));

        if (!reactiveResult.success) {
            throw new Error(`Failed to initialize reactive chart after ${reactiveResult.attempts} attempts: ${reactiveResult.error.message}`);
        }

        console.log('Chart Manager initialized successfully with retry support');
        return true;
    }

    initializeVoltageChart() {
        const ctx = document.getElementById('voltage-chart').getContext('2d');
        
        this.voltageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Reference',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 1.5
                }, {
                    label: 'Actual',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Voltage Response',
                        position: 'top',
                        align: 'center',
                        font: {
                            size: 12, /* Reduced from 14 */
                            weight: '600'
                        },
                        color: '#2c3e50',
                        padding: {
                            top: 0,
                            bottom: -15 /* More aggressive negative padding to eliminate space */
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
                            boxWidth: 15, /* Reduced from 20 */
                            padding: 18,   /* Further increased spacing between legend items */
                            font: {
                                size: 11  /* Smaller legend font */
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
                        // Dynamic scaling - will be updated by autoscaling logic
                        min: 0.95,
                        max: 1.05
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
                    label: 'Reference',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 1.5
                }, {
                    label: 'Actual',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Reactive Power Response',
                        position: 'top',
                        align: 'center',
                        font: {
                            size: 12, /* Reduced from 14 */
                            weight: '600'
                        },
                        color: '#2c3e50',
                        padding: {
                            top: 0,
                            bottom: -15 /* More aggressive negative padding to eliminate space */
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'line',
                            boxWidth: 15, /* Reduced from 20 */
                            padding: 18,   /* Further increased spacing between legend items */
                            font: {
                                size: 11  /* Smaller legend font */
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
                        min: -0.2,
                        max: 0.2
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
        
    }
    
    applyInitialChartBounds() {
        // Set reasonable starting bounds for voltage chart (around 1.0 pu)
        if (this.voltageChart) {
            this.voltageChart.options.scales.y.min = 0.9;
            this.voltageChart.options.scales.y.max = 1.1;
            console.log('[Voltage] Initial bounds set: [0.9, 1.1]');
        }
        
        // Set reasonable starting bounds for reactive chart (around 0.0 pu)
        if (this.reactiveChart) {
            this.reactiveChart.options.scales.y.min = -0.2;
            this.reactiveChart.options.scales.y.max = 0.2;
            // Clear suggestedMin/suggestedMax to use explicit min/max
            delete this.reactiveChart.options.scales.y.suggestedMin;
            delete this.reactiveChart.options.scales.y.suggestedMax;
            console.log('[Reactive] Initial bounds set: [-0.2, 0.2]');
        }
    }

    // Sophisticated autoscaling methods
    calculateMovingAverage(data, windowSize) {
        if (data.length === 0) return 0;
        
        const startIndex = Math.max(0, data.length - windowSize);
        const window = data.slice(startIndex);
        const sum = window.reduce((acc, val) => acc + val, 0);
        return sum / window.length;
    }

    calculateDataRange(data, windowSize) {
        if (data.length === 0) return { min: -0.1, max: 0.1 };
        
        const startIndex = Math.max(0, data.length - windowSize);
        const window = data.slice(startIndex);
        const min = Math.min(...window);
        const max = Math.max(...window);
        
        return { min, max };
    }

    // Clean scaling logic using dedicated engine
    updateChartScale(chart, tracker, chartName, currentValue) {
        if (!chart) return;
        
        const currentBounds = {
            min: chart.options.scales.y.min,
            max: chart.options.scales.y.max
        };
        
        console.log(`[${chartName}] Current bounds: [${currentBounds.min.toFixed(3)}, ${currentBounds.max.toFixed(3)}], Value: ${currentValue.toFixed(3)}`);
        
        // Use scaling engine to determine action
        const decision = this.scalingEngine.calculateScaling(tracker, currentBounds, currentValue);
        
        // Apply scaling decision
        if (decision.action === 'expand' || decision.action === 'contract') {
            chart.options.scales.y.min = decision.newBounds.min;
            chart.options.scales.y.max = decision.newBounds.max;
            this.visualFeedback.setOutOfRange(chart, false);
            console.log(`[${chartName}] ${decision.action.toUpperCase()} to [${decision.newBounds.min.toFixed(3)}, ${decision.newBounds.max.toFixed(3)}] - ${decision.reason}`);
        } else if (decision.action === 'constrain') {
            this.visualFeedback.setOutOfRange(chart, true);
            console.log(`[${chartName}] CONSTRAINED - ${decision.reason}`);
        } else {
            this.visualFeedback.setOutOfRange(chart, tracker.isOutOfRange);
        }
    }

    updateReactivePowerScale(currentValue) {
        this.updateChartScale(this.reactiveChart, this.reactiveTracker, 'Reactive', currentValue);
    }

    updateVoltageScale(currentValue) {
        this.updateChartScale(this.voltageChart, this.voltageTracker, 'Voltage', currentValue);
    }

    updateCharts(data) {
        if (!data || !data.data_arrays) {
            return;
        }

        const chartData = data.data_arrays;
        
        // Check both reference and actual signals for scaling
        if (chartData.voltage_actual && chartData.voltage_actual.length > 0) {
            const latestVoltageActual = chartData.voltage_actual[chartData.voltage_actual.length - 1];
            const latestVoltageRef = chartData.voltage_reference[chartData.voltage_reference.length - 1];
            
            // Check both actual and reference values for scaling
            this.checkAndUpdateScale(this.voltageChart, latestVoltageActual);
            this.checkAndUpdateScale(this.voltageChart, latestVoltageRef);
        }

        if (chartData.reactive_actual && chartData.reactive_actual.length > 0) {
            const latestReactiveActual = chartData.reactive_actual[chartData.reactive_actual.length - 1];
            const latestReactiveRef = chartData.reactive_reference[chartData.reactive_reference.length - 1];
            
            // Check both actual and reference values for scaling
            this.checkAndUpdateScale(this.reactiveChart, latestReactiveActual);
            this.checkAndUpdateScale(this.reactiveChart, latestReactiveRef);
        }
        
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
        // Reset chart data
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

        console.log('Charts reset');
    }

    resetChartScales() {
        // Reset to default scales
        if (this.voltageChart) {
            this.voltageChart.options.scales.y.min = 0.95;
            this.voltageChart.options.scales.y.max = 1.05;
            this.voltageChart.update('none');
        }

        if (this.reactiveChart) {
            this.reactiveChart.options.scales.y.min = -0.2;
            this.reactiveChart.options.scales.y.max = 0.2;
            this.reactiveChart.update('none');
        }
        
        console.log('Chart scales reset to defaults');
    }

    checkAndUpdateScale(chart, currentValue) {
        if (!chart || !chart.options.scales.y) return;
        
        const yScale = chart.options.scales.y;
        let needsUpdate = false;
        
        // Get current bounds (Chart.js will set these automatically if not defined)
        let currentMin = yScale.min;
        let currentMax = yScale.max;
        
        // If no bounds set, initialize with reasonable defaults
        if (currentMin === undefined || currentMax === undefined) {
            if (chart === this.voltageChart) {
                currentMin = 0.95;
                currentMax = 1.05;
            } else {
                currentMin = -0.2;
                currentMax = 0.2;
            }
            needsUpdate = true;
        }
        
        // Check if value is out of range
        if (currentValue < currentMin) {
            yScale.min = currentValue - Math.abs(currentValue) * 0.1; // Add 10% margin
            needsUpdate = true;
        }
        
        if (currentValue > currentMax) {
            yScale.max = currentValue + Math.abs(currentValue) * 0.1; // Add 10% margin
            needsUpdate = true;
        }
        
        // Update chart if bounds changed
        if (needsUpdate) {
            chart.update('none'); // Update without animation for performance
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
            this.chartManager.resetChartScales();
            
            // Reset voltage setpoint to 1.0 pu (100%)
            this.setVoltageReference(100);
            const voltageSlider = document.getElementById('voltage-slider');
            if (voltageSlider) {
                voltageSlider.value = 100;
            }
            
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
            this.bridge.loadingManager.setStep('step-charts', 'active', 'Initializing charts...', 'Setting up real-time visualization');
            await this.chartManager.initialize();
            this.bridge.loadingManager.setStep('step-charts', 'completed');

            // Initialize simulation controller
            this.simulationController = new SimulationController(this.bridge, this.chartManager);

            // Set up UI event handlers
            this.setupEventHandlers();

            // Initialize UI values
            this.initializeUI();

            // Complete loading process
            this.bridge.loadingManager.complete();
            
            // Short delay to show completion, then hide loading overlay
            setTimeout(() => {
                document.getElementById('loading-overlay').style.display = 'none';
                document.getElementById('app-container').style.display = 'block';
            }, 800);

            this.isInitialized = true;
            console.log('Voltage Tuning Exercise initialized successfully');

            // Application is ready, waiting for user to start simulation.
            this.simulationController.updateSimulationStatus('Ready');

            return true;

        } catch (error) {
            console.error('Application initialization error:', error);
            
            // Enhanced error recovery with specific guidance
            let errorDetail = '';
            let recoveryGuidance = 'Please refresh the page to try again.';
            
            if (error.message.includes('loadPyodide')) {
                errorDetail = 'CDN script loading issue. This often resolves automatically.';
                recoveryGuidance = 'Please refresh the page. If the problem persists, check your internet connection.';
            } else if (error.message.includes('Chart.js')) {
                errorDetail = 'Chart visualization library loading issue.';
                recoveryGuidance = 'Please refresh the page. Charts are essential for the simulation display.';
            } else if (error.message.includes('NumPy')) {
                errorDetail = 'Scientific computing library download issue.';
                recoveryGuidance = 'Please refresh the page. This is a larger download (~8MB) and may take longer on slow connections.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorDetail = 'Network connectivity issue detected.';
                recoveryGuidance = 'Please check your internet connection and refresh the page. Corporate networks may have restrictions on CDN access.';
            } else {
                errorDetail = error.message;
            }
            
            // Show comprehensive error information
            this.bridge.loadingManager.showError(
                'Initialization Failed', 
                `${errorDetail}<br><br>${recoveryGuidance}<br><br>
                 <em>If problems persist:</em><br>
                 • Try opening in a private/incognito browser window<br>
                 • Disable browser extensions temporarily<br>
                 • Contact IT support for corporate network issues`
            );
            
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

        const resetScalesButton = document.getElementById('reset-chart-scales');
        if (resetScalesButton) {
            resetScalesButton.addEventListener('click', () => {
                this.chartManager.resetChartScales();
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

        // Initialize chart scaling parameter values in UI
        // This will be handled by the parameter initialization method

        // Set dynamic version number based on current timestamp
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const versionNumber = `v${year}.${month}${day}.${hour}${minute}`;

        // Update version in header and status panel
        const headerVersion = document.getElementById('header-version');
        const buildVersion = document.getElementById('build-version');
        
        if (headerVersion) {
            headerVersion.textContent = versionNumber;
        }
        
        if (buildVersion) {
            buildVersion.textContent = versionNumber;
        }

        console.log(`Application version: ${versionNumber}`);
    }
    
    initializeParameterValues() {
        try {
            const config = this.bridge.callPythonFunction('get_simulation_config');
            console.log('Initial simulation config:', config);
            
            // Update form inputs with actual Python values
            if (config) {
                const updateRateElement = document.getElementById('update-rate');
                if (updateRateElement) updateRateElement.value = config.simulation_interval;

                const noiseLevelElement = document.getElementById('noise-level');
                if (noiseLevelElement) noiseLevelElement.value = (config.noise_level * 100).toFixed(1); // Convert pu to %

                const systemReactanceElement = document.getElementById('system-reactance');
                if (systemReactanceElement) systemReactanceElement.value = config.system_reactance;

                const plantTimeConstantElement = document.getElementById('plant-time-constant');
                if (plantTimeConstantElement) plantTimeConstantElement.value = config.plant_time_constant;

                const voltageKpElement = document.getElementById('voltage-kp');
                if (voltageKpElement) voltageKpElement.value = config.voltage_kp;

                const voltageKiElement = document.getElementById('voltage-ki');
                if (voltageKiElement) voltageKiElement.value = config.voltage_ki;
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


        // Process simulation parameters
        for (const [key, id] of Object.entries(paramConfigs)) {
            const element = document.getElementById(id);
            if (element && element.value) {
                let value = parseFloat(element.value);
                if (!isNaN(value)) {
                    if (key === 'simulation_interval' && value < 10) {
                        value = 10;
                        element.value = value;
                    }
                    // Convert noise level from percentage to per-unit for Python
                    if (key === 'noise_level') {
                        value = value / 100.0; // Convert % to pu
                    }
                    params[key] = value;
                }
            }
        }


        if (Object.keys(params).length > 0) {
            console.log('Updating simulation parameters:', params);
            this.simulationController.updateParameters(params);
        }

    }
}

// Initialize application when DOM is loaded with auto-retry
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Voltage Tuning Exercise...');
    
    const app = new VoltageExerciseApp();
    let retryCount = 0;
    const maxRetries = 2; // Total of 3 attempts (initial + 2 retries)
    
    const attemptInitialization = async () => {
        try {
            const success = await app.initialize();
            if (success) {
                console.log('Application initialized successfully');
                
                // Add resize handler to fix chart width issues
                window.addEventListener('resize', () => {
                    // Small delay to ensure layout is settled
                    setTimeout(() => {
                        if (app.chartManager && app.chartManager.voltageChart) {
                            app.chartManager.voltageChart.resize();
                        }
                        if (app.chartManager && app.chartManager.reactiveChart) {
                            app.chartManager.reactiveChart.resize();
                        }
                    }, 100);
                });
                
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Initialization attempt ${retryCount + 1} failed:`, error);
            return false;
        }
    };
    
    // Initial attempt
    let success = await attemptInitialization();
    
    // Retry logic for race condition failures
    while (!success && retryCount < maxRetries) {
        retryCount++;
        console.log(`Auto-retry ${retryCount}/${maxRetries} in 2 seconds...`);
        
        // Update loading status to show auto-retry
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            statusElement.textContent = `Auto-retry ${retryCount}/${maxRetries} - Race condition detected`;
        }
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create new app instance for clean retry
        const newApp = new VoltageExerciseApp();
        success = await attemptInitialization.call({ initialize: () => newApp.initialize() });
    }
    
    if (!success) {
        console.error(`Failed to initialize application after ${retryCount + 1} attempts`);
        // Final error state is already handled by the app's error handling
    }
});

// Export for debugging
window.VoltageExerciseApp = VoltageExerciseApp;