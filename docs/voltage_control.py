import random
# tkinter imports removed for web environment
from itertools import count

import numpy as np

import newton_raphson as nr


DELT = 0.05


SYS_XE = 0.05  # pu, on 100 MVA base


TQ_PLANT = 0.25  # seconds


VCTRL_KP = 10.0  # temp value
VCTRL_KI = 50.0  # temp value, not presently used

NOISE = 0.002  # pu




VINIT = 1.0  # pu, magnitude only

PINIT = 0.8  # pu  - not (yet?) variable
QINIT = 0.0  # pu


IINIT = np.conjugate(complex(PINIT, QINIT)) / VINIT

VSYS = abs(VINIT - IINIT * complex(0, SYS_XE))


# values for first graph
t_vals = [-2*DELT, -DELT]
v_vals = [1.0, 1.0]
vref_vals = [1.0, 1.0]
# values for second graph
q_vals = [0.0, 0.0]
qref_vals = [0.0, 0.0]

index = count()


TQ_STORE = 0.0
KI_STORE = QINIT

num_buses = 2

Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]

Sys_Z = complex(0.0, SYS_XE)
Yext = 1.0 / Sys_Z

Ybus_matrix[0][0] = Yext
Ybus_matrix[0][1] = -Yext
Ybus_matrix[1][0] = -Yext
Ybus_matrix[1][1] = Yext

def simulate_step(vref_setpoint):
    """
    Single simulation step - equivalent to the original animate() function
    but designed for web interface integration
    """
    global KI_STORE
    global TQ_STORE
    global Ybus_matrix
    
    # Generate values
    t_vals.append(next(index) * DELT)
    time_val = max(t_vals)
    
    # v_vals.append(1.0 - NOISE / 2.0 + NOISE*random.random())  # updated, still temp
    vref_vals.append(float(vref_setpoint / 100.0))  # updated, update further if needed

    error = vref_vals[-1] - v_vals[-1]

    DSTATE = error * VCTRL_KI
    KI_STORE += DSTATE * DELT

    Qcmd = error * VCTRL_KP + KI_STORE + DELT * DSTATE / 2.0

    qref_vals.append(Qcmd)  # updated

    q_last = q_vals[-1]

    q_err = Qcmd - q_last

    DSTATE = q_err / TQ_PLANT
    TQ_STORE += DSTATE * DELT 
    
    q_vals.append(TQ_STORE + DELT * DSTATE / 2.0)  # updated

    # Call Newton-Raphson solver
    Vreg_mag = [VSYS, None]
    Sgen = [complex(), complex()]
    Sload = [complex(), complex(PINIT, q_vals[-1])]

    [V_temp, S_temp, solved] = nr.GenericNewtonRaphson(Ybus_matrix, Vreg_mag, Sgen, Sload)

    v_vals.append(abs(V_temp[1]) + NOISE / 2.0 - NOISE * random.random())

    # Limit data arrays for performance (rolling window)
    max_points = 400  # 20 seconds at 50ms intervals
    if len(t_vals) > max_points:
        t_vals.pop(0)
        v_vals.pop(0)
        vref_vals.pop(0)
        q_vals.pop(0)
        qref_vals.pop(0)
        
    return {
        'time': t_vals[-1],
        'voltage': v_vals[-1], 
        'voltage_ref': vref_vals[-1],
        'reactive': q_vals[-1],
        'reactive_ref': qref_vals[-1],
        'solved': solved
    }

def get_current_data():
    """Get current simulation data for plotting"""
    return {
        'time_vals': t_vals.copy(),
        'voltage_vals': v_vals.copy(),
        'voltage_ref_vals': vref_vals.copy(),
        'reactive_vals': q_vals.copy(),
        'reactive_ref_vals': qref_vals.copy()
    }

def reset_simulation():
    """Reset simulation to initial state"""
    global t_vals, v_vals, vref_vals, q_vals, qref_vals
    global TQ_STORE, KI_STORE, index
    
    t_vals = [-2*DELT, -DELT]
    v_vals = [1.0, 1.0]
    vref_vals = [1.0, 1.0]
    q_vals = [0.0, 0.0]
    qref_vals = [0.0, 0.0]
    
    TQ_STORE = 0.0
    KI_STORE = QINIT
    
    index = count()

def update_parameters(**kwargs):
    """Update simulation parameters during runtime"""
    global DELT, NOISE, VCTRL_KP, VCTRL_KI, TQ_PLANT
    
    if 'time_step' in kwargs:
        DELT = kwargs['time_step']
    if 'noise_level' in kwargs:
        NOISE = kwargs['noise_level']  
    if 'proportional_gain' in kwargs:
        VCTRL_KP = kwargs['proportional_gain']
    if 'integral_gain' in kwargs:
        VCTRL_KI = kwargs['integral_gain']
    if 'plant_time_constant' in kwargs:
        TQ_PLANT = kwargs['plant_time_constant']