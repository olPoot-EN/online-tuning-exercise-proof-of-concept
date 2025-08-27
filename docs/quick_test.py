#!/usr/bin/env python3
"""Quick test to isolate the Newton-Raphson issue"""

import sys
import os
import numpy as np

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'original code'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'embedded_modules'))

import NewtonRaphson as nr_original
from newton_raphson import GenericNewtonRaphson as nr_ported

# Simple test case
num_buses = 2
SYS_XE = 0.05

Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]
Sys_Z = complex(0.0, SYS_XE)
Yext = 1.0 / Sys_Z

Ybus_matrix[0][0] = Yext
Ybus_matrix[0][1] = -Yext
Ybus_matrix[1][0] = -Yext
Ybus_matrix[1][1] = Yext

print("Testing original Newton-Raphson:")
try:
    V_orig, S_orig, solved_orig = nr_original.GenericNewtonRaphson(
        Ybus_matrix=Ybus_matrix,
        Vreg_mag=[1.0, None],
        Sgen=[None, complex(0.8, 0.0)],
        Verbose_Output=True
    )
    print(f"Original - Solved: {solved_orig}")
    print(f"Original - V: {V_orig}")
    print(f"Original - S: {S_orig}")
except Exception as e:
    print(f"Original failed: {e}")

print("\nTesting ported Newton-Raphson:")
try:
    V_port, S_port, solved_port = nr_ported(
        Ybus_matrix=Ybus_matrix,
        Vreg_mag=[1.0, None], 
        Sgen=[None, complex(0.8, 0.0)],
        Verbose_Output=True
    )
    print(f"Ported - Solved: {solved_port}")
    print(f"Ported - V: {V_port}")
    print(f"Ported - S: {S_port}")
except Exception as e:
    print(f"Ported failed: {e}")
    import traceback
    traceback.print_exc()