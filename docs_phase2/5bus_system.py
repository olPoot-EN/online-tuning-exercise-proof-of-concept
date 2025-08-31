# Phase 2: Complex 5-bus power system with IBR controls
# Extracted from IBR_PPC_Tuning.py for embedding in HTML

import numpy as np
import random

# Dynamic Simulation / Plotting Parameters  
DELT = 0.020
NUM_STEPS_PER_UPDATE = 1
WINDOW_TIME = 30.0
NOISE = 0.0005  # pu

# Power System Parameters
SYS_XE = 0.5  # pu, on 100 MVA base (adjustable)

MPT_X = 0.10  # pu, on 100 MVA base
MPT_R = MPT_X / 45.0  # assumed X/R ratio of 45
MPT_TAP = 1.025  # adjustable, initial value
MPT_Z = complex(MPT_R, MPT_X)

COL_BUS_jB = complex(0.0, 0.0)  # initial value, reactive resources
COL_R = 0.04
COL_X = 0.06
COL_G = 0.0  # n/a
COL_B = 0.06
COL_Z = complex(COL_R, COL_X)
COL_Y = complex(COL_G, COL_B/2.0)

GSU_X = 0.06  # pu, on 100 MVA base
GSU_R = GSU_X / 15.0  # assumed X/R ratio of 15
GSU_TAP = 1.025  # fixed
GSU_Z = complex(GSU_R, GSU_X)

# Inverter Model Parameters
TPQ_PLANT = 0.25  # seconds, delay from PPC command to actual output
TV_PLANT = 0.20   # seconds, applied to voltage feedback

INV_VFREEZE = False  # boolean for voltage ride-through control
INV_KFACT = 8.0
INV_VRT_BAND = 0.10  # pu (adjustable)
INV_VRT_HYST = 0.005  # pu, hysteresis

# PPC Tuning Parameters
TVPQ_PPC = 0.5  # seconds, delay in obtaining feedback values
VCTRL_MODE = 1  # MODE=0 is REPC style, MODE=1 is Q(V) control with inner loop Q regulator

VCTRL_DB = 0.005  # deadband, in pu
VCTRL_KP = 0.5  # proportional gain
VCTRL_KI = 0.2  # integral gain
VCTRL_TLAG = 5.0  # intentional lag time constant
VCTRL_DROOP = 0.05  # droop, in pu of 100 MVA base
VCTRL_QCMD_MIN = -0.4  # minimum command, in pu of 100 MVA base
VCTRL_QCMD_MAX = 0.4  # maximum command, in pu of 100 MVA base
VCTRL_QREF_MIN = -0.329  # minimum reference setpoint (Q(V) control only)
VCTRL_QREF_MAX = 0.329  # maximum reference setpoint (Q(V) control only)
VCTRL_FEEDFORWARD = True  # feedforward path (Q(V) control only)

PCTRL_KP = 0.5  # proportional gain
PCTRL_KI = 0.1  # integral gain
PCTRL_FEEDFORWARD = True  # feedforward path

# Initialization Values
VINIT = 1.025  # pu, magnitude only
PINIT = 0.8  # pu, net output
QINIT = 0.0  # pu, net output

# Calculate initial system conditions
IINIT = np.conjugate(complex(PINIT, QINIT)) / VINIT
VSYS = abs(VINIT - IINIT * complex(0, SYS_XE))

VCOL_INIT = VINIT / MPT_TAP + IINIT * MPT_Z * MPT_TAP
ICOL_INIT = (VCOL_INIT - VINIT / MPT_TAP) / MPT_Z

SCOL_INIT = VCOL_INIT * np.conjugate(ICOL_INIT)
PCOL_INIT = SCOL_INIT.real  # initial collector active power output (to MPT)
QCOL_INIT = SCOL_INIT.imag  # initial collector reactive power output (to MPT)

VGSU_INIT = (VCOL_INIT * (1.0/COL_Z + COL_Y) + ICOL_INIT) * COL_Z
IGSU_INIT = VGSU_INIT * (1.0/COL_Z + COL_Y) - VCOL_INIT / COL_Z

VINV_INIT = VGSU_INIT / GSU_TAP + IGSU_INIT * GSU_Z * GSU_TAP
IINV_INIT = (VINV_INIT - VGSU_INIT / GSU_TAP) / GSU_Z

SINV_INIT = VINV_INIT * np.conjugate(IINV_INIT)
PINV_INIT = SINV_INIT.real  # initial inverter active power output
QINV_INIT = SINV_INIT.imag  # initial inverter reactive power output

# Error Handling
if VCTRL_MODE == 1:
    VCTRL_DROOP = max(abs(VCTRL_DROOP), 0.005)  # 0.5% droop minimum

def get_Ybus_matrix():
    """Generate 5-bus system Ybus matrix"""
    global SYS_XE, MPT_Z, COL_Z, COL_Y, GSU_Z
    
    num_buses = 5
    Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]
    
    Sys_Z = complex(0.0, SYS_XE)
    Yext = 1.0 / Sys_Z
    
    Ybus_matrix[0][0] = Yext
    Ybus_matrix[0][1] = -Yext
    
    Ybus_matrix[1][0] = -Yext
    Ybus_matrix[1][1] = Yext + 1.0 / (MPT_Z * np.power(MPT_TAP, 2))
    Ybus_matrix[1][2] = -1.0 / (MPT_Z * MPT_TAP)
    
    Ybus_matrix[2][1] = -1.0 / (MPT_Z * MPT_TAP)
    Ybus_matrix[2][2] = 1.0 / MPT_Z + 1.0 / COL_Z + COL_Y + COL_BUS_jB
    Ybus_matrix[2][3] = -1.0 / COL_Z
    
    Ybus_matrix[3][2] = -1.0 / COL_Z
    Ybus_matrix[3][3] = 1.0 / COL_Z + COL_Y + 1.0 / (GSU_Z * np.power(GSU_TAP, 2))
    Ybus_matrix[3][4] = -1.0 / (GSU_Z * GSU_TAP)
    
    Ybus_matrix[4][3] = -1.0 / (GSU_Z * GSU_TAP)
    Ybus_matrix[4][4] = 1.0 / GSU_Z
    
    return Ybus_matrix

# Control state variables initialized based on system conditions
if VCTRL_MODE == 0:  # REPC style
    if VCTRL_KI > 0.0:  # integrator is used
        VREF_INIT = VINIT + VCTRL_DROOP * QINIT  # assume in center of deadband
    else:  # integrator is not used
        err = QINV_INIT / max(VCTRL_KP, 0.001)
        if err > 0.0:
            err += abs(VCTRL_DB)
        elif err < 0.0:
            err -= abs(VCTRL_DB)
        VREF_INIT = err + VINIT + VCTRL_DROOP * QINIT
elif VCTRL_MODE == 1:  # Q(V) style
    if VCTRL_KI > 0.0:  # integrator is used
        QREF_INIT = QINIT  # no steady-state error
    else:  # integrator is not used
        if VCTRL_FEEDFORWARD:
            QREF_INIT = (QINV_INIT + VCTRL_KP * QINIT) / (1.0 + VCTRL_KP)
        else:
            err = QINV_INIT / max(VCTRL_KP, 0.001)
            QREF_INIT = QINIT + err
    err = QREF_INIT * VCTRL_DROOP
    if err > 0.0:
        err += abs(VCTRL_DB)
    elif err < 0.0:
        err -= abs(VCTRL_DB)
    VREF_INIT = err + VINIT
else:
    VREF_INIT = VINIT
    QREF_INIT = QINIT

# Initialize data arrays
t_vals = [-2*DELT, -DELT]
vpoi_vals = [VINIT for t in t_vals]
vpoi_ref_vals = [VREF_INIT for t in t_vals]
vpoi_cmp_vals = [VREF_INIT for t in t_vals]

ppoi_vals = [PINIT for t in t_vals]
qpoi_vals = [QINIT for t in t_vals]
ppoi_ref_vals = [PINIT for t in t_vals]

if VCTRL_MODE == 1:
    qpoi_ref_vals = [QREF_INIT for t in t_vals]
else:
    qpoi_ref_vals = [QINIT for t in t_vals]

vcol_vals = [abs(VCOL_INIT) for t in t_vals]
pcol_vals = [PCOL_INIT for t in t_vals]
qcol_vals = [QCOL_INIT for t in t_vals]

vinv_vals = [abs(VINV_INIT) for t in t_vals]
pinv_vals = [PINV_INIT for t in t_vals]
qinv_vals = [QINV_INIT for t in t_vals]

pcmd_vals = [PINV_INIT for t in t_vals]
qcmd_vals = [QINV_INIT for t in t_vals]

# Initialize Ybus matrix
Ybus_matrix = get_Ybus_matrix()
past_solution = None

# Control integrator states
KIQ_CMD_STORE = 0.0
KIP_CMD_STORE = 0.0
TQLAG_CMD_STORE = 0.0

TV_INV_STORE = 0.0
TP_INV_STORE = 0.0
TQ_INV_STORE = 0.0

TV_PPC_STORE = 0.0
TP_PPC_STORE = 0.0
TQ_PPC_STORE = 0.0

vpoi_fdbk = VINIT
ppoi_fdbk = PINIT
qpoi_fdbk = QINIT
qcmd_pre_lag = QINV_INIT
vinv_fdbk = abs(VINV_INIT)

current_time = 0.0
iteration_count = 0

def simulate_step(voltage_reference):
    """Main simulation step for 5-bus system with advanced IBR controls"""
    global current_time, iteration_count, past_solution
    global KIQ_CMD_STORE, KIP_CMD_STORE, TQLAG_CMD_STORE
    global TV_INV_STORE, TP_INV_STORE, TQ_INV_STORE
    global TV_PPC_STORE, TP_PPC_STORE, TQ_PPC_STORE
    global vpoi_fdbk, ppoi_fdbk, qpoi_fdbk, qcmd_pre_lag, vinv_fdbk
    global INV_VFREEZE
    global Ybus_matrix
    
    try:
        current_time += DELT
        iteration_count += 1
        
        # Update time and reference values
        t_vals.append(current_time)
        vpoi_ref_vals.append(float(voltage_reference))
        ppoi_ref_vals.append(PINIT)  # Fixed active power for now
        
        # PPC feedback values (delayed by 1 timestep)
        vpoi_prev = vpoi_vals[-1]
        ppoi_prev = ppoi_vals[-1]
        qpoi_prev = qpoi_vals[-1]
        vinv_prev = vinv_vals[-1]
        
        # PPC lag filters
        DSTATE = (vpoi_prev - vpoi_fdbk) / TVPQ_PPC
        TV_PPC_STORE += DSTATE * DELT
        vpoi_fdbk = TV_PPC_STORE + DSTATE * DELT / 2.0
        
        DSTATE = (ppoi_prev - ppoi_fdbk) / TVPQ_PPC
        TP_PPC_STORE += DSTATE * DELT
        ppoi_fdbk = TP_PPC_STORE + DSTATE * DELT / 2.0
        
        DSTATE = (qpoi_prev - qpoi_fdbk) / TVPQ_PPC
        TQ_PPC_STORE += DSTATE * DELT
        qpoi_fdbk = TQ_PPC_STORE + DSTATE * DELT / 2.0
        
        # Inverter voltage feedback lag
        DSTATE = (vinv_prev - vinv_fdbk) / TV_PLANT
        TV_INV_STORE += DSTATE * DELT
        vinv_fdbk = TV_INV_STORE + DSTATE * DELT / 2.0
        
        # Voltage Control Logic
        if VCTRL_MODE == 0:  # Standard REPC style controller
            v_feedback_with_droop = vpoi_fdbk + qpoi_fdbk * VCTRL_DROOP
            vpoi_cmp_vals.append(v_feedback_with_droop)
            error = vpoi_ref_vals[-1] - v_feedback_with_droop
            
            # Deadband logic
            if error > abs(VCTRL_DB):
                error -= abs(VCTRL_DB)
            elif error < -abs(VCTRL_DB):
                error += abs(VCTRL_DB)
            else:
                error = 0.0
            
            # Voltage controller with anti-windup and VRT freeze
            DSTATE = error * (VCTRL_KI if VCTRL_KI > 0.0 else 0.0)
            if INV_VFREEZE:
                if vinv_fdbk > 1.0 and error > 0.0:
                    DSTATE = 0.0
                if vinv_fdbk < 1.0 and error < 0.0:
                    DSTATE = 0.0
            
            KIQ_CMD_STORE += DSTATE * DELT
            qcmd_pre_lag = error * VCTRL_KP + KIQ_CMD_STORE + DELT * DSTATE / 2.0
            
            # Command lag filter
            if VCTRL_TLAG >= 2.0 * DELT:
                DSTATE = (qcmd_pre_lag - qcmd_vals[-1]) / VCTRL_TLAG
                TQLAG_CMD_STORE += DSTATE * DELT
                
                TQLAG_CMD_STORE = max(VCTRL_QCMD_MIN, min(VCTRL_QCMD_MAX, TQLAG_CMD_STORE))
                Qcmd = TQLAG_CMD_STORE + DSTATE * DELT / 2.0
            else:
                Qcmd = qcmd_pre_lag  # bypass lag
            
            Qcmd = max(VCTRL_QCMD_MIN, min(VCTRL_QCMD_MAX, Qcmd))
            qpoi_ref_vals.append(QINIT)  # not used in MODE = 0
            
        elif VCTRL_MODE == 1:  # Q(V) droop style controller with inner-loop regulator
            v_feedback_with_droop = vpoi_fdbk  # no droop applied here
            vpoi_cmp_vals.append(v_feedback_with_droop)
            error = vpoi_ref_vals[-1] - v_feedback_with_droop
            
            # Deadband logic
            if error > abs(VCTRL_DB):
                error -= abs(VCTRL_DB)
            elif error < -abs(VCTRL_DB):
                error += abs(VCTRL_DB)
            else:
                error = 0.0
            
            # Q(V) droop calculation
            qcmd_pre_lag = error / VCTRL_DROOP
            if VCTRL_TLAG >= 2.0 * DELT:
                DSTATE = (qcmd_pre_lag - qpoi_ref_vals[-1]) / VCTRL_TLAG
                TQLAG_CMD_STORE += DSTATE * DELT
                
                TQLAG_CMD_STORE = max(VCTRL_QREF_MIN, min(VCTRL_QREF_MAX, TQLAG_CMD_STORE))
                Qref = TQLAG_CMD_STORE + DSTATE * DELT / 2.0
            else:
                Qref = qcmd_pre_lag  # bypass lag
            
            Qref = max(VCTRL_QREF_MIN, min(VCTRL_QREF_MAX, Qref))
            qpoi_ref_vals.append(Qref)
            
            # Inner loop Q regulator
            error = Qref - qpoi_fdbk
            DSTATE = error * (VCTRL_KI if VCTRL_KI > 0.0 else 0.0)
            
            if INV_VFREEZE:
                if vinv_fdbk > 1.0 and error > 0.0:
                    DSTATE = 0.0
                if vinv_fdbk < 1.0 and error < 0.0:
                    DSTATE = 0.0
            
            KIQ_CMD_STORE += DSTATE * DELT
            Qcmd = (Qref if VCTRL_FEEDFORWARD else 0.0) + error * VCTRL_KP + KIQ_CMD_STORE + DELT * DSTATE / 2.0
            Qcmd = max(VCTRL_QCMD_MIN, min(VCTRL_QCMD_MAX, Qcmd))
        else:
            # Default case
            qpoi_ref_vals.append(QINIT)
            Qcmd = QINV_INIT
        
        qcmd_vals.append(Qcmd)
        
        # Inverter reactive power plant dynamics with VRT logic
        q_last = qinv_vals[-1]
        q_err = Qcmd - q_last
        if INV_VFREEZE:
            if vinv_fdbk > 1.0 and q_err > 0.0:
                q_err = min((1.0 + INV_VRT_BAND) - vinv_fdbk, 0.0) * INV_KFACT
            if vinv_fdbk < 1.0 and q_err < 0.0:
                q_err = max((1.0 - INV_VRT_BAND) - vinv_fdbk, 0.0) * INV_KFACT
        
        DSTATE = q_err / TPQ_PLANT
        TQ_INV_STORE += DSTATE * DELT
        qinv_new = TQ_INV_STORE + DELT * DSTATE / 2.0 + (random.random()-0.5)*2.0*NOISE
        qinv_vals.append(qinv_new)
        
        # Active power control (simplified for now)
        error = ppoi_ref_vals[-1] - ppoi_fdbk
        DSTATE = error * PCTRL_KI
        KIP_CMD_STORE += DSTATE * DELT
        Pcmd = (ppoi_ref_vals[-1] if PCTRL_FEEDFORWARD else 0.0) + error * PCTRL_KP + KIP_CMD_STORE + DELT * DSTATE / 2.0
        pcmd_vals.append(Pcmd)
        
        # Inverter active power plant dynamics
        p_last = pinv_vals[-1]
        p_err = Pcmd - p_last
        DSTATE = p_err / TPQ_PLANT
        TP_INV_STORE += DSTATE * DELT
        pinv_new = TP_INV_STORE + DELT * DSTATE / 2.0 + (random.random()-0.5)*2.0*NOISE
        pinv_vals.append(pinv_new)
        
        # Add system noise to system voltage
        Vsys_noisy = VSYS + (random.random()-0.5)*2.0*NOISE
        
        # Solve 5-bus power flow
        Vout, Sout, solved = GenericNewtonRaphson(
            Ybus_matrix=Ybus_matrix,
            Vreg_mag=[complex(Vsys_noisy), None, None, None, None],
            Sgen=[None, complex(), complex(), complex(), complex(pinv_new, qinv_new)],
            initial_V=past_solution,
            Verbose_Output=False
        )
        
        if solved:
            past_solution = Vout
            # Update voltage measurements
            vpoi_vals.append(abs(Vout[1]))  # POI voltage
            vcol_vals.append(abs(Vout[2]))  # Collector voltage
            vinv_vals.append(abs(Vout[4]))  # Inverter terminal voltage
            
            # Calculate power flows
            Spoi = Vout[1] * np.conjugate((Vout[1] - Vout[0]) / complex(0, SYS_XE))
            ppoi_vals.append(Spoi.real)
            qpoi_vals.append(Spoi.imag)
            
            Scol = Vout[2] * np.conjugate((Vout[2] - Vout[1]/MPT_TAP) / MPT_Z)
            pcol_vals.append(Scol.real)
            qcol_vals.append(Scol.imag)
        else:
            # Power flow failed - use previous values
            vpoi_vals.append(vpoi_vals[-1])
            vcol_vals.append(vcol_vals[-1])
            vinv_vals.append(vinv_vals[-1])
            ppoi_vals.append(ppoi_vals[-1])
            qpoi_vals.append(qpoi_vals[-1])
            pcol_vals.append(pcol_vals[-1])
            qcol_vals.append(qcol_vals[-1])
        
        # VRT state logic
        if vinv_fdbk > (1.0 + INV_VRT_BAND) or vinv_fdbk < (1.0 - INV_VRT_BAND):
            INV_VFREEZE = True
        elif vinv_fdbk > (1.0 - (INV_VRT_BAND - INV_VRT_HYST)) and vinv_fdbk < (1.0 + (INV_VRT_BAND - INV_VRT_HYST)):
            INV_VFREEZE = False
        
        # Maintain rolling window
        while t_vals[0] < current_time - WINDOW_TIME:
            t_vals.pop(0)
            vpoi_vals.pop(0)
            vpoi_ref_vals.pop(0)
            vpoi_cmp_vals.pop(0)
            ppoi_vals.pop(0)
            qpoi_vals.pop(0)
            ppoi_ref_vals.pop(0)
            qpoi_ref_vals.pop(0)
            vcol_vals.pop(0)
            pcol_vals.pop(0)
            qcol_vals.pop(0)
            vinv_vals.pop(0)
            pinv_vals.pop(0)
            qinv_vals.pop(0)
            pcmd_vals.pop(0)
            qcmd_vals.pop(0)
        
        return {
            'time': current_time,
            'voltage_reference': voltage_reference,
            'voltage_actual': vpoi_vals[-1],
            'voltage_measured': vpoi_cmp_vals[-1],
            'reactive_reference': qpoi_ref_vals[-1],
            'reactive_actual': qpoi_vals[-1],
            'active_reference': ppoi_ref_vals[-1],
            'active_actual': ppoi_vals[-1],
            'vcol': vcol_vals[-1],
            'vinv': vinv_vals[-1],
            'qcmd': qcmd_vals[-1],
            'pcmd': pcmd_vals[-1],
            'converged': solved,
            'vrt_active': INV_VFREEZE,
            'iteration': iteration_count
        }
        
    except Exception as e:
        print(f"5-bus simulation error at time {current_time}: {e}")
        return {
            'time': current_time,
            'voltage_reference': voltage_reference,
            'voltage_actual': 1.0,
            'voltage_measured': 1.0,
            'reactive_reference': 0.0,
            'reactive_actual': 0.0,
            'active_reference': 0.8,
            'active_actual': 0.8,
            'vcol': 1.0,
            'vinv': 1.0,
            'qcmd': 0.0,
            'pcmd': 0.8,
            'converged': False,
            'vrt_active': False,
            'iteration': iteration_count,
            'error': str(e)
        }

def update_simulation_parameters(param_dict):
    """Update 5-bus system parameters"""
    global SYS_XE, MPT_TAP, VCTRL_MODE, VCTRL_KP, VCTRL_KI, VCTRL_DROOP
    global Ybus_matrix
    
    updated_params = []
    
    if 'system_reactance' in param_dict:
        SYS_XE = max(0.1, min(2.0, param_dict['system_reactance']))
        Ybus_matrix = get_Ybus_matrix()
        updated_params.append('system_reactance')
    
    if 'mpt_tap' in param_dict:
        MPT_TAP = max(0.9, min(1.1, param_dict['mpt_tap']))
        Ybus_matrix = get_Ybus_matrix()
        updated_params.append('mpt_tap')
    
    if 'voltage_kp' in param_dict:
        VCTRL_KP = max(0.0, param_dict['voltage_kp'])
        updated_params.append('voltage_kp')
    
    if 'voltage_ki' in param_dict:
        VCTRL_KI = max(0.0, param_dict['voltage_ki'])
        updated_params.append('voltage_ki')
    
    if 'voltage_droop' in param_dict:
        VCTRL_DROOP = max(0.005, min(0.2, abs(param_dict['voltage_droop'])))
        updated_params.append('voltage_droop')
    
    if 'control_mode' in param_dict:
        VCTRL_MODE = int(param_dict['control_mode'])
        updated_params.append('control_mode')
    
    return updated_params

def get_simulation_data():
    """Get current simulation data for plotting"""
    return {
        'time_values': t_vals.copy(),
        'voltage_reference': vpoi_ref_vals.copy(),
        'voltage_actual': vpoi_vals.copy(),
        'voltage_compensated': vpoi_cmp_vals.copy(),
        'reactive_reference': qpoi_ref_vals.copy(),
        'reactive_actual': qpoi_vals.copy(),
        'active_reference': ppoi_ref_vals.copy(),
        'active_actual': ppoi_vals.copy(),
        'vcol_actual': vcol_vals.copy(),
        'vinv_actual': vinv_vals.copy(),
        'qcmd_values': qcmd_vals.copy(),
        'pcmd_values': pcmd_vals.copy(),
        'current_time': current_time,
        'iteration_count': iteration_count,
        'converged': True
    }

def reset_simulation():
    """Reset all simulation states"""
    global current_time, iteration_count
    global KIQ_CMD_STORE, KIP_CMD_STORE, TQLAG_CMD_STORE
    global TV_INV_STORE, TP_INV_STORE, TQ_INV_STORE
    global TV_PPC_STORE, TP_PPC_STORE, TQ_PPC_STORE
    global vpoi_fdbk, ppoi_fdbk, qpoi_fdbk, qcmd_pre_lag, vinv_fdbk
    global past_solution, INV_VFREEZE
    
    # Reset time
    current_time = 0.0
    iteration_count = 0
    
    # Reset integrator states
    KIQ_CMD_STORE = 0.0
    KIP_CMD_STORE = 0.0
    TQLAG_CMD_STORE = 0.0
    TV_INV_STORE = 0.0
    TP_INV_STORE = 0.0
    TQ_INV_STORE = 0.0
    TV_PPC_STORE = 0.0
    TP_PPC_STORE = 0.0
    TQ_PPC_STORE = 0.0
    
    # Reset feedback values
    vpoi_fdbk = VINIT
    ppoi_fdbk = PINIT
    qpoi_fdbk = QINIT
    qcmd_pre_lag = QINV_INIT
    vinv_fdbk = abs(VINV_INIT)
    
    # Reset solution
    past_solution = None
    INV_VFREEZE = False
    
    # Reinitialize data arrays
    global t_vals, vpoi_vals, vpoi_ref_vals, vpoi_cmp_vals
    global ppoi_vals, qpoi_vals, ppoi_ref_vals, qpoi_ref_vals
    global vcol_vals, pcol_vals, qcol_vals
    global vinv_vals, pinv_vals, qinv_vals, pcmd_vals, qcmd_vals
    
    t_vals = [-2*DELT, -DELT]
    vpoi_vals = [VINIT for t in t_vals]
    vpoi_ref_vals = [VREF_INIT for t in t_vals]
    vpoi_cmp_vals = [VREF_INIT for t in t_vals]
    ppoi_vals = [PINIT for t in t_vals]
    qpoi_vals = [QINIT for t in t_vals]
    ppoi_ref_vals = [PINIT for t in t_vals]
    if VCTRL_MODE == 1:
        qpoi_ref_vals = [QREF_INIT for t in t_vals]
    else:
        qpoi_ref_vals = [QINIT for t in t_vals]
    vcol_vals = [abs(VCOL_INIT) for t in t_vals]
    pcol_vals = [PCOL_INIT for t in t_vals]
    qcol_vals = [QCOL_INIT for t in t_vals]
    vinv_vals = [abs(VINV_INIT) for t in t_vals]
    pinv_vals = [PINV_INIT for t in t_vals]
    qinv_vals = [QINV_INIT for t in t_vals]
    pcmd_vals = [PINV_INIT for t in t_vals]
    qcmd_vals = [QINV_INIT for t in t_vals]

def get_system_parameters():
    """Get current system configuration"""
    return {
        'SYS_XE': SYS_XE,
        'MPT_TAP': MPT_TAP,
        'VCTRL_MODE': VCTRL_MODE,
        'VCTRL_KP': VCTRL_KP,
        'VCTRL_KI': VCTRL_KI,
        'VCTRL_DROOP': VCTRL_DROOP,
        'PCTRL_KP': PCTRL_KP,
        'PCTRL_KI': PCTRL_KI,
        'INV_VRT_BAND': INV_VRT_BAND,
        'simulation_interval': DELT * 1000.0,
        'noise_level': NOISE
    }

# Compatibility functions to maintain same interface as Phase 1
class SimulationState:
    """Compatibility wrapper for 5-bus system"""
    def __init__(self):
        self.DELT = DELT
        self.current_time = 0.0
        self.iteration_count = 0
        
    def update_parameters(self, param_dict):
        return update_simulation_parameters(param_dict)
    
    def get_current_data(self):
        return get_simulation_data()
    
    def reset_simulation(self):
        reset_simulation()

# Create global simulation state for compatibility
sim_state = SimulationState()

print("Phase 2: 5-bus system with advanced IBR controls ready")