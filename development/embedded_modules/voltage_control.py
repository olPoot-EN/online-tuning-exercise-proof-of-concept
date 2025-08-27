"""
Voltage Control System for Pyodide environment.
Ported from original voltage_tuning.py for browser execution.

This maintains the real-time simulation logic including:
- Voltage control with PI controller
- Plant dynamics modeling
- Power flow integration
- Data management for visualization
"""

import numpy as np
import random
from newton_raphson import GenericNewtonRaphson


class SimulationState:
    """Global simulation state management"""
    
    def __init__(self):
        # Simulation parameters (configurable)
        self.DELT = 0.05  # 50ms time step
        self.SYS_XE = 0.05  # System reactance, pu on 100 MVA base
        self.TQ_PLANT = 0.25  # Plant time constant, seconds
        self.VCTRL_KP = 10.0  # Voltage controller proportional gain
        self.VCTRL_KI = 50.0  # Voltage controller integral gain
        self.NOISE = 0.002  # Voltage noise level, pu
        
        # System initial conditions
        self.VINIT = 1.0  # Initial voltage magnitude, pu
        self.PINIT = 0.8  # Active power setpoint, pu (not variable in this version)
        self.QINIT = 0.0  # Initial reactive power, pu
        
        # Controller state variables
        self.TQ_STORE = 0.0  # Plant integrator state
        self.KI_STORE = self.QINIT  # Voltage controller integrator state
        
        # System calculations
        self.IINIT = np.conjugate(complex(self.PINIT, self.QINIT)) / self.VINIT
        self.VSYS = abs(self.VINIT - self.IINIT * complex(0, self.SYS_XE))
        
        # Data storage for visualization (rolling window)
        self.max_data_points = 200  # 10 seconds at 50ms intervals
        self.time_vals = []
        self.voltage_vals = []
        self.voltage_ref_vals = []
        self.reactive_vals = []
        self.reactive_ref_vals = []
        
        # Initialize with starting values
        self.initialize_data()
        
        # System admittance matrix
        self.setup_ybus_matrix()
        
        # Current simulation time
        self.current_time = 0.0
        
        # Performance tracking
        self.iteration_count = 0
    
    def initialize_data(self):
        """Initialize data arrays with starting values"""
        # Start with two initial points for smooth animation startup
        start_time = -2 * self.DELT
        self.time_vals = [start_time, start_time + self.DELT]
        self.voltage_vals = [1.0, 1.0]
        self.voltage_ref_vals = [1.0, 1.0]
        self.reactive_vals = [0.0, 0.0]
        self.reactive_ref_vals = [0.0, 0.0]
    
    def setup_ybus_matrix(self):
        """Create the 2-bus system admittance matrix"""
        num_buses = 2
        self.Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]
        
        # System impedance and admittance
        Sys_Z = complex(0.0, self.SYS_XE)
        Yext = 1.0 / Sys_Z
        
        # Build admittance matrix for 2-bus system
        self.Ybus_matrix[0][0] = Yext
        self.Ybus_matrix[0][1] = -Yext
        self.Ybus_matrix[1][0] = -Yext
        self.Ybus_matrix[1][1] = Yext
    
    def update_parameters(self, param_dict):
        """Update simulation parameters dynamically"""
        updated_params = []
        
        if 'simulation_interval' in param_dict:
            self.DELT = param_dict['simulation_interval'] / 1000.0
            updated_params.append('simulation_interval')
        
        if 'noise_level' in param_dict:
            self.NOISE = param_dict['noise_level']
            updated_params.append('noise_level')
        
        if 'system_reactance' in param_dict:
            self.SYS_XE = param_dict['system_reactance']
            self.setup_ybus_matrix()  # Rebuild Ybus matrix
            updated_params.append('system_reactance')
        
        if 'plant_time_constant' in param_dict:
            self.TQ_PLANT = param_dict['plant_time_constant']
            updated_params.append('plant_time_constant')
        
        if 'voltage_kp' in param_dict:
            self.VCTRL_KP = param_dict['voltage_kp']
            updated_params.append('voltage_kp')
        
        if 'voltage_ki' in param_dict:
            self.VCTRL_KI = param_dict['voltage_ki']
            updated_params.append('voltage_ki')
        
        if 'active_power' in param_dict:
            self.PINIT = param_dict['active_power']
            updated_params.append('active_power')
        
        return updated_params
    
    def maintain_rolling_window(self):
        """Maintain rolling window of data for visualization"""
        while len(self.time_vals) > self.max_data_points:
            self.time_vals.pop(0)
            self.voltage_vals.pop(0)
            self.voltage_ref_vals.pop(0)
            self.reactive_vals.pop(0)
            self.reactive_ref_vals.pop(0)
        
        # Also remove old data based on time window (10 seconds)
        current_time = max(self.time_vals) if self.time_vals else 0
        while (self.time_vals and 
               len(self.time_vals) > 2 and 
               self.time_vals[0] < current_time - 10.0):
            self.time_vals.pop(0)
            self.voltage_vals.pop(0)
            self.voltage_ref_vals.pop(0)
            self.reactive_vals.pop(0)
            self.reactive_ref_vals.pop(0)
    
    def get_current_data(self):
        """Get current simulation data for JavaScript interface"""
        return {
            'time_values': self.time_vals.copy(),
            'voltage_reference': self.voltage_ref_vals.copy(),
            'voltage_actual': self.voltage_vals.copy(),
            'reactive_reference': self.reactive_ref_vals.copy(),
            'reactive_actual': self.reactive_vals.copy(),
            'current_time': self.current_time,
            'iteration_count': self.iteration_count,
            'converged': True  # Will be updated by simulation step
        }
    
    def reset_simulation(self):
        """Reset simulation to initial conditions"""
        self.TQ_STORE = 0.0
        self.KI_STORE = self.QINIT
        self.current_time = 0.0
        self.iteration_count = 0
        self.initialize_data()


# Global simulation state instance
sim_state = SimulationState()


def simulate_step(voltage_reference):
    """
    Execute one simulation step - equivalent to the animate() function
    
    Args:
        voltage_reference: Voltage reference setpoint in per-unit
        
    Returns:
        Dictionary containing simulation results for this time step
    """
    global sim_state
    
    try:
        # Update simulation time
        sim_state.current_time += sim_state.DELT
        sim_state.time_vals.append(sim_state.current_time)
        
        # Store voltage reference
        sim_state.voltage_ref_vals.append(float(voltage_reference))
        
        # Voltage control loop - PI controller
        if len(sim_state.voltage_vals) > 0:
            error = voltage_reference - sim_state.voltage_vals[-1]
        else:
            error = 0.0
        
        # PI control calculation
        DSTATE = error * sim_state.VCTRL_KI
        sim_state.KI_STORE += DSTATE * sim_state.DELT
        
        # PI controller output (reactive power command)
        Qcmd = (error * sim_state.VCTRL_KP + 
                sim_state.KI_STORE + 
                sim_state.DELT * DSTATE / 2.0)
        
        sim_state.reactive_ref_vals.append(Qcmd)
        
        # Plant dynamics - first-order lag
        if len(sim_state.reactive_vals) > 0:
            q_last = sim_state.reactive_vals[-1]
        else:
            q_last = sim_state.QINIT
        
        q_err = Qcmd - q_last
        
        # First-order plant response
        DSTATE = q_err / sim_state.TQ_PLANT
        sim_state.TQ_STORE += DSTATE * sim_state.DELT
        
        # Plant output with trapezoidal integration
        q_new = sim_state.TQ_STORE + sim_state.DELT * DSTATE / 2.0
        sim_state.reactive_vals.append(q_new)
        
        # Power flow calculation with noise
        Vsys = sim_state.VSYS + (random.random() - 0.5) * 2.0 * sim_state.NOISE
        
        # Newton-Raphson power flow solution
        try:
            Vout, Sout, solved = GenericNewtonRaphson(
                Ybus_matrix=sim_state.Ybus_matrix,
                Vreg_mag=[complex(Vsys), None],
                Sgen=[None, complex(sim_state.PINIT, q_new)],
                Verbose_Output=False
            )
            
            # Extract voltage magnitude at bus 2 (load bus)
            v_new = abs(Vout[1])
            sim_state.voltage_vals.append(v_new)
            
            convergence_status = solved
            
        except Exception as e:
            # Handle power flow solution failure
            print(f"Power flow solution error: {e}")
            # Use previous voltage value if available
            if len(sim_state.voltage_vals) > 0:
                sim_state.voltage_vals.append(sim_state.voltage_vals[-1])
            else:
                sim_state.voltage_vals.append(sim_state.VINIT)
            convergence_status = False
        
        # Maintain rolling data window
        sim_state.maintain_rolling_window()
        
        # Update iteration counter
        sim_state.iteration_count += 1
        
        # Prepare return data
        result = {
            'time': sim_state.current_time,
            'voltage_reference': voltage_reference,
            'voltage_actual': sim_state.voltage_vals[-1],
            'reactive_reference': Qcmd,
            'reactive_actual': q_new,
            'converged': convergence_status,
            'iteration': sim_state.iteration_count,
            'data_arrays': sim_state.get_current_data()
        }
        
        return result
        
    except Exception as e:
        # Handle any unexpected errors
        print(f"Simulation step error: {e}")
        return {
            'time': sim_state.current_time,
            'voltage_reference': voltage_reference,
            'voltage_actual': 1.0,
            'reactive_reference': 0.0,
            'reactive_actual': 0.0,
            'converged': False,
            'error': str(e),
            'iteration': sim_state.iteration_count,
            'data_arrays': sim_state.get_current_data()
        }


def update_simulation_parameters(param_dict):
    """
    Update simulation parameters from JavaScript
    
    Args:
        param_dict: Dictionary of parameter names and values
        
    Returns:
        List of successfully updated parameters
    """
    global sim_state
    return sim_state.update_parameters(param_dict)


def get_simulation_data():
    """
    Get current simulation data arrays for plotting
    
    Returns:
        Dictionary with all current data arrays
    """
    global sim_state
    return sim_state.get_current_data()


def reset_simulation():
    """Reset simulation to initial conditions"""
    global sim_state
    sim_state.reset_simulation()
    return True


def get_simulation_config():
    """
    Get current simulation configuration
    
    Returns:
        Dictionary with current parameter values
    """
    global sim_state
    
    return {
        'simulation_interval': sim_state.DELT * 1000.0,  # Convert to milliseconds
        'noise_level': sim_state.NOISE,
        'system_reactance': sim_state.SYS_XE,
        'plant_time_constant': sim_state.TQ_PLANT,
        'voltage_kp': sim_state.VCTRL_KP,
        'voltage_ki': sim_state.VCTRL_KI,
        'active_power': sim_state.PINIT,
        'system_voltage': sim_state.VSYS,
        'max_data_points': sim_state.max_data_points
    }


def validate_simulation_health():
    """
    Check simulation health and provide diagnostics
    
    Returns:
        Dictionary with health status and diagnostics
    """
    global sim_state
    
    health_status = {
        'status': 'healthy',
        'warnings': [],
        'data_points': len(sim_state.time_vals),
        'current_time': sim_state.current_time,
        'iteration_count': sim_state.iteration_count
    }
    
    # Check for potential issues
    if len(sim_state.time_vals) != len(sim_state.voltage_vals):
        health_status['warnings'].append('Data array length mismatch')
        health_status['status'] = 'warning'
    
    if sim_state.iteration_count > 10000:
        health_status['warnings'].append('High iteration count - consider reset')
    
    if len(sim_state.voltage_vals) > 0:
        last_voltage = sim_state.voltage_vals[-1]
        if abs(last_voltage) > 1.5 or abs(last_voltage) < 0.5:
            health_status['warnings'].append(f'Voltage out of normal range: {last_voltage:.3f} pu')
            health_status['status'] = 'warning'
    
    return health_status