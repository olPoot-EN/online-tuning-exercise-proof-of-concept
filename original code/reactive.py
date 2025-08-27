import random
import tkinter as Tk
from itertools import count

import numpy as np

import NewtonRaphson as nr

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk


DELT = 0.05


SYS_XE = 0.05  # pu, on 100 MVA base


TQ_PLANT = 0.25  # seconds


VCTRL_KP = 10.0  # temp value
VCTRL_KI = 50.0  # temp value, not presently used

NOISE = 0.002  # pu




VINIT = 1.0  # pu, magnitude only

PINIT = 0.8  # pu  - not (yet?) variable
QINIT = 0.0  # pu


IINIT = np.conjugate(complex(PINIT, QINIT)) / VINIT; print(IINIT)

VSYS = abs(VINIT - IINIT * complex(0, SYS_XE));  print(VSYS)


#plt.style.use('fivethirtyeight')
# values for first graph
t_vals = [-2*DELT, -DELT]
v_vals = [1.0, 1.0]
vref_vals = [1.0, 1.0]
# values for second graph
q_vals = [0.0, 0.0]
qref_vals = [0.0, 0.0]

index = count()
#index2 = count()


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

def animate(i):
    global KI_STORE
    global TQ_STORE
    global Ybus_matrix
    
    # Generate values
    t_vals.append(next(index) * DELT)
    time_val = max(t_vals)
    
    # v_vals.append(1.0 - NOISE / 2.0 + NOISE*random.random())  # updated, still temp
    vref_vals.append(float(Vreference_slider.get() / 100.0))  # updated, update further if needed

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


    # update power flow
    Vsys = VSYS + (random.random()-0.5)*2.0*NOISE

    [Vout, Sout, solved] = nr.GenericNewtonRaphson(Ybus_matrix=Ybus_matrix,
                                                   Vreg_mag=[complex(Vsys),
                                                             None],
                                                   Sgen=[None,
                                                         complex(PINIT,  # update?
                                                                 q_vals[-1])],
                                                   Verbose_Output=False)
    v_vals.append(abs(Vout[1]))  # updated
    

    while t_vals[0] < time_val - 10.0:  # remove old data
        t_vals.pop(0)
        v_vals.pop(0)
        vref_vals.pop(0)
        q_vals.pop(0)
        qref_vals.pop(0)
        pass
    
    # Get all axes of figure
    fig = plt.gcf()
    fig.set_size_inches(8.5, 6.5)
    ax1, ax2 = fig.get_axes()
    # Clear current data
    ax1.cla()
    ax2.cla()
    # Plot new data
    ax1.plot(t_vals, vref_vals, color='red')
    ax1.plot(t_vals, v_vals, color='blue')
    ax2.plot(t_vals, qref_vals, color='red')
    ax2.plot(t_vals, q_vals, color='blue')

    ax1.set_xlim([max(time_val-10.0, 0.0),
                  max(10.0, time_val)])
    ax2.set_xlim([max(time_val-10.0, 0.0),
                  max(10.0, time_val)])


# GUI
root = Tk.Tk()
label = Tk.Label(root, text="Realtime Animated Graphs").grid(column=0, row=0)

# Controls
controls_frame = Tk.Frame(root)
controls_frame.grid(column=0, row=2)

Vreference_slider = Tk.Scale(master=controls_frame, from_=90, to=110, showvalue=0,
                             orient=Tk.HORIZONTAL, width=15, length=150)
Vreference_slider.set(100)
Vreference_slider.grid(row=0, column=3)


# graph 1
canvas = FigureCanvasTkAgg(plt.gcf(), master=root)
canvas_widget = canvas.get_tk_widget()
canvas_widget.grid(column=0, row=1, sticky=Tk.NSEW)
# Create two subplots in row 1 and column 1, 2
plt.gcf().subplots(nrows=2, ncols=1)
ani = FuncAnimation(plt.gcf(), animate, interval=int(50), blit=False)

Tk.mainloop()
 
