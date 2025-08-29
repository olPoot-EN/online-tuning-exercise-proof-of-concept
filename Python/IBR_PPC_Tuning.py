import random
import tkinter as Tk
from itertools import count

import numpy as np

import NewtonRaphson as nr

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk


## Dynamic Simulation / Plotting Parameters
DELT = 0.020
NUM_STEPS_PER_UPDATE = 25

WINDOW_TIME = 30.0

NOISE = 0.0005  # pu


## Power System Parameters
SYS_XE = 0.25  # pu, on 100 MVA base  (to make adjustable)

MPT_X = 0.10  # pu, on 100 MVA base
MPT_R = MPT_X / 45.0  # assumed X/R ratio of 45
MPT_TAP = 1.025  # adjustable, initial value

MPT_Z = complex(MPT_R, MPT_X)

COL_BUS_jB = complex(0.0, 0.0)  # initial value, reactive resources

COL_R = 0.04
COL_X = 0.06
COL_G = 0.0 # n/a
COL_B = 0.06

COL_Z = complex(COL_R, COL_X)
COL_Y = complex(COL_G, COL_B/2.0)

GSU_X = 0.06  # pu, on 100 MVA base
GSU_R = GSU_X / 15.0  # assumed X/R ratio of 15
GSU_TAP = 1.025  # fixed

GSU_Z = complex(GSU_R, GSU_X)


## Inverter Model (Basic, Simplified) Pararmeters
TPQ_PLANT = 0.25  # seconds, represents delay from PPC command to actual output
TV_PLANT = 0.20   # seconds, applied to voltage feedback

INV_VFREEZE = False  # boolean for voltage ride-through (VRT) control being active or not, freezes reactive integrator state
INV_KFACT = 2.0
INV_VRT_BAND = 0.10  # pu (make adjustable)
INV_VRT_HYST = 0.002  # pu, no need to have this be adjustable in GUI


## PPC Tuning Parameters
TVPQ_PPC = 0.5  # seconds, represents delay in obtaining feedback values

VCTRL_MODE = 1  # MODE=0 is standard REPC style of control, MODE=1 is Q(V) control with inner loop Q regulator

VCTRL_DB = 0.005  # temp value, deadband, in pu
VCTRL_KP = 0.5  # temp value, proportional gain
VCTRL_KI = 0.2  # temp value, integral gain
VCTRL_TLAG = 5.0  # temp value, intentional lag time constant
VCTRL_DROOP = 0.05  # temp value, droop, in pu of 100 MVA base
VCTRL_QCMD_MIN = -0.4  # temp value, minimum command, in pu of 100 MVA base
VCTRL_QCMD_MAX =  0.4  # temp value, maximum command, in pu of 100 MVA base
VCTRL_QREF_MIN = -0.329  # temp value, minimum reference setpoint, in pu of 100 MVA base (only used in Q(V) control)
VCTRL_QREF_MAX =  0.329  # temp value, maximum reference setpoint, in pu of 100 MVA base (only used in Q(V) control)
VCTRL_FEEDFORWARD = True  # adjustable for whether a feedforward path is used or not (only used in Q(V) control)

PCTRL_KP = 0.5  # temp value, proportional gain
PCTRL_KI = 0.1  # temp value, integral gain
PCTRL_FEEDFORWARD = True  # adjustable for whether a feedforward path is used or not


## Initialization Values
VINIT = 1.025  # pu, magnitude only

PINIT = 0.8  # pu, net output
QINIT = 0.0  # pu, net output


IINIT = np.conjugate(complex(PINIT, QINIT)) / VINIT; print(IINIT)  # initial net current flow (complex vector)

VSYS = abs(VINIT - IINIT * complex(0, SYS_XE));  print(VSYS)  # System voltage - TO DO: make adjustable
#VSYS = abs(VSYS)


VCOL_INIT = VINIT / MPT_TAP + IINIT * MPT_Z * MPT_TAP;  print(VCOL_INIT)
ICOL_INIT = (VCOL_INIT - VINIT / MPT_TAP) / MPT_Z;  print(ICOL_INIT)

SCOL_INIT = VCOL_INIT * np.conjugate(ICOL_INIT)
PCOL_INIT = SCOL_INIT.real  # initial collector active power output (to MPT)
QCOL_INIT = SCOL_INIT.imag  # initial collector reactive power output (to MPT)


VGSU_INIT = (VCOL_INIT * (1.0/COL_Z + COL_Y) + ICOL_INIT) * COL_Z;  print(VGSU_INIT)
IGSU_INIT = VGSU_INIT * (1.0/COL_Z + COL_Y) - VCOL_INIT / COL_Z;  print(IGSU_INIT)


VINV_INIT = VGSU_INIT / GSU_TAP + IGSU_INIT * GSU_Z * GSU_TAP;  print(VINV_INIT)
IINV_INIT = (VINV_INIT - VGSU_INIT / GSU_TAP) / GSU_Z;  print(IINV_INIT)

SINV_INIT = VINV_INIT * np.conjugate(IINV_INIT);  print(SINV_INIT)

PINV_INIT = SINV_INIT.real  # initial inverter active power output
QINV_INIT = SINV_INIT.imag  # initial inverter reactive power output




## Error Handling
if VCTRL_MODE == 1:
    VCTRL_DROOP = max(abs(VCTRL_DROOP), 0.005)  # 0.5% droop minimum
    pass


## Dynamic Simulation Vectors For Storing Plotted Values
t_vals = [-2*DELT, -DELT]

vpoi_vals = [VINIT for t in t_vals]

if VCTRL_MODE == 0:  # REPC style
    if VCTRL_KI > 0.0:  # integrator is used
        VREF_INIT = VINIT + VCTRL_DROOP * QINIT  # assume in center of deadband
        pass
    else:  # integrator is not used
        err = QINV_INIT / max(VCTRL_KP, 0.001)  # will throw an error if Kp = 0, this is input to Kp block (output of deadband)
        if err > 0.0:
            err += abs(VCTRL_DB)
            pass
        elif err < 0.0:
            err -= abs(VCTRL_DB)
            pass
        VREF_INIT = err + VINIT + VCTRL_DROOP * QINIT
    pass
elif VCTRL_MODE == 1:  # Q(V) style
    # set the inner-loop regulator reference
    if VCTRL_KI > 0.0:  # integrator is used
        qpoi_ref_vals = [QINIT for t in t_vals]  # no steady-state error
        pass
    else:  # integrator is not used
        if VCTRL_FEEDFORWARD:
            qpoi_ref_vals = [(QINV_INIT + VCTRL_KP * QINIT) / (1.0 + VCTRL_KP) for t in t_vals]
            pass
        else:
            err = QINV_INIT / max(VCTRL_KP, 0.001)  # will throw an error if Kp = 0, this is input to Kp block
            qpoi_ref_vals = [QINIT + err for t in t_vals]
            pass
        pass
    err = qpoi_ref_vals[-1] * VCTRL_DROOP
    if err > 0.0:
        err += abs(VCTRL_DB)
        pass
    elif err < 0.0:
        err -= abs(VCTRL_DB)
        pass
    VREF_INIT = err + VINIT
    pass
else:
    VREF_INIT = VINIT
    pass
print(VREF_INIT)
vpoi_ref_vals = [VREF_INIT for t in t_vals]
vpoi_cmp_vals = [VREF_INIT for t in t_vals]

ppoi_vals = [PINIT for t in t_vals]
qpoi_vals = [QINIT for t in t_vals]

ppoi_ref_vals = [PINIT for t in t_vals]
if VCTRL_MODE == 0:  # REPC style
    qpoi_ref_vals = [QINIT for t in t_vals]  # not used
    pass
elif VCTRL_MODE == 1:  # Q(V) style
    # see code above for VREF_INIT
    pass
else:
    qpoi_ref_vals = [QINIT for t in t_vals]  # not used
    pass


vcol_vals = [abs(VCOL_INIT) for t in t_vals]
pcol_vals = [PCOL_INIT for t in t_vals]
qcol_vals = [QCOL_INIT for t in t_vals]


vinv_vals = [abs(VINV_INIT) for t in t_vals]
pinv_vals = [PINV_INIT for t in t_vals]
qinv_vals = [QINV_INIT for t in t_vals]

pcmd_vals = [PINV_INIT for t in t_vals]
qcmd_vals = [QINV_INIT for t in t_vals]

index = count()


## Dynamic Simulation STORE values
TV_PPC_STORE = VINIT; vpoi_fdbk = VINIT
TP_PPC_STORE = PINIT; ppoi_fdbk = PINIT
TQ_PPC_STORE = QINIT; qpoi_fdbk = QINIT

KIQ_CMD_STORE = QINV_INIT if VCTRL_KI > 0.0 else 0.0
if VCTRL_MODE == 1 and VCTRL_FEEDFORWARD: KIQ_CMD_STORE -= QINIT

if VCTRL_MODE == 0:
    TQLAG_CMD_STORE = QINV_INIT; qcmd_pre_lag = QINV_INIT
    pass
elif VCTRL_MODE == 1:
    TQLAG_CMD_STORE = qpoi_ref_vals[-1]; qcmd_pre_lag = TQLAG_CMD_STORE  # used on output of Q(V) function
    pass


KIP_CMD_STORE = PINV_INIT - PINIT if PCTRL_FEEDFORWARD else PINV_INIT

TP_INV_STORE = PINV_INIT
TQ_INV_STORE = QINV_INIT





def get_Ybus_matrix():
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

Ybus_matrix = get_Ybus_matrix()

past_solution = None

def animate(i):
    global KIQ_CMD_STORE, KIP_CMD_STORE, TQLAG_CMD_STORE
    global TP_INV_STORE, TQ_INV_STORE
    global TV_PPC_STORE, TP_PPC_STORE, TQ_PPC_STORE
    global vpoi_fdbk, ppoi_fdbk, qpoi_fdbk, qcmd_pre_lag
    global Ybus_matrix, past_solution

    global INV_VFREEZE

    global t_vals, vpoi_ref_vals, vpoi_vals, vpoi_cmp_vals
    global ppoi_vals, qpoi_vals, ppoi_ref_vals, qpoi_ref_vals
    global vcol_vals, pcol_vals, qcol_vals
    global vinv_vals, pinv_vals, qinv_vals, pcmd_vals, qcmd_vals

    global canvas
    global Vref_plot, Vpoi_plot, Vcmp_plot
    global Pref_plot, Ppoi_plot
    global Qref_plot, Qpoi_plot
    global Vcol_plot, Vinv_plot
    global Pcmd_plot, Pinv_plot
    global Qcmd_plot, Qinv_plot
    global Pcol_plot, Qcol_plot

    switch_val = simulation_slider.get()

    if switch_val == 0: return

    loop_t0 = next(index) * NUM_STEPS_PER_UPDATE * DELT

    for i in range(NUM_STEPS_PER_UPDATE):
    
        # Generate values
        t_vals.append(loop_t0 + i * DELT)
        time_val = max(t_vals)
        
        # v_vals.append(1.0 - NOISE / 2.0 + NOISE*random.random())  # updated, still temp
        vpoi_ref_vals.append(float(Vreference_slider.get() / 1000.0))  # updated, update further if needed

        # PPC feedback values
        vpoi_prev = vpoi_vals[-1]  # feedback is inherently delayed by 1 timestep
        ppoi_prev = ppoi_vals[-1]  #
        qpoi_prev = qpoi_vals[-1]  #

        DSTATE = (vpoi_prev - vpoi_fdbk) / TVPQ_PPC; TV_PPC_STORE += DSTATE * DELT; vpoi_fdbk = TV_PPC_STORE + DSTATE * DELT / 2.0
        DSTATE = (ppoi_prev - ppoi_fdbk) / TVPQ_PPC; TP_PPC_STORE += DSTATE * DELT; ppoi_fdbk = TP_PPC_STORE + DSTATE * DELT / 2.0
        DSTATE = (qpoi_prev - qpoi_fdbk) / TVPQ_PPC; TQ_PPC_STORE += DSTATE * DELT; qpoi_fdbk = TQ_PPC_STORE + DSTATE * DELT / 2.0

        if VCTRL_MODE == 0:  # Standard REPC style of controller model
            v_feedback_with_droop = vpoi_fdbk + qpoi_fdbk * VCTRL_DROOP
            vpoi_cmp_vals.append(v_feedback_with_droop)
            error = vpoi_ref_vals[-1] - v_feedback_with_droop
            
            if error > abs(VCTRL_DB):
                error -= abs(VCTRL_DB)
                pass
            elif error < -abs(VCTRL_DB):
                error += abs(VCTRL_DB)
                pass
            else:
                error = 0.0
                pass

            DSTATE = error * (VCTRL_KI if VCTRL_KI > 0.0 else 0.0)
            if INV_VFREEZE:
                if vinv_vals[-1] > 1.0 and error > 0.0: DSTATE = 0.0
                if vinv_vals[-1] < 1.0 and error < 0.0: DSTATE = 0.0
                pass
            
            KIQ_CMD_STORE += DSTATE * DELT

            qcmd_pre_lag = error * VCTRL_KP + KIQ_CMD_STORE + DELT * DSTATE / 2.0

            if VCTRL_TLAG >= 2.0 * DELT:
                DSTATE = (qcmd_pre_lag - qcmd_vals[-1]) / VCTRL_TLAG
                TQLAG_CMD_STORE += DSTATE * DELT

                if TQLAG_CMD_STORE < VCTRL_QCMD_MIN: TQLAG_CMD_STORE = VCTRL_QCMD_MIN
                if TQLAG_CMD_STORE > VCTRL_QCMD_MAX: TQLAG_CMD_STORE = VCTRL_QCMD_MAX
                
                Qcmd = TQLAG_CMD_STORE + DSTATE * DELT / 2.0
                pass
            else:
                Qcmd = qcmd_pre_lag  # bypass
                pass

            if Qcmd < VCTRL_QCMD_MIN: Qcmd = VCTRL_QCMD_MIN
            if Qcmd > VCTRL_QCMD_MAX: Qcmd = VCTRL_QCMD_MAX

            qpoi_ref_vals.append(QINIT)  # not used in MODE = 0
            pass
        
        elif VCTRL_MODE == 1:  # Q(V) droop style controller model with inner-loop regulator
            v_feedback_with_droop = vpoi_fdbk  # no droop applied here
            vpoi_cmp_vals.append(v_feedback_with_droop)
            error = vpoi_ref_vals[-1] - v_feedback_with_droop

            if error > abs(VCTRL_DB):
                error -= abs(VCTRL_DB)
                pass
            elif error < -abs(VCTRL_DB):
                error += abs(VCTRL_DB)
                pass
            else:
                error = 0.0
                pass
            
            qcmd_pre_lag = error / VCTRL_DROOP
            if VCTRL_TLAG >= 2.0 * DELT:
                DSTATE = (qcmd_pre_lag - qpoi_ref_vals[-1]) / VCTRL_TLAG
                TQLAG_CMD_STORE += DSTATE * DELT

                if TQLAG_CMD_STORE < VCTRL_QREF_MIN: TQLAG_CMD_STORE = VCTRL_QREF_MIN
                if TQLAG_CMD_STORE > VCTRL_QREF_MAX: TQLAG_CMD_STORE = VCTRL_QREF_MAX
                
                Qref = TQLAG_CMD_STORE + DSTATE * DELT / 2.0
                pass
            else:
                Qref = qcmd_pre_lag  # bypass
                pass

            if Qref < VCTRL_QREF_MIN: Qref = VCTRL_QREF_MIN
            if Qref > VCTRL_QREF_MAX: Qref = VCTRL_QREF_MAX
            qpoi_ref_vals.append(Qref)

            error = Qref - qpoi_fdbk
            DSTATE = error * (VCTRL_KI if VCTRL_KI > 0.0 else 0.0)

            if INV_VFREEZE:
                if vinv_vals[-1] > 1.0 and error > 0.0: DSTATE = 0.0
                if vinv_vals[-1] < 1.0 and error < 0.0: DSTATE = 0.0
                pass
            
            KIQ_CMD_STORE += DSTATE * DELT

            Qcmd = (Qref if VCTRL_FEEDFORWARD else 0.0) + error * VCTRL_KP + KIQ_CMD_STORE + DELT * DSTATE / 2.0

            if Qcmd < VCTRL_QCMD_MIN: Qcmd = VCTRL_QCMD_MIN
            if Qcmd > VCTRL_QCMD_MAX: Qcmd = VCTRL_QCMD_MAX
            
            pass
        
        else:  # default (should not happen)
            qpoi_ref_vals.append(QINIT)  # not used
            Qcmd = QINV_INIT  # unchanged
            pass
        
        qcmd_vals.append(Qcmd)  # updated

        q_last = qinv_vals[-1]
        q_err = Qcmd - q_last
        if INV_VFREEZE:
            if vinv_vals[-1] > 1.0 and q_err > 0.0: q_err = min((1.0 + INV_VRT_BAND) - vinv_vals[-1], 0.0) * INV_KFACT
            if vinv_vals[-1] < 1.0 and q_err < 0.0: q_err = max((1.0 - INV_VRT_BAND) - vinv_vals[-1], 0.0) * INV_KFACT
            pass

        DSTATE = q_err / TPQ_PLANT
        TQ_INV_STORE += DSTATE * DELT 
        
        qinv_vals.append(TQ_INV_STORE + DELT * DSTATE / 2.0 + (random.random()-0.5)*2.0*NOISE)  # updated


        ppoi_ref_vals.append(Preference_slider.get() / 1000.0)  # update to have additional options
        error = ppoi_ref_vals[-1] - ppoi_fdbk

        DSTATE = error * PCTRL_KI
        KIP_CMD_STORE += DSTATE * DELT

        Pcmd = (ppoi_ref_vals[-1] if PCTRL_FEEDFORWARD else 0.0) + error * PCTRL_KP + KIP_CMD_STORE + DELT * DSTATE / 2.0

        pcmd_vals.append(Pcmd)  # updated



        p_last = pinv_vals[-1]
        p_err = Pcmd - p_last

        DSTATE = p_err / TPQ_PLANT
        TP_INV_STORE += DSTATE * DELT

        pinv_vals.append(TP_INV_STORE + DELT * DSTATE / 2.0 + (random.random()-0.5)*2.0*NOISE)  # updated


        # update power flow
        Vsys = VSYS + (random.random()-0.5)*2.0*NOISE

        [Vout, Sout, solved] = nr.GenericNewtonRaphson(Ybus_matrix=Ybus_matrix,
                                                       Vreg_mag=[complex(Vsys),
                                                                 None,
                                                                 None,
                                                                 None,
                                                                 None],
                                                       Sgen=[None,
                                                             complex(),
                                                             complex(),
                                                             complex(),
                                                             complex(pinv_vals[-1],
                                                                     qinv_vals[-1])],
                                                       initial_V=past_solution,
                                                       Verbose_Output=False)
        vpoi_vals.append(abs(Vout[1]))  # updated
        vcol_vals.append(abs(Vout[2]))
        vinv_vals.append(abs(Vout[4]))

        if vinv_vals[-1] > (1.0 + INV_VRT_BAND) or vinv_vals[-1] < (1.0 - INV_VRT_BAND):
            INV_VFREEZE = True
            pass
        elif vinv_vals[-1] > (1.0 - (INV_VRT_BAND - INV_VRT_HYST)) and vinv_vals[-1] < (1.0 + (INV_VRT_BAND - INV_VRT_HYST)):
            INV_VFREEZE = False
            pass


        Spoi = Vout[1] * np.conjugate((Vout[1]-Vout[0]) / complex(0, SYS_XE))
        Ppoi = Spoi.real
        Qpoi = Spoi.imag

        ppoi_vals.append(Ppoi)
        qpoi_vals.append(Qpoi)


        Scol = Vout[2] * np.conjugate((Vout[2]-Vout[1]/MPT_TAP) / MPT_Z)
        Pcol = Scol.real
        Qcol = Scol.imag

        pcol_vals.append(Pcol)
        qcol_vals.append(Qcol)



        if solved:
            past_solution = Vout
            pass
        else:
            simulation_slider.set(0)
            pass

        pass
    

    while t_vals[0] < time_val - WINDOW_TIME:  # remove old data
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
        
        pass
    
    
    # Plot new data
    Vref_plot.set_data([t_vals, vpoi_ref_vals])
    Vpoi_plot.set_data([t_vals, vpoi_vals])
    if VCTRL_DROOP != 0.0 and VCTRL_MODE == 0:
        Vcmp_plot.set_data([t_vals, vpoi_cmp_vals])
        pass
    else:
        Vcmp_plot.set_data([[],[]])
        pass

    Pref_plot.set_data([t_vals, ppoi_ref_vals])
    Ppoi_plot.set_data([t_vals, ppoi_vals])

    Qref_plot.set_data([t_vals, qpoi_ref_vals])
    if VCTRL_MODE != 1: Qref_plot.set_data([[], []])
    Qpoi_plot.set_data([t_vals, qpoi_vals])
    

    Vcol_plot.set_data([t_vals, vcol_vals])
    Pcol_plot.set_data([t_vals, pcol_vals])
    Qcol_plot.set_data([t_vals, qcol_vals])

    Vinv_plot.set_data([t_vals, vinv_vals])

    Pcmd_plot.set_data([t_vals, pcmd_vals])
    Pinv_plot.set_data([t_vals, pinv_vals])

    Qcmd_plot.set_data([t_vals, qcmd_vals])
    Qinv_plot.set_data([t_vals, qinv_vals])

    for i in range(len(axs)):
        for j in range(len(axs[0])):
            axs[i][j].set_xlim([max(time_val-WINDOW_TIME, 0.0),
                                max(WINDOW_TIME, time_val)])
            pass
        pass
    

    
    axs[0][0].set_ylim([min(min(vpoi_ref_vals),min(vpoi_vals), min(vpoi_cmp_vals))-0.01,
                        max(max(vpoi_ref_vals),max(vpoi_vals), max(vpoi_cmp_vals))+0.01])
    
    
    axs[1][0].set_ylim([min(min(ppoi_ref_vals),min(ppoi_vals))-0.1,
                        max(max(ppoi_ref_vals),max(ppoi_vals))+0.1])
    
    
    axs[2][0].set_ylim([min(min(qpoi_ref_vals),min(qpoi_vals))-0.1,
                        max(max(qpoi_ref_vals),max(qpoi_vals))+0.1])
    

    axs[0][1].set_ylim([min(vcol_vals)-0.01,
                        max(vcol_vals)+0.01])

    
    axs[1][1].set_ylim([min(pcol_vals)-0.1,
                        max(pcol_vals)+0.1])
    
    
    axs[2][1].set_ylim([min(qcol_vals)-0.1,
                        max(qcol_vals)+0.1])
    
    

    axs[0][2].set_ylim([min(vinv_vals)-0.01,
                        max(vinv_vals)+0.01])
    
    
    axs[1][2].set_ylim([min(min(pcmd_vals),min(pinv_vals))-0.1,
                        max(max(pcmd_vals),max(pinv_vals))+0.1])
    
    
    axs[2][2].set_ylim([min(min(qcmd_vals),min(qinv_vals))-0.1,
                        max(max(qcmd_vals),max(qinv_vals))+0.1])

    canvas.draw()


# GUI
root = Tk.Tk()
label = Tk.Label(root, text="Realtime Animated Graphs").grid(column=0, row=0)

# Controls
controls_frame = Tk.Frame(root)
controls_frame.grid(column=0, row=2)

Vreference_slider = Tk.Scale(master=controls_frame, from_=900, to=1100, showvalue=0,
                             orient=Tk.HORIZONTAL, width=15, length=150)
Vreference_slider.set(int(round(VREF_INIT * 1000.0, 0))); print(Vreference_slider.get())
Vreference_slider.grid(row=0, column=3)

Preference_slider = Tk.Scale(master=controls_frame, from_=-1000, to=1000, showvalue=0,
                             orient=Tk.HORIZONTAL, width=15, length=150)
Preference_slider.set(int(PINIT * 1000.0))
Preference_slider.grid(row=1, column=3)



simulation_slider = Tk.Scale(master=controls_frame, from_=1, to=0,
                             orient=Tk.VERTICAL, width=15, length=50)
simulation_slider.set(0)
simulation_slider.grid(row=3, column=0)


def refresh_Ybus_matrix():
    global MPT_TAP, Ybus_matrix
    
    MPT_TAP = 1.0 + MPT_tap_slider.get()/16.0*0.1
    Ybus_matrix = get_Ybus_matrix()
    return

def refresh_Ybus_matrix2():
    global COL_BUS_jB

    COL_BUS_jB = complex(imag=reactive_slider.get() * 0.1)
    refresh_Ybus_matrix()
    return
    

MPT_tap_slider = Tk.Scale(master=controls_frame, from_=16, to=-16,
                          orient=Tk.VERTICAL, width=15, length=160,
                          command=lambda s: refresh_Ybus_matrix())
MPT_tap_slider.set(int(round((MPT_TAP - 1.0) / 0.00625, 0)))
MPT_tap_slider.grid(row=3, column=9)

reactive_slider = Tk.Scale(master=controls_frame, from_=2, to=-2, showvalue=0,
                           orient=Tk.VERTICAL, width=15, length=160,
                           command=lambda s: refresh_Ybus_matrix2())
reactive_slider.set(0)
reactive_slider.grid(row=3, column=12)


# graph 1
fig = plt.figure(figsize=(16.0, 8.0))
canvas = FigureCanvasTkAgg(fig, master=root)
canvas_widget = canvas.get_tk_widget()
canvas_widget.config(height=800, width=1600)
canvas_widget.grid(column=0, row=1, sticky=Tk.NSEW)

# Create subplots
axs = fig.subplots(nrows=3, ncols=3)
#axs = fig.get_axes()


Vref_plot, = axs[0][0].plot(t_vals, vpoi_ref_vals, color='red', linewidth=2)
Vpoi_plot, = axs[0][0].plot(t_vals, vpoi_vals, color='blue')
Vcmp_plot, = axs[0][0].plot(t_vals, vpoi_cmp_vals, color='seagreen')

Pref_plot, = axs[1][0].plot(t_vals, ppoi_ref_vals, color='red', linewidth=2)
Ppoi_plot, = axs[1][0].plot(t_vals, ppoi_vals, color='blue')

Qref_plot, = axs[2][0].plot(t_vals, qpoi_ref_vals, color='red', linewidth=2)
Qpoi_plot, = axs[2][0].plot(t_vals, qpoi_vals, color='blue')


Vcol_plot, = axs[0][1].plot(t_vals, vcol_vals, color='blue')
Pcol_plot, = axs[1][1].plot(t_vals, pcol_vals, color='blue')
Qcol_plot, = axs[2][1].plot(t_vals, qcol_vals, color='blue')



Vinv_plot, = axs[0][2].plot(t_vals, vinv_vals, color='blue')

Pcmd_plot, = axs[1][2].plot(t_vals, pcmd_vals, color='red', linewidth=2)
Pinv_plot, = axs[1][2].plot(t_vals, pinv_vals, color='blue')

Qcmd_plot, = axs[2][2].plot(t_vals, qcmd_vals, color='red', linewidth=2)
Qinv_plot, = axs[2][2].plot(t_vals, qinv_vals, color='blue')




axs[0][0].set_title('Regulated POI')
axs[0][1].set_title('Collector Bus')
axs[0][2].set_title('Inverter Terminals')

axs[0][0].set_ylabel('voltage (pu)')
axs[1][0].set_ylabel('active power (pu)')
axs[2][0].set_ylabel('reactive power (pu)')

axs[2][0].set_xlabel('time (sec)')
axs[2][1].set_xlabel('time (sec)')
axs[2][2].set_xlabel('time (sec)')

for i in range(len(axs)):
    for j in range(len(axs[0])):
        axs[i][j].set_xlim([0.0, 10.0])
        axs[i][j].grid(True)
        pass
    pass

ani = FuncAnimation(fig, animate, interval=100, blit=False)

Tk.mainloop()
