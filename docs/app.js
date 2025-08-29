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
                console.log(`Loading NumPy (attempt ${attempt})...`);
                const result = await this.pyodide.loadPackage(['numpy']);
                console.log('NumPy package loaded successfully');
                return result;
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
                console.log('Loading Newton-Raphson Python module...');
                this.pyodide.runPython(newtonScript.textContent);
                console.log('Newton-Raphson module loaded successfully');
            } else {
                console.warn('Newton-Raphson script element not found');
            }

            // Load voltage control system from embedded script  
            const voltageScript = document.getElementById('embedded-voltage-control');
            if (voltageScript) {
                console.log('Loading voltage control Python module...');
                this.pyodide.runPython(voltageScript.textContent);
                console.log('Voltage control module loaded successfully');
            } else {
                console.warn('Voltage control script element not found');
            }
        } catch (error) {
            console.error('Failed to load Python modules:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw new Error(`Failed to load Python modules: ${error.message}`);
        }
    }

    async setupPythonFunctions() {
        console.log('Setting up Python function references...');
        
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
                console.error(`Python function not found: ${name}`);
                console.log('Available Python globals:', Object.keys(this.pyodide.globals.toJs()));
                throw new Error(`Python function not found: ${name}`);
            } else {
                console.log(`✓ Found Python function: ${name}`);
            }
        }
        
        console.log('All Python functions set up successfully');
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
        this.chartExpansionEnabled = true;
        this.chartContractionEnabled = true;
        
        // Chart time window configuration
        this.headBuffer = 0.5;         // Buffer ahead of current time (leading edge) (seconds)
        this.totalChartTime = 15.0;    // Total time window shown (seconds)  
        this.tailBuffer = 0.2;         // Buffer behind oldest data (trailing edge) (seconds)
        
        // Chart appearance configuration
        this.lineWidth = 1.5;
        this.referenceColor = '#e74c3c';
        this.actualColor = '#3498db';
        this.referenceLineStyle = 'solid';
        this.actualLineStyle = 'solid';
        
        // Calculate actual data storage requirement
        this.calculateDataRequirements();
    }

    calculateDataRequirements() {
        // Python should only store the actual DATA portion - buffers are empty space
        this.dataTimeSpan = this.totalChartTime - this.headBuffer - this.tailBuffer;
        
        // This is the same as the data time span
        this.maxSimulationTime = this.dataTimeSpan;
        
    }

    async initialize() {
        // Initialize voltage chart with retry logic
        const voltageResult = await this.retryManager.withRetry(async (attempt) => {
            
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
                    borderColor: this.referenceColor,
                    backgroundColor: this.hexToRgba(this.referenceColor, 0.1),
                    borderDash: this.getLineDashArray(this.referenceLineStyle),
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: this.lineWidth
                }, {
                    label: 'Actual',
                    data: [],
                    borderColor: this.actualColor,
                    backgroundColor: this.hexToRgba(this.actualColor, 0.1),
                    borderDash: this.getLineDashArray(this.actualLineStyle),
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: this.lineWidth
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
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: -this.tailBuffer,
                        max: this.totalChartTime - this.tailBuffer,
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
                        // Original Chart.js auto-scaling with expansion/contraction control
                        afterDataLimits: (axis) => {
                            const chartManager = this;
                            
                            if (chartManager.chartExpansionEnabled && chartManager.chartContractionEnabled) {
                                // Original behavior: full auto-scaling with minimum range limit
                                const originalRange = axis.max - axis.min;
                                const range = Math.max(originalRange, 0.001); // Increased minimum range to prevent excessive contraction
                                const padding = range * 0.35; // 35% padding
                                
                                // If original range was tiny, center the data and apply minimum range
                                if (originalRange < 0.001) {
                                    const center = (axis.max + axis.min) / 2;
                                    axis.min = center - range / 2 - padding;
                                    axis.max = center + range / 2 + padding;
                                } else {
                                    axis.max += padding;
                                    axis.min -= padding;
                                }
                            } else {
                                // Modified behavior: track manual bounds with minimum range limit
                                const originalRange = axis.max - axis.min;
                                const range = Math.max(originalRange, 0.001); // Increased minimum range to prevent excessive contraction
                                const padding = range * 0.35; // 35% padding
                                
                                let newMin, newMax;
                                // If original range was tiny, center the data and apply minimum range
                                if (originalRange < 0.001) {
                                    const center = (axis.max + axis.min) / 2;
                                    newMin = center - range / 2 - padding;
                                    newMax = center + range / 2 + padding;
                                } else {
                                    newMin = axis.min - padding;
                                    newMax = axis.max + padding;
                                }
                                
                                // Store original bounds if not set
                                if (!axis._storedMin) axis._storedMin = newMin;
                                if (!axis._storedMax) axis._storedMax = newMax;
                                
                                // Apply expansion logic
                                if (chartManager.chartExpansionEnabled && newMin < axis._storedMin) {
                                    axis._storedMin = newMin;
                                }
                                if (chartManager.chartExpansionEnabled && newMax > axis._storedMax) {
                                    axis._storedMax = newMax;
                                }
                                
                                // Apply contraction logic (simplified) with minimum range protection
                                if (chartManager.chartContractionEnabled) {
                                    const currentRange = axis._storedMax - axis._storedMin;
                                    const dataRange = Math.max(newMax - newMin, 0.001); // Increased minimum range protection
                                    if (dataRange < currentRange * 0.8) {
                                        // Ensure contracted range maintains minimum
                                        const center = (newMax + newMin) / 2;
                                        const halfRange = Math.max(dataRange / 2, 0.0005); // Half of minimum range
                                        axis._storedMin = center - halfRange;
                                        axis._storedMax = center + halfRange;
                                    }
                                }
                                
                                axis.min = axis._storedMin;
                                axis.max = axis._storedMax;
                            }
                        }
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
                    borderColor: this.referenceColor,
                    backgroundColor: this.hexToRgba(this.referenceColor, 0.1),
                    borderDash: this.getLineDashArray(this.referenceLineStyle),
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: this.lineWidth
                }, {
                    label: 'Actual',
                    data: [],
                    borderColor: this.actualColor,
                    backgroundColor: this.hexToRgba(this.actualColor, 0.1),
                    borderDash: this.getLineDashArray(this.actualLineStyle),
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: this.lineWidth
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
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: -this.tailBuffer,
                        max: this.totalChartTime - this.tailBuffer,
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
                        // Original Chart.js auto-scaling with expansion/contraction control
                        afterDataLimits: (axis) => {
                            const chartManager = this;
                            
                            if (chartManager.chartExpansionEnabled && chartManager.chartContractionEnabled) {
                                // Original behavior: full auto-scaling with minimum range limit
                                const originalRange = axis.max - axis.min;
                                const range = Math.max(originalRange, 0.001); // Increased minimum range to prevent excessive contraction
                                const padding = range * 0.45; // 45% padding
                                
                                // If original range was tiny, center the data and apply minimum range
                                if (originalRange < 0.001) {
                                    const center = (axis.max + axis.min) / 2;
                                    axis.min = center - range / 2 - padding;
                                    axis.max = center + range / 2 + padding;
                                } else {
                                    axis.max += padding;
                                    axis.min -= padding;
                                }
                            } else {
                                // Modified behavior: track manual bounds with minimum range limit
                                const originalRange = axis.max - axis.min;
                                const range = Math.max(originalRange, 0.001); // Increased minimum range to prevent excessive contraction
                                const padding = range * 0.45; // 45% padding
                                
                                let newMin, newMax;
                                // If original range was tiny, center the data and apply minimum range
                                if (originalRange < 0.001) {
                                    const center = (axis.max + axis.min) / 2;
                                    newMin = center - range / 2 - padding;
                                    newMax = center + range / 2 + padding;
                                } else {
                                    newMin = axis.min - padding;
                                    newMax = axis.max + padding;
                                }
                                
                                // Store original bounds if not set
                                if (!axis._storedMin) axis._storedMin = newMin;
                                if (!axis._storedMax) axis._storedMax = newMax;
                                
                                // Apply expansion logic
                                if (chartManager.chartExpansionEnabled && newMin < axis._storedMin) {
                                    axis._storedMin = newMin;
                                }
                                if (chartManager.chartExpansionEnabled && newMax > axis._storedMax) {
                                    axis._storedMax = newMax;
                                }
                                
                                // Apply contraction logic (simplified) with minimum range protection
                                if (chartManager.chartContractionEnabled) {
                                    const currentRange = axis._storedMax - axis._storedMin;
                                    const dataRange = Math.max(newMax - newMin, 0.001); // Increased minimum range protection
                                    if (dataRange < currentRange * 0.8) {
                                        // Ensure contracted range maintains minimum
                                        const center = (newMax + newMin) / 2;
                                        const halfRange = Math.max(dataRange / 2, 0.0005); // Half of minimum range
                                        axis._storedMin = center - halfRange;
                                        axis._storedMax = center + halfRange;
                                    }
                                }
                                
                                axis.min = axis._storedMin;
                                axis.max = axis._storedMax;
                            }
                        }
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

    // Chart expansion/contraction control methods
    setChartExpansion(enabled) {
        this.chartExpansionEnabled = enabled;
        this.refreshChartScaling();
    }

    setChartContraction(enabled) {
        this.chartContractionEnabled = enabled;
        this.refreshChartScaling();
    }

    refreshChartScaling() {
        // Force chart updates to apply new scaling settings
        if (this.voltageChart) {
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.update('none');
        }
    }

    // Chart time window configuration methods

    setHeadBuffer(value) {
        this.headBuffer = parseFloat(value);
        this.calculateDataRequirements();
        this.updateSimulationDataRequirements();
    }

    setTotalChartTime(value) {
        this.totalChartTime = parseFloat(value);
        this.calculateDataRequirements();
        this.updateChartTimeWindows();
        this.updateSimulationDataRequirements();
    }

    setTailBuffer(value) {
        this.tailBuffer = parseFloat(value);
        this.calculateDataRequirements();
        this.updateSimulationDataRequirements();
    }

    setLineWidth(value) {
        this.lineWidth = value;
        // Update both charts
        if (this.voltageChart) {
            this.voltageChart.data.datasets.forEach(dataset => {
                dataset.borderWidth = this.lineWidth;
            });
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.data.datasets.forEach(dataset => {
                dataset.borderWidth = this.lineWidth;
            });
            this.reactiveChart.update('none');
        }
    }

    setReferenceColor(color) {
        this.referenceColor = color;
        // Update reference dataset in both charts
        if (this.voltageChart) {
            this.voltageChart.data.datasets[0].borderColor = color;
            this.voltageChart.data.datasets[0].backgroundColor = this.hexToRgba(color, 0.1);
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.data.datasets[0].borderColor = color;
            this.reactiveChart.data.datasets[0].backgroundColor = this.hexToRgba(color, 0.1);
            this.reactiveChart.update('none');
        }
    }

    setActualColor(color) {
        this.actualColor = color;
        // Update actual dataset in both charts
        if (this.voltageChart) {
            this.voltageChart.data.datasets[1].borderColor = color;
            this.voltageChart.data.datasets[1].backgroundColor = this.hexToRgba(color, 0.1);
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.data.datasets[1].borderColor = color;
            this.reactiveChart.data.datasets[1].backgroundColor = this.hexToRgba(color, 0.1);
            this.reactiveChart.update('none');
        }
    }

    hexToRgba(hex, alpha) {
        // Convert hex color to rgba
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getLineDashArray(style) {
        // Convert line style to Chart.js borderDash array
        switch (style) {
            case 'dashed': return [10, 5];
            case 'dotted': return [2, 3];
            case 'dash-dot': return [10, 5, 2, 5];
            case 'solid':
            default: return [];
        }
    }

    setReferenceLineStyle(style) {
        this.referenceLineStyle = style;
        const dashArray = this.getLineDashArray(style);
        // Update reference dataset in both charts
        if (this.voltageChart) {
            this.voltageChart.data.datasets[0].borderDash = dashArray;
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.data.datasets[0].borderDash = dashArray;
            this.reactiveChart.update('none');
        }
    }

    setActualLineStyle(style) {
        this.actualLineStyle = style;
        const dashArray = this.getLineDashArray(style);
        // Update actual dataset in both charts
        if (this.voltageChart) {
            this.voltageChart.data.datasets[1].borderDash = dashArray;
            this.voltageChart.update('none');
        }
        if (this.reactiveChart) {
            this.reactiveChart.data.datasets[1].borderDash = dashArray;
            this.reactiveChart.update('none');
        }
    }

    updateChartTimeWindows() {
        // Update both charts' initial time windows
        const minTime = -this.tailBuffer;
        const maxTime = this.totalChartTime - this.tailBuffer;

        if (this.voltageChart) {
            this.voltageChart.options.scales.x.min = minTime;
            this.voltageChart.options.scales.x.max = maxTime;
            this.voltageChart.update('none');
        }
        
        if (this.reactiveChart) {
            this.reactiveChart.options.scales.x.min = minTime;
            this.reactiveChart.options.scales.x.max = maxTime;
            this.reactiveChart.update('none');
        }
    }

    updateSimulationDataRequirements() {
        // Communicate data requirements to Python simulation
        if (window.simulationController && window.simulationController.bridge.isInitialized) {
            try {
                // Python should only store data for the actual DATA portion, not the buffer areas
                const actualDataSpan = this.totalChartTime - this.headBuffer - this.tailBuffer;
                const params = {
                    'data_time_span': actualDataSpan, // Only actual data, not buffers
                    'chart_total_time': this.totalChartTime,
                    'chart_head_buffer': this.headBuffer,
                    'chart_tail_buffer': this.tailBuffer
                };
                window.simulationController.updateParameters(params);
            } catch (error) {
                console.warn('Could not update simulation data requirements:', error);
            }
        }
    }


    // Clean scaling logic using dedicated engine
    updateChartScale(chart, tracker, chartName, currentValue) {
        if (!chart) return;
        
        const currentBounds = {
            min: chart.options.scales.y.min,
            max: chart.options.scales.y.max
        };
        
        
        // Use scaling engine to determine action
        const decision = this.scalingEngine.calculateScaling(tracker, currentBounds, currentValue);
        
        // Apply scaling decision
        if (decision.action === 'expand' || decision.action === 'contract') {
            chart.options.scales.y.min = decision.newBounds.min;
            chart.options.scales.y.max = decision.newBounds.max;
            this.visualFeedback.setOutOfRange(chart, false);
        } else if (decision.action === 'constrain') {
            this.visualFeedback.setOutOfRange(chart, true);
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
        
        // Chart.js auto-scaling handles expansion/contraction automatically
        // No manual scaling logic needed
        
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

        // Set x-axis range: initial fixed window, then rolling window with head and tail buffers
        const latestTime = roundedTimeData[roundedTimeData.length - 1] || 0;
        const transitionPoint = this.maxSimulationTime;
        let minTime, maxTime;

        if (latestTime < transitionPoint) {
            // Initial fixed window: tail buffer before, then full chart time
            minTime = -this.tailBuffer;
            maxTime = this.totalChartTime - this.tailBuffer;
        } else {
            // Rolling window: show tail buffer before oldest data, head buffer after current time
            // Find the oldest data point that should be visible
            const dataTimeSpan = this.totalChartTime - this.headBuffer - this.tailBuffer;
            const oldestDataTime = latestTime - dataTimeSpan;
            
            // Window shows: [tail buffer] + [data from oldestDataTime to latestTime] + [head buffer]
            minTime = Math.max(0, Math.round((oldestDataTime - this.tailBuffer) * 100) / 100);
            maxTime = Math.round((latestTime + this.headBuffer) * 100) / 100;
            
        }

        // Only update axis range if there's a significant change to prevent jarring rescaling
        const currentMin = chart.options.scales.x.min;
        const currentMax = chart.options.scales.x.max;
        
        // Update if the new range is substantially different from the current one
        if (Math.abs(minTime - currentMin) > 0.1 || Math.abs(maxTime - currentMax) > 0.1) {
            chart.options.scales.x.min = minTime;
            chart.options.scales.x.max = maxTime;
        }

        // Update chart without animation
        chart.update('none');
    }

    resetCharts() {
        // Reset chart data and x-axis to initial state
        [this.voltageChart, this.reactiveChart].forEach(chart => {
            if (chart) {
                // Clear data
                chart.data.labels = [];
                chart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });

                // Reset x-axis to the initial configurable window
                chart.options.scales.x.min = -this.tailBuffer;
                chart.options.scales.x.max = this.totalChartTime - this.tailBuffer;

                // Update the chart to apply changes
                chart.update('none');
            }
        });

    }

    resetChartScales() {
        // Clear the stored bounds to restore auto-scaling
        if (this.voltageChart) {
            const yAxis = this.voltageChart.options.scales.y;
            delete yAxis.min;
            delete yAxis.max;
            delete yAxis.suggestedMin;
            delete yAxis.suggestedMax;
            // Clear stored bounds used by expansion/contraction logic
            if (this.voltageChart.scales.y) {
                delete this.voltageChart.scales.y._storedMin;
                delete this.voltageChart.scales.y._storedMax;
            }
            this.voltageChart.update('none');
        }

        if (this.reactiveChart) {
            const yAxis = this.reactiveChart.options.scales.y;
            delete yAxis.min;
            delete yAxis.max;
            delete yAxis.suggestedMin;
            delete yAxis.suggestedMax;
            // Clear stored bounds used by expansion/contraction logic
            if (this.reactiveChart.scales.y) {
                delete this.reactiveChart.scales.y._storedMin;
                delete this.reactiveChart.scales.y._storedMax;
            }
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
        this.isRunning = true;
        this.updateSimulationStatus('Running');
        this.step(); // Initial call to start the loop
    }

    stop() {
        if (!this.isRunning) {
            return;
        }
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
        
        // Update display - show percentage with 1 decimal
        const display = document.getElementById('voltage-display');
        if (display) {
            display.textContent = parseFloat(value).toFixed(1);
        }
    }

    updateParameters(params) {
        try {
            const updated = this.bridge.callPythonFunction('update_simulation_parameters', params);

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
        this.controlsPanelVisible = true;
        this.savedMenuStates = {};
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
            
            // Make simulation controller globally accessible for chart configuration updates
            window.simulationController = this.simulationController;

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
        const voltageUpLarge = document.getElementById('voltage-up-large');
        const voltageDownLarge = document.getElementById('voltage-down-large');
        const coarseAdjust = document.getElementById('coarse-adjust');
        const fineAdjust = document.getElementById('fine-adjust');

        if (voltageSlider) {
            voltageSlider.addEventListener('input', (e) => {
                this.simulationController.setVoltageReference(e.target.value);
            });
        }

        if (voltageUp) {
            voltageUp.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const fineIncrement = parseFloat(fineAdjust.value) || 0.5;
                const newValue = Math.min(110, currentValue + fineIncrement);
                voltageSlider.value = newValue;
                this.simulationController.setVoltageReference(newValue);
            });
        }

        if (voltageDown) {
            voltageDown.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const fineIncrement = parseFloat(fineAdjust.value) || 0.5;
                const newValue = Math.max(90, currentValue - fineIncrement);
                voltageSlider.value = newValue;
                this.simulationController.setVoltageReference(newValue);
            });
        }

        if (voltageUpLarge) {
            voltageUpLarge.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const coarseIncrement = parseFloat(coarseAdjust.value) || 3.0;
                const newValue = Math.min(110, currentValue + coarseIncrement);
                voltageSlider.value = newValue;
                this.simulationController.setVoltageReference(newValue);
            });
        }

        if (voltageDownLarge) {
            voltageDownLarge.addEventListener('click', () => {
                const currentValue = parseFloat(voltageSlider.value);
                const coarseIncrement = parseFloat(coarseAdjust.value) || 3.0;
                const newValue = Math.max(90, currentValue - coarseIncrement);
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
                    this.updateSimulationParameters();
                });
                // Also listen for 'change' event for when field loses focus
                element.addEventListener('change', () => {
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

        // Chart expansion/contraction checkbox handlers
        const chartExpansionCheckbox = document.getElementById('chart-expansion');
        if (chartExpansionCheckbox) {
            chartExpansionCheckbox.addEventListener('change', (e) => {
                this.chartManager.setChartExpansion(e.target.checked);
            });
        }

        const chartContractionCheckbox = document.getElementById('chart-contraction');
        if (chartContractionCheckbox) {
            chartContractionCheckbox.addEventListener('change', (e) => {
                this.chartManager.setChartContraction(e.target.checked);
            });
        }

        // Chart time window configuration handlers
        const headBufferInput = document.getElementById('head-buffer');
        if (headBufferInput) {
            headBufferInput.addEventListener('input', (e) => {
                this.chartManager.setHeadBuffer(e.target.value);
            });
        }

        const totalChartTimeInput = document.getElementById('total-chart-time');
        if (totalChartTimeInput) {
            totalChartTimeInput.addEventListener('input', (e) => {
                this.chartManager.setTotalChartTime(e.target.value);
            });
        }

        const tailBufferInput = document.getElementById('tail-buffer');
        if (tailBufferInput) {
            tailBufferInput.addEventListener('input', (e) => {
                this.chartManager.setTailBuffer(e.target.value);
            });
        }

        // Line width configuration
        const lineWidthInput = document.getElementById('line-width');
        if (lineWidthInput) {
            lineWidthInput.addEventListener('input', (e) => {
                this.chartManager.setLineWidth(parseFloat(e.target.value));
            });
        }

        // Reference color configuration
        const referenceColorInput = document.getElementById('reference-color');
        if (referenceColorInput) {
            referenceColorInput.addEventListener('input', (e) => {
                this.chartManager.setReferenceColor(e.target.value);
            });
        }

        // Actual color configuration
        const actualColorInput = document.getElementById('actual-color');
        if (actualColorInput) {
            actualColorInput.addEventListener('input', (e) => {
                this.chartManager.setActualColor(e.target.value);
            });
        }

        // Reference line style configuration
        const referenceLineStyleSelect = document.getElementById('reference-line-style');
        if (referenceLineStyleSelect) {
            referenceLineStyleSelect.addEventListener('change', (e) => {
                this.chartManager.setReferenceLineStyle(e.target.value);
            });
        }

        // Actual line style configuration
        const actualLineStyleSelect = document.getElementById('actual-line-style');
        if (actualLineStyleSelect) {
            actualLineStyleSelect.addEventListener('change', (e) => {
                this.chartManager.setActualLineStyle(e.target.value);
            });
        }

        // Keyboard shortcut handlers
        document.addEventListener('keydown', (e) => {
            // Prevent shortcuts when user is typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                
                if (e.shiftKey) {
                    // Shift + Space: Reset simulation
                    this.simulationController.resetSimulation();
                } else {
                    // Space: Toggle start/stop simulation
                    if (this.simulationController.isRunning) {
                        this.simulationController.stop();
                    } else {
                        this.simulationController.start();
                    }
                }
            }
            
            // Arrow key voltage adjustment shortcuts
            if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
                e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault(); // Prevent page scroll
                
                const voltageSlider = document.getElementById('voltage-slider');
                const coarseAdjust = document.getElementById('coarse-adjust');
                const fineAdjust = document.getElementById('fine-adjust');
                
                if (voltageSlider && coarseAdjust && fineAdjust) {
                    const currentValue = parseFloat(voltageSlider.value);
                    
                    // Determine direction (increase or decrease voltage)
                    const isIncreasing = (e.code === 'ArrowUp' || e.key === 'ArrowUp' || 
                                         e.code === 'ArrowRight' || e.key === 'ArrowRight');
                    
                    // Determine adjustment type
                    const isCoarseAdjust = (e.code === 'ArrowUp' || e.key === 'ArrowUp' || 
                                           e.code === 'ArrowDown' || e.key === 'ArrowDown');
                    
                    let adjustment, newValue;
                    
                    if (isCoarseAdjust) {
                        // Up/Down arrows: Coarse adjustment
                        const coarseIncrement = parseFloat(coarseAdjust.value) || 3.0;
                        adjustment = isIncreasing ? coarseIncrement : -coarseIncrement;
                        newValue = Math.min(110, Math.max(90, currentValue + adjustment));
                    } else {
                        // Left/Right arrows: Fine adjustment
                        const fineIncrement = parseFloat(fineAdjust.value) || 0.5;
                        adjustment = isIncreasing ? fineIncrement : -fineIncrement;
                        newValue = Math.min(110, Math.max(90, currentValue + adjustment));
                    }
                    
                    voltageSlider.value = newValue;
                    this.simulationController.setVoltageReference(newValue);
                    
                    // Update voltage display
                    const voltageDisplay = document.getElementById('voltage-display');
                    if (voltageDisplay) {
                        voltageDisplay.textContent = newValue.toFixed(1);
                    }
                }
            }
            
            // Question mark key to show keyboard shortcuts
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                const keyboardShortcutsModal = document.getElementById('keyboard-shortcuts-modal');
                if (keyboardShortcutsModal) {
                    keyboardShortcutsModal.style.display = 'block';
                    keyboardShortcutsModal.style.background = 'rgba(255, 255, 255, 0.7)';
                    keyboardShortcutsModal.style.backdropFilter = 'blur(8px)';
                }
            }
            
            // ESC key behavior - close modal first, then toggle sidebar
            if (e.code === 'Escape' || e.key === 'Escape') {
                e.preventDefault();
                const keyboardShortcutsModal = document.getElementById('keyboard-shortcuts-modal');
                
                // If modal is open, close it first
                if (keyboardShortcutsModal && keyboardShortcutsModal.style.display === 'block') {
                    keyboardShortcutsModal.style.display = 'none';
                } else {
                    // Otherwise toggle sidebar
                    this.toggleControlsPanel();
                }
            }
        });

        // Panel toggle button handler
        const panelToggleButton = document.getElementById('panel-toggle');
        if (panelToggleButton) {
            panelToggleButton.addEventListener('click', () => {
                this.toggleControlsPanel();
            });
        }

        // Keyboard shortcuts modal handlers
        const keyboardShortcutsBtn = document.getElementById('keyboard-shortcuts-btn');
        const keyboardShortcutsModal = document.getElementById('keyboard-shortcuts-modal');
        const keyboardShortcutsClose = document.getElementById('keyboard-shortcuts-close');

        if (keyboardShortcutsBtn && keyboardShortcutsModal) {
            keyboardShortcutsBtn.addEventListener('click', () => {
                console.log('Modal button clicked');
                keyboardShortcutsModal.style.display = 'block';
                
                // Very transparent with minimal blur, dark blue border and text
                keyboardShortcutsModal.style.setProperty('background', 'rgba(60, 60, 60, 0.5)', 'important');
                keyboardShortcutsModal.style.setProperty('background-color', 'rgba(60, 60, 60, 0.5)', 'important');
                keyboardShortcutsModal.style.backdropFilter = 'blur(0.1px)';
                keyboardShortcutsModal.style.color = '#1e3a8a';
                keyboardShortcutsModal.style.border = '1px solid #1e3a8a';
            });
        }

        if (keyboardShortcutsClose && keyboardShortcutsModal) {
            keyboardShortcutsClose.addEventListener('click', () => {
                keyboardShortcutsModal.style.display = 'none';
            });
        }

        // Close modal when clicking outside the content
        if (keyboardShortcutsModal) {
            keyboardShortcutsModal.addEventListener('click', (e) => {
                if (e.target === keyboardShortcutsModal) {
                    keyboardShortcutsModal.style.display = 'none';
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

    }
    
    initializeParameterValues() {
        try {
            const config = this.bridge.callPythonFunction('get_simulation_config');
            
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
            this.simulationController.updateParameters(params);
        }

    }

    toggleControlsPanel() {
        const mainGrid = document.querySelector('.main-grid');
        
        if (this.controlsPanelVisible) {
            // Hide panels - save current states first
            this.saveMenuStates();
            mainGrid.classList.add('controls-hidden');
            this.controlsPanelVisible = false;
        } else {
            // Show panels - restore previous states
            mainGrid.classList.remove('controls-hidden');
            this.controlsPanelVisible = true;
            // Small delay to ensure layout is settled before restoring states
            setTimeout(() => {
                this.restoreMenuStates();
            }, 100);
        }

        // Trigger chart resize after layout change
        setTimeout(() => {
            if (this.chartManager && this.chartManager.voltageChart) {
                this.chartManager.voltageChart.resize();
            }
            if (this.chartManager && this.chartManager.reactiveChart) {
                this.chartManager.reactiveChart.resize();
            }
        }, 350); // Wait for CSS transition to complete
    }

    saveMenuStates() {
        const menuIds = [
            'tuning-content',
            'voltage-control-content',
            'system-parameters-content', 
            'simulation-control-content',
            'chart-config-content',
            'status-content'
        ];

        menuIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.savedMenuStates[id] = !element.classList.contains('collapsed');
            }
        });
    }

    restoreMenuStates() {
        const menuIds = [
            'tuning-content',
            'voltage-control-content',
            'system-parameters-content',
            'simulation-control-content', 
            'chart-config-content',
            'status-content'
        ];

        const toggleIds = {
            'tuning-content': 'tuning-toggle',
            'voltage-control-content': 'voltage-control-toggle',
            'system-parameters-content': 'system-parameters-toggle',
            'simulation-control-content': 'simulation-control-toggle',
            'chart-config-content': 'chart-config-toggle',
            'status-content': 'status-toggle'
        };

        menuIds.forEach(id => {
            const element = document.getElementById(id);
            const toggle = document.getElementById(toggleIds[id]);
            const controlGroup = element?.closest('.control-group, .status-panel');
            
            if (element && this.savedMenuStates.hasOwnProperty(id)) {
                const shouldBeExpanded = this.savedMenuStates[id];
                
                if (shouldBeExpanded && element.classList.contains('collapsed')) {
                    // Expand
                    element.classList.remove('collapsed');
                    controlGroup?.classList.remove('content-collapsed');
                    if (toggle) toggle.innerHTML = '▼';
                } else if (!shouldBeExpanded && !element.classList.contains('collapsed')) {
                    // Collapse
                    element.classList.add('collapsed');
                    controlGroup?.classList.add('content-collapsed');
                    if (toggle) toggle.innerHTML = '▶';
                }
            }
        });
    }

}

// Initialize application when DOM is loaded with auto-retry
document.addEventListener('DOMContentLoaded', async () => {
    
    const app = new VoltageExerciseApp();
    let retryCount = 0;
    const maxRetries = 2; // Total of 3 attempts (initial + 2 retries)
    
    const attemptInitialization = async () => {
        try {
            // Add timeout to prevent hanging
            const initTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000)
            );
            
            const success = await Promise.race([app.initialize(), initTimeout]);
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
        
        // Define new attempt function with the new app instance
        const newAttemptInitialization = async () => {
            try {
                // Add timeout to prevent hanging on retry
                const retryTimeout = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Retry initialization timeout after 30 seconds')), 30000)
                );
                
                const success = await Promise.race([newApp.initialize(), retryTimeout]);
                if (success) {
                    console.log('Application initialized successfully on retry');
                    // Update global app reference for resize handlers
                    app.chartManager = newApp.chartManager;
                    return true;
                }
                return false;
            } catch (error) {
                console.error(`Retry initialization attempt ${retryCount + 1} failed:`, error);
                return false;
            }
        };
        
        success = await newAttemptInitialization();
    }
    
    if (!success) {
        console.error(`Failed to initialize application after ${retryCount + 1} attempts`);
        // Final error state is already handled by the app's error handling
    }
});

// Export for debugging
window.VoltageExerciseApp = VoltageExerciseApp;