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

// Chart Manager
class ChartManager {
    constructor() {
        this.voltageChart = null;
        this.reactiveChart = null;
        this.maxDataPoints = 200; // 10 seconds at 50ms
        this.retryManager = new RetryManager();
        
        // Autoscaling parameters
        this.reactivePowerHistory = [];
        this.voltageHistory = [];
        this.movingAverageWindow = 50; // ~2.5 seconds at 50ms for range calculation
        this.centerWindow = 100; // ~5 seconds at 50ms for center calculation (longer = more stable)
        this.scaleUpdateThreshold = 10; // Update scale every N data points
        this.scaleUpdateCounter = 0;
        
        // Gradual center tracking for smoother transitions
        this.currentReactiveCenter = 0; // Tracks current center point
        this.centerTrackingSpeed = 0.1; // How fast center moves toward target (0.1 = 10% per update)
        
        // Asymmetric scaling speeds for different behaviors
        this.scaleExpandSpeed = 0.3; // Fast expansion to show new peaks (30% per update)
        this.scaleContractSpeed = 0.05; // Slow contraction to avoid rapid zoom-in (5% per update)
        
        // Current scale tracking
        this.currentReactiveSpan = 0.1; // Tracks current span size
        this.currentVoltageSpan = 0.1; // Tracks voltage span size
        
        // Scale holding (expand-only mode)
        this.holdScaling = false;
        this.heldVoltageScale = { min: null, max: null };
        this.heldReactiveScale = { min: null, max: null };
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

    updateReactivePowerScale() {
        if (!this.reactiveChart || this.reactivePowerHistory.length < 10) return;

        // Calculate target center point using longer window for stability
        const targetCenter = this.calculateMovingAverage(this.reactivePowerHistory, this.centerWindow);
        
        // Gradually move current center toward target center for smooth transitions
        this.currentReactiveCenter += (targetCenter - this.currentReactiveCenter) * this.centerTrackingSpeed;
        
        // Calculate current data range for span calculation (shorter window for responsiveness)
        const range = this.calculateDataRange(this.reactivePowerHistory, this.movingAverageWindow);
        const dataSpan = Math.max(Math.abs(range.max - this.currentReactiveCenter), Math.abs(range.min - this.currentReactiveCenter));
        
        // Set minimum span for stability (avoid constant zooming)
        const minSpan = 0.05;
        const targetSpan = Math.max(dataSpan * 1.2, minSpan); // 20% margin
        
        // Asymmetric span tracking - fast expand, slow contract
        if (targetSpan > this.currentReactiveSpan) {
            // Expanding - use fast speed to show new peaks quickly
            this.currentReactiveSpan += (targetSpan - this.currentReactiveSpan) * this.scaleExpandSpeed;
        } else {
            // Contracting - use slow speed to avoid jarring zoom-in
            this.currentReactiveSpan += (targetSpan - this.currentReactiveSpan) * this.scaleContractSpeed;
        }
        
        // Calculate proposed new scale using smoothed center and span
        let newMin = this.currentReactiveCenter - this.currentReactiveSpan;
        let newMax = this.currentReactiveCenter + this.currentReactiveSpan;
        
        // Apply hold scaling logic if enabled
        if (this.holdScaling) {
            const currentMin = this.reactiveChart.options.scales.y.min;
            const currentMax = this.reactiveChart.options.scales.y.max;
            
            // Initialize held scale if not set
            if (this.heldReactiveScale.min === null) {
                this.heldReactiveScale.min = currentMin;
                this.heldReactiveScale.max = currentMax;
            }
            
            // Only expand the scale, never contract
            newMin = Math.min(newMin, this.heldReactiveScale.min);
            newMax = Math.max(newMax, this.heldReactiveScale.max);
            
            // Update held scale
            this.heldReactiveScale.min = newMin;
            this.heldReactiveScale.max = newMax;
        }
        
        // Update chart scale
        const yScale = this.reactiveChart.options.scales.y;
        yScale.min = newMin;
        yScale.max = newMax;
        
        const holdStatus = this.holdScaling ? ' (HOLD)' : '';
        const behavior = targetSpan > this.currentReactiveSpan ? 'EXPAND' : 'CONTRACT';
        console.log(`Reactive Power Scale${holdStatus}: ${behavior} Target=${targetCenter.toFixed(4)}, Current=${this.currentReactiveCenter.toFixed(4)}, Span=${this.currentReactiveSpan.toFixed(4)}, Range=[${yScale.min.toFixed(4)}, ${yScale.max.toFixed(4)}]`);
    }

    updateVoltageScale() {
        if (!this.voltageChart || this.voltageHistory.length < 10) return;

        // Calculate data range over recent history
        const range = this.calculateDataRange(this.voltageHistory, this.movingAverageWindow * 2); // Longer window for voltage
        const center = (range.min + range.max) / 2;
        const dataSpan = range.max - range.min;
        
        // Set minimum and maximum spans for reasonable bounds
        const minSpan = 0.02; // Minimum 0.02 pu range (2%)
        const maxSpan = 0.3;  // Maximum 0.3 pu range (30%) 
        const targetSpan = Math.max(Math.min(dataSpan * 1.5, maxSpan), minSpan); // 50% margin, with bounds
        
        // Asymmetric span tracking for voltage - fast expand, slow contract
        if (targetSpan > this.currentVoltageSpan) {
            // Expanding - use fast speed to show new voltage excursions quickly
            this.currentVoltageSpan += (targetSpan - this.currentVoltageSpan) * this.scaleExpandSpeed;
        } else {
            // Contracting - use slow speed to avoid jarring voltage zoom-in
            this.currentVoltageSpan += (targetSpan - this.currentVoltageSpan) * this.scaleContractSpeed;
        }
        
        // Keep within reasonable voltage bounds using smoothed span
        let newMin = Math.max(center - this.currentVoltageSpan/2, 0.7);  // Never below 0.7 pu
        let newMax = Math.min(center + this.currentVoltageSpan/2, 1.3);  // Never above 1.3 pu
        
        // Ensure minimum span is maintained even with bounds
        if (newMax - newMin < minSpan) {
            const midPoint = (newMin + newMax) / 2;
            newMin = midPoint - minSpan/2;
            newMax = midPoint + minSpan/2;
        }
        
        // Apply hold scaling logic if enabled
        if (this.holdScaling) {
            const currentMin = this.voltageChart.options.scales.y.min;
            const currentMax = this.voltageChart.options.scales.y.max;
            
            // Initialize held scale if not set
            if (this.heldVoltageScale.min === null) {
                this.heldVoltageScale.min = currentMin;
                this.heldVoltageScale.max = currentMax;
            }
            
            // Only expand the scale, never contract
            newMin = Math.min(newMin, this.heldVoltageScale.min);
            newMax = Math.max(newMax, this.heldVoltageScale.max);
            
            // Update held scale
            this.heldVoltageScale.min = newMin;
            this.heldVoltageScale.max = newMax;
        }
        
        // Update chart scale
        const yScale = this.voltageChart.options.scales.y;
        yScale.min = newMin;
        yScale.max = newMax;
        
        const holdStatus = this.holdScaling ? ' (HOLD)' : '';
        const behavior = targetSpan > this.currentVoltageSpan ? 'EXPAND' : 'CONTRACT';
        console.log(`Voltage Scale${holdStatus}: ${behavior} Span=${this.currentVoltageSpan.toFixed(4)}, Range=[${newMin.toFixed(4)}, ${newMax.toFixed(4)}]`);
    }

    updateCharts(data) {
        if (!data || !data.data_arrays) {
            return;
        }

        const chartData = data.data_arrays;
        
        // Collect data for autoscaling (use the latest actual values)
        if (chartData.voltage_actual && chartData.voltage_actual.length > 0) {
            const latestVoltage = chartData.voltage_actual[chartData.voltage_actual.length - 1];
            this.voltageHistory.push(latestVoltage);
            
            // Maintain history size
            if (this.voltageHistory.length > this.maxDataPoints) {
                this.voltageHistory.shift();
            }
        }

        if (chartData.reactive_actual && chartData.reactive_actual.length > 0) {
            const latestReactive = chartData.reactive_actual[chartData.reactive_actual.length - 1];
            this.reactivePowerHistory.push(latestReactive);
            
            // Maintain history size
            if (this.reactivePowerHistory.length > this.maxDataPoints) {
                this.reactivePowerHistory.shift();
            }
        }

        // Apply autoscaling periodically (not every update for performance)
        this.scaleUpdateCounter++;
        if (this.scaleUpdateCounter >= this.scaleUpdateThreshold) {
            this.scaleUpdateCounter = 0;
            this.updateVoltageScale();
            this.updateReactivePowerScale();
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
            
            // Reset voltage scale to default
            this.voltageChart.options.scales.y.min = 0.95;
            this.voltageChart.options.scales.y.max = 1.05;
            
            this.voltageChart.update('none');
        }

        if (this.reactiveChart) {
            this.reactiveChart.data.labels = [];
            this.reactiveChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            
            // Reset reactive power scale to default
            this.reactiveChart.options.scales.y.min = -0.1;
            this.reactiveChart.options.scales.y.max = 0.1;
            
            this.reactiveChart.update('none');
        }

        // Clear autoscaling history
        this.voltageHistory = [];
        this.reactivePowerHistory = [];
        this.scaleUpdateCounter = 0;
        
        // Reset center tracking and span tracking
        this.currentReactiveCenter = 0;
        this.currentReactiveSpan = 0.1;
        this.currentVoltageSpan = 0.1;
        
        console.log('Charts reset with autoscaling history cleared');
    }

    // Scale holding control methods
    setHoldScaling(enabled) {
        this.holdScaling = enabled;
        
        if (!enabled) {
            // Clear held scales when disabling
            this.heldVoltageScale = { min: null, max: null };
            this.heldReactiveScale = { min: null, max: null };
        }
        
        console.log(`Scale holding ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    resetScales() {
        // Reset to default scales
        if (this.voltageChart) {
            this.voltageChart.options.scales.y.min = 0.95;
            this.voltageChart.options.scales.y.max = 1.05;
            this.voltageChart.update('none');
        }

        if (this.reactiveChart) {
            this.reactiveChart.options.scales.y.min = -0.1;
            this.reactiveChart.options.scales.y.max = 0.1;
            this.reactiveChart.update('none');
        }

        // Clear held scales
        this.heldVoltageScale = { min: null, max: null };
        this.heldReactiveScale = { min: null, max: null };
        
        // Reset center tracking and span tracking
        this.currentReactiveCenter = 0;
        this.currentReactiveSpan = 0.1;
        this.currentVoltageSpan = 0.1;
        
        console.log('Chart scales reset to defaults');
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

        // Chart control handlers
        const holdScalingCheckbox = document.getElementById('hold-scaling');
        if (holdScalingCheckbox) {
            holdScalingCheckbox.addEventListener('change', () => {
                this.chartManager.setHoldScaling(holdScalingCheckbox.checked);
            });
        }

        const resetScalingButton = document.getElementById('reset-scaling');
        if (resetScalingButton) {
            resetScalingButton.addEventListener('click', () => {
                this.chartManager.resetScales();
                
                // Also uncheck the hold scaling checkbox if it's enabled
                if (holdScalingCheckbox && holdScalingCheckbox.checked) {
                    holdScalingCheckbox.checked = false;
                    this.chartManager.setHoldScaling(false);
                }
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