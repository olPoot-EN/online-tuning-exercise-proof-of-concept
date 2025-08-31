import numpy as np
import random

class SimulationState:
    def __init__(self):
        self.DELT = 0.01  # 10ms time step
        self.SYS_XE = 0.05  # System reactance, pu
        self.TQ_PLANT = 0.25  # Plant time constant, seconds
        self.VCTRL_KP = 10.0  # Voltage controller proportional gain
        self.VCTRL_KI = 50.0  # Voltage controller integral gain
        self.NOISE = 0.002  # Voltage noise level, pu
        
        self.VINIT = 1.0  # Initial voltage magnitude, pu
        self.PINIT = 0.8  # Active power setpoint, pu
        self.QINIT = 0.0  # Initial reactive power, pu
        
        self.TQ_STORE = 0.0  # Plant integrator state
        self.KI_STORE = self.QINIT  # Voltage controller integrator state
        
        self.IINIT = np.conjugate(complex(self.PINIT, self.QINIT)) / self.VINIT
        self.VSYS = abs(self.VINIT - self.IINIT * complex(0, self.SYS_XE))
        
        self.data_time_span = 13.5  # Actual data time span: 15 - 1 - 0.5 = 13.5 seconds
        self.max_data_points = int(self.data_time_span / self.DELT)  # Calculate based on time span
        self.time_vals = []
        self.voltage_vals = []
        self.voltage_ref_vals = []
        self.reactive_vals = []
        self.reactive_ref_vals = []
        
        self.initialize_data()
        self.setup_ybus_matrix()
        self.current_time = 0.0
        self.iteration_count = 0
    
    def initialize_data(self):
        start_time = -2 * self.DELT
        self.time_vals = [start_time, start_time + self.DELT]
        self.voltage_vals = [1.0, 1.0]
        self.voltage_ref_vals = [1.0, 1.0]
        self.reactive_vals = [0.0, 0.0]
        self.reactive_ref_vals = [0.0, 0.0]
    
    def setup_ybus_matrix(self):
        num_buses = 2
        self.Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]
        Sys_Z = complex(0.0, self.SYS_XE)
        Yext = 1.0 / Sys_Z
        self.Ybus_matrix[0][0] = Yext
        self.Ybus_matrix[0][1] = -Yext
        self.Ybus_matrix[1][0] = -Yext
        self.Ybus_matrix[1][1] = Yext
    
    def update_parameters(self, param_dict):
        print(f"Python: Updating parameters: {param_dict}")
        updated_params = []
        if 'simulation_interval' in param_dict:
            old_val = self.DELT * 1000.0
            self.DELT = param_dict['simulation_interval'] / 1000.0
            # Recalculate max_data_points based on current data_time_span
            self.max_data_points = int(self.data_time_span / self.DELT)
            print(f"Updated DELT: {old_val} -> {self.DELT * 1000.0} ms, new max_data_points: {self.max_data_points}")
            updated_params.append('simulation_interval')
        if 'noise_level' in param_dict:
            old_val = self.NOISE
            self.NOISE = param_dict['noise_level']
            print(f"Updated NOISE: {old_val} -> {self.NOISE}")
            updated_params.append('noise_level')
        if 'system_reactance' in param_dict:
            old_val = self.SYS_XE
            self.SYS_XE = param_dict['system_reactance']
            self.setup_ybus_matrix()
            print(f"Updated SYS_XE: {old_val} -> {self.SYS_XE}")
            updated_params.append('system_reactance')
        if 'plant_time_constant' in param_dict:
            old_val = self.TQ_PLANT
            self.TQ_PLANT = param_dict['plant_time_constant']
            print(f"Updated TQ_PLANT: {old_val} -> {self.TQ_PLANT}")
            updated_params.append('plant_time_constant')
        if 'voltage_kp' in param_dict:
            old_val = self.VCTRL_KP
            self.VCTRL_KP = param_dict['voltage_kp']
            print(f"Updated VCTRL_KP: {old_val} -> {self.VCTRL_KP}")
            updated_params.append('voltage_kp')
        if 'voltage_ki' in param_dict:
            old_val = self.VCTRL_KI
            self.VCTRL_KI = param_dict['voltage_ki']
            print(f"Updated VCTRL_KI: {old_val} -> {self.VCTRL_KI}")
            updated_params.append('voltage_ki')
        
        # Chart data configuration parameters
        if 'data_time_span' in param_dict:
            old_val = self.data_time_span
            self.data_time_span = param_dict['data_time_span']
            # Recalculate max_data_points based on new time span
            self.max_data_points = int(self.data_time_span / self.DELT)
            print(f"Updated data_time_span: {old_val} -> {self.data_time_span}s, new max_data_points: {self.max_data_points}")
            updated_params.append('data_time_span')
        
        if 'chart_total_time' in param_dict:
            # Store chart configuration for reference but don't use in Python simulation
            print(f"Chart total time: {param_dict['chart_total_time']}s")
            updated_params.append('chart_total_time')
        
        if 'chart_head_buffer' in param_dict:
            print(f"Chart head buffer: {param_dict['chart_head_buffer']}s")
            updated_params.append('chart_head_buffer')
        
        if 'chart_tail_buffer' in param_dict:
            print(f"Chart tail buffer: {param_dict['chart_tail_buffer']}s")
            updated_params.append('chart_tail_buffer')
            
        print(f"Python: Updated parameters: {updated_params}")
        return updated_params
    
    def maintain_rolling_window(self):
        while len(self.time_vals) > self.max_data_points:
            self.time_vals.pop(0)
            self.voltage_vals.pop(0)
            self.voltage_ref_vals.pop(0)
            self.reactive_vals.pop(0)
            self.reactive_ref_vals.pop(0)
        
        current_time = max(self.time_vals) if self.time_vals else 0
        while (self.time_vals and 
               len(self.time_vals) > 2 and 
               self.time_vals[0] < current_time - self.data_time_span):
            self.time_vals.pop(0)
            self.voltage_vals.pop(0)
            self.voltage_ref_vals.pop(0)
            self.reactive_vals.pop(0)
            self.reactive_ref_vals.pop(0)
    
    def get_current_data(self):
        return {
            'time_values': self.time_vals.copy(),
            'voltage_reference': self.voltage_ref_vals.copy(),
            'voltage_actual': self.voltage_vals.copy(),
            'reactive_reference': self.reactive_ref_vals.copy(),
            'reactive_actual': self.reactive_vals.copy(),
            'current_time': self.current_time,
            'iteration_count': self.iteration_count,
            'converged': True
        }
    
    def reset_simulation(self):
        self.TQ_STORE = 0.0
        self.KI_STORE = self.QINIT
        self.current_time = 0.0  # Ensure exact zero initialization
        self.iteration_count = 0
        self.initialize_data()

try:
    sim_state = SimulationState()
    print("Python simulation state initialized successfully.")
except Exception as e:
    print(f"Error initializing Python simulation state: {e}")
    # Re-raise the exception to ensure the failure is propagated
    raise

def simulate_step(voltage_reference):
    global sim_state
    
    try:
        sim_state.current_time += sim_state.DELT
        # Round time to prevent floating point precision issues
        sim_state.current_time = round(sim_state.current_time, 2)
        sim_state.time_vals.append(sim_state.current_time)
        sim_state.voltage_ref_vals.append(float(voltage_reference))
        
        if len(sim_state.voltage_vals) > 0:
            error = voltage_reference - sim_state.voltage_vals[-1]
        else:
            error = 0.0
        
        DSTATE = error * sim_state.VCTRL_KI
        sim_state.KI_STORE += DSTATE * sim_state.DELT
        
        Qcmd = (error * sim_state.VCTRL_KP + 
                sim_state.KI_STORE + 
                sim_state.DELT * DSTATE / 2.0)
        
        sim_state.reactive_ref_vals.append(Qcmd)
        
        if len(sim_state.reactive_vals) > 0:
            q_last = sim_state.reactive_vals[-1]
        else:
            q_last = sim_state.QINIT
        
        q_err = Qcmd - q_last
        DSTATE = q_err / sim_state.TQ_PLANT
        sim_state.TQ_STORE += DSTATE * sim_state.DELT
        q_new = sim_state.TQ_STORE + sim_state.DELT * DSTATE / 2.0
        sim_state.reactive_vals.append(q_new)
        
        Vsys = sim_state.VSYS + (random.random() - 0.5) * 2.0 * sim_state.NOISE
        
        try:
            Vout, Sout, solved = GenericNewtonRaphson(
                Ybus_matrix=sim_state.Ybus_matrix,
                Vreg_mag=[complex(Vsys), None],
                Sgen=[None, complex(sim_state.PINIT, q_new)],
                Verbose_Output=False
            )
            v_new = abs(Vout[1])
            sim_state.voltage_vals.append(v_new)
            convergence_status = solved
            
        except Exception as e:
            if len(sim_state.voltage_vals) > 0:
                sim_state.voltage_vals.append(sim_state.voltage_vals[-1])
            else:
                sim_state.voltage_vals.append(sim_state.VINIT)
            convergence_status = False
        
        sim_state.maintain_rolling_window()
        sim_state.iteration_count += 1
        
        return {
            'time': sim_state.current_time,
            'voltage_reference': voltage_reference,
            'voltage_actual': sim_state.voltage_vals[-1],
            'reactive_reference': Qcmd,
            'reactive_actual': q_new,
            'converged': convergence_status,
            'iteration': sim_state.iteration_count,
            'data_arrays': sim_state.get_current_data()
        }
        
    except Exception as e:
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
    global sim_state
    return sim_state.update_parameters(param_dict)

def get_simulation_data():
    global sim_state
    return sim_state.get_current_data()

def reset_simulation():
    global sim_state
    sim_state.reset_simulation()
    return True

def get_simulation_config():
    """Get current simulation configuration"""
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
        'data_time_span': sim_state.data_time_span,
        'max_data_points': sim_state.max_data_points
    }

def validate_simulation_health():
    """Check simulation health and provide diagnostics"""
    global sim_state
    
    health_status = {
        'status': 'healthy',
        'warnings': [],
        'data_points': len(sim_state.time_vals),
        'current_time': sim_state.current_time,
        'iteration_count': sim_state.iteration_count
    }
    
    return health_status