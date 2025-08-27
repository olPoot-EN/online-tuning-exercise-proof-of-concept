'''This is a generic Newton-Raphson Power Flow solver.

Update 17-Mar-2022 to include optional 'verbose output', meaning
details of the iterative values will be printed to the screen, if
used.
Update also includes functionality to have a vector of callable
functions to calculate the min / max reactive power capability
for the given voltage and active power level.

Update 11-May-2022 to include optional constant current and/or constant
addmittance load(s), meaning the load may be dependent on the bus voltage.

Update 1-Sep-2023 to include additional optional initial values for the starting
point of the power flow solution. A variable called "solved" is also used to
keep track of whether or not the solution converged. This boolean is now
included in the returned vector.

'''

import numpy as np
import math as m

def GenericNewtonRaphson(Ybus_matrix: [[complex]],  # N x N matrix representing the admittance of the system
                         Vreg_mag: [float],  # N size vector containing the voltage magnitude of regulated buses
                                             # Note: for un-regulated buses, a value of None should be supplied
                         Sgen: [complex],  # N size vector containing complex values of power supplied to each bus
                         Sload: [complex] = None,  # N size vector, power from bus
                                                   # Note: positive values should typically be provided
                         Sload_const_I: [complex] = None,  # N size vector, power from bus
                                                   # Note: values shall be expressed in pu for nominal bus voltage
                         Sload_const_Y: [complex] = None,  # N size vector, power from bus
                                                   # Note: values shall be expressed in pu for nominal bus voltage
                         Qgen_min: [float] = None,  # N size vector containing the maximum reactive power capability
                                                    # Note: This is only used on regulated buses.
                         Qgen_max: [float] = None,  # N size vector containing the minimum reactive power capability
                         Qgen_cap: [callable] = None,  # N size vector containing callable functions to calculate min
                                                       # and max reactive power capability
                         initial_V: [complex] = None, # initial voltage magnitude and angle (or just angle if regulated)
                         Final_Output = False,
                         Verbose_Output = False) -> [[complex], [complex]]:

    ''' Information

    Slack bus (known voltage and fixed angle of 0 radians) must be bus 1.'''

    num_buses = len(Ybus_matrix)

    if len(Ybus_matrix[0]) != num_buses:
        raise ValueError("Ybus_matrix must be square")
        pass

    if len(Vreg_mag) != num_buses:
        raise ValueError("Vreg_mag size mismatch")
        pass

    if Sload is None:  # added in to make Sload an optional parameter
        Sload = [complex() for x in range(num_buses)]
        pass

    if len(Sgen) != num_buses or len(Sload) != num_buses:
        raise ValueError("Sgen/Sload size mismatch")
        pass

    if Sload_const_I is not None:
        if len(Sload_const_I) != num_buses:
            raise ValueError("Sload_const_I size mismatch")
            pass
        pass

    if Sload_const_Y is not None:
        if len(Sload_const_Y) != num_buses:
            raise ValueError("Sload_const_Y size mismatch")
            pass
        pass

    if Qgen_max is not None:
        if len(Qgen_max) != num_buses:
            raise ValueError("Qgen_max size mismatch")
            pass
        pass

    if Qgen_min is not None:
        if len(Qgen_min) != num_buses:
            raise ValueError("Qgen_min size mismatch")
            pass
        pass

    if Qgen_cap is not None:
        if len(Qgen_cap) != num_buses:
            raise ValueError("Qgen_cap size mismatch")
            pass
        pass

    # defined tolerance level, in per-unit or radians, and max number of iterations to solve
    TOLERANCE = 1.0e-9
    MAX_ITERATIONS = 200

    Vreg_declared = [False for x in range(num_buses)]
    for i in range(num_buses):
        if Vreg_mag[i] is not None:
            Vreg_declared[i] = True
            pass
        pass
    # print(Vreg_declared)

    Ybus_mag = [[0.0 for x in range(num_buses)] for y in range(num_buses)]
    Ybus_ang = [[0.0 for x in range(num_buses)] for y in range(num_buses)]

    for i in range(num_buses):
        for j in range(num_buses):
            Ybus_mag[i][j] = abs(Ybus_matrix[i][j])
            Ybus_ang[i][j] = np.angle(Ybus_matrix[i][j], deg=False)
            pass
        pass
    
    # Initialize voltage vector
    if initial_V is None:
        V = [complex(real=Vreg_mag[x] if Vreg_declared[x] else Vreg_mag[0], imag=0.0) 
             for x in range(num_buses)]
    else:
        V = [complex(real=initial_V[x].real if not Vreg_declared[x] else Vreg_mag[x],
                    imag=initial_V[x].imag) for x in range(num_buses)]
    
    Vmag = [abs(x) for x in V]
    Vang = [np.angle(x, deg=False) for x in V]
    S = [complex() for x in range(num_buses)]
    
    size = (num_buses - 1) * 2
    mismatch = [0.0 for x in range(size)]
    iteration = 0
    solved = False
    
    def calculate_Jacobian():
        """Calculate Jacobian matrix for Newton-Raphson iteration"""
        jacobian = [[0.0 for x in range(size)] for y in range(size)]
        
        for i in range(1, num_buses):
            for j in range(1, num_buses):
                # del P / del delta (angle)
                if i == j:
                    temp = 0.0
                    for k in range(num_buses):
                        if k != i:
                            temp += (Ybus_mag[i][k] * Vmag[k] * 
                                   m.sin(Vang[i] - Vang[k] - Ybus_ang[i][k]))
                    temp *= -Vmag[i]
                    jacobian[i - 1][j - 1] = temp
                else:
                    jacobian[i - 1][j - 1] = (Vmag[i] * Ybus_mag[i][j] * Vmag[j] * 
                                             m.sin(Vang[i] - Vang[j] - Ybus_ang[i][j]))
                
                # del P / del V (voltage magnitude)
                if i == j:
                    temp = Vmag[i] * Ybus_mag[i][j] * m.cos(Ybus_ang[i][j])
                    for k in range(num_buses):
                        temp += (Ybus_mag[i][k] * Vmag[k] * 
                               m.cos(Vang[i] - Vang[k] - Ybus_ang[i][k]))
                    jacobian[i - 1][j + num_buses - 2] = temp
                else:
                    jacobian[i - 1][j + num_buses - 2] = (Vmag[i] * Ybus_mag[i][j] * 
                                                         m.cos(Vang[i] - Vang[j] - Ybus_ang[i][j]))
                
                # del Q / del delta (angle)
                if i == j:
                    temp = 0.0
                    for k in range(num_buses):
                        if k != i:
                            temp += (Ybus_mag[i][k] * Vmag[k] * 
                                   m.cos(Vang[i] - Vang[k] - Ybus_ang[i][k]))
                    temp *= Vmag[i]
                    jacobian[i + num_buses - 2][j - 1] = temp
                else:
                    jacobian[i + num_buses - 2][j - 1] = (-Vmag[i] * Ybus_mag[i][j] * Vmag[j] * 
                                                         m.cos(Vang[i] - Vang[j] - Ybus_ang[i][j]))
                
                # del Q / del V (voltage magnitude)
                if i == j:
                    temp = -Vmag[i] * Ybus_mag[i][j] * m.sin(Ybus_ang[i][j])
                    for k in range(num_buses):
                        temp += (Ybus_mag[i][k] * Vmag[k] * 
                               m.sin(Vang[i] - Vang[k] - Ybus_ang[i][k]))
                    jacobian[i + num_buses - 2][j + num_buses - 2] = temp
                else:
                    jacobian[i + num_buses - 2][j + num_buses - 2] = (Vmag[i] * Ybus_mag[i][j] * 
                                                                     m.sin(Vang[i] - Vang[j] - Ybus_ang[i][j]))
        
        return jacobian
    
    # Main Newton-Raphson iteration loop
    while True:
        jacobian = calculate_Jacobian()
        
        # Update voltage phasors
        for i in range(1, num_buses):
            V[i] = complex(real=Vmag[i] * m.cos(Vang[i]),
                          imag=Vmag[i] * m.sin(Vang[i]))
        
        # Calculate currents and power
        I = np.matmul(Ybus_matrix, V)
        S = [V[i] * np.conjugate(I[i]) for i in range(num_buses)]
        
        if Verbose_Output and iteration < 3:  # Limit verbose output in browser
            print(f'-------- Iteration {iteration + 1} --------')
            for i in range(num_buses):
                print(f'V{i+1} = {Vmag[i]:.6f} pu, d{i+1} = {Vang[i]:.6f} rad, '
                      f'P{i+1} = {S[i].real:.6f} pu, Q{i+1} = {S[i].imag:.6f} pu')
        
        # Determine voltage regulation status
        Vregulating = [False for x in range(num_buses)]
        
        for i in range(1, num_buses):
            if Vreg_declared[i]:
                under = False
                over = False
                
                # Check reactive power limits
                if Qgen_min is not None and Qgen_min[i] is not None:
                    if (S[i].imag + Sload[i].imag) <= Qgen_min[i] or Vmag[i] > Vreg_mag[i]:
                        under = True
                        Sgen[i] = complex(real=Sgen[i].real, imag=Qgen_min[i])
                
                if Qgen_max is not None and Qgen_max[i] is not None:
                    if (S[i].imag + Sload[i].imag) >= Qgen_max[i] or Vmag[i] < Vreg_mag[i]:
                        over = True
                        Sgen[i] = complex(real=Sgen[i].real, imag=Qgen_max[i])
                
                # Handle callable reactive limits (if implemented)
                if Qgen_cap is not None and Qgen_cap[i] is not None:
                    try:
                        Qmin_val, Qmax_val = Qgen_cap[i](Vpu=Vmag[i], Ppu=Sgen[i].real)
                        if (S[i].imag + Sload[i].imag) <= Qmin_val or Vmag[i] > Vreg_mag[i]:
                            if under:
                                Qmin_limit = max(Sgen[i].imag, Qmin_val)
                                Sgen[i] = complex(real=Sgen[i].real, imag=Qmin_limit)
                            else:
                                Sgen[i] = complex(real=Sgen[i].real, imag=Qmin_val)
                                under = True
                        
                        if (S[i].imag + Sload[i].imag) >= Qmax_val or Vmag[i] < Vreg_mag[i]:
                            if over:
                                Qmax_limit = min(Sgen[i].imag, Qmax_val)
                                Sgen[i] = complex(real=Sgen[i].real, imag=Qmax_limit)
                            else:
                                Sgen[i] = complex(real=Sgen[i].real, imag=Qmax_val)
                                over = True
                    except Exception as e:
                        if Verbose_Output:
                            print(f"Reactive limit calculation error: {e}")
                
                Vregulating[i] = (not under) and (not over)
            
            # Calculate net power injection
            Snet = Sgen[i] - Sload[i]
            
            # Apply constant current loads
            if Sload_const_I is not None and Sload_const_I[i] is not None:
                Snet -= (Vmag[i] * Sload_const_I[i])
            
            # Apply constant admittance loads
            if Sload_const_Y is not None and Sload_const_Y[i] is not None:
                Snet -= (m.pow(Vmag[i], 2) * Sload_const_Y[i])
            
            # Calculate power mismatch
            Serr = Snet - S[i]
            
            # Set up mismatch vector
            mismatch[i - 1] = Serr.real
            
            if Vregulating[i]:
                mismatch[i + num_buses - 2] = 0.0
            else:
                mismatch[i + num_buses - 2] = Serr.imag
        
        # Solve for corrections
        try:
            del_val = np.matmul(np.linalg.inv(jacobian), mismatch)
        except np.linalg.LinAlgError:
            if Verbose_Output:
                print("Singular Jacobian matrix - no solution found")
            break
        
        # Apply corrections
        for i in range(1, num_buses):
            Vang[i] += del_val[i - 1]
            
            if Vreg_declared[i]:
                if Vregulating[i]:
                    Vmag[i] = Vreg_mag[i]
                else:
                    # Apply voltage magnitude correction with limits
                    if Vmag[i] > Vreg_mag[i]:
                        if del_val[i + num_buses - 2] < (Vreg_mag[i] - Vmag[i]):
                            Vmag[i] = Vreg_mag[i]
                        else:
                            Vmag[i] += del_val[i + num_buses - 2]
                    elif Vmag[i] < Vreg_mag[i]:
                        if del_val[i + num_buses - 2] > (Vreg_mag[i] - Vmag[i]):
                            Vmag[i] = Vreg_mag[i]
                        else:
                            Vmag[i] += del_val[i + num_buses - 2]
                    else:
                        Vmag[i] += del_val[i + num_buses - 2]
            else:
                Vmag[i] += del_val[i + num_buses - 2]
        
        iteration += 1
        
        # Check for convergence or maximum iterations
        if len(del_val) > 0:
            max_mismatch = max(np.max(del_val), -np.min(del_val))
        else:
            max_mismatch = float('inf')
        
        if iteration >= MAX_ITERATIONS:
            if Verbose_Output:
                print('MAXIMUM ITERATIONS REACHED! NO SOLUTION FOUND.')
            break
        elif max_mismatch <= TOLERANCE:
            solved = True
            if Verbose_Output:
                print(f'Converged in {iteration} iterations with tolerance {TOLERANCE}')
            break
    
    # Final voltage calculation
    for i in range(1, num_buses):
        V[i] = complex(real=Vmag[i] * m.cos(Vang[i]),
                      imag=Vmag[i] * m.sin(Vang[i]))
    
    # Final power calculation
    I = np.matmul(Ybus_matrix, V)
    S = [V[i] * np.conjugate(I[i]) for i in range(num_buses)]
    
    if Verbose_Output or Final_Output:
        print('\nFinal solution:')
        for i in range(num_buses):
            print(f'V{i+1} = {Vmag[i]:.6f} pu, d{i+1} = {Vang[i]:.6f} rad, '
                  f'P{i+1} = {S[i].real:.6f} pu, Q{i+1} = {S[i].imag:.6f} pu')
    
    return [V, S, solved]


def pretty_print_matrix(matrix):
    """Pretty print matrix for debugging purposes"""
    return '\n'.join(['\t'.join([f'{x:.6f}' for x in row]) for row in matrix])


def pretty_print_vector(vector):
    """Pretty print vector for debugging purposes"""
    return '\n'.join([f'{x}' for x in vector])