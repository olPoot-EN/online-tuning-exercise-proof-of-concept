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
        raise ValueError
        pass

    if len(Vreg_mag) != num_buses:
        raise ValueError
        pass

    if Sload is None:  # added in to make Sload an optional parameter
        Sload = [complex() for x in range(num_buses)]
        pass

    if len(Sgen) != num_buses or len(Sload) != num_buses:
        raise ValueError
        pass

    if Sload_const_I is not None:
        if len(Sload_const_I) != num_buses:
            raise ValueError
            pass
        pass

    if Sload_const_Y is not None:
        if len(Sload_const_Y) != num_buses:
            raise ValueError
            pass
        pass

    if Qgen_max is not None:
        if len(Qgen_max) != num_buses:
            raise ValueError
            pass
        pass

    if Qgen_min is not None:
        if len(Qgen_min) != num_buses:
            raise ValueError
            pass
        pass

    if Qgen_cap is not None:
        if len(Qgen_cap) != num_buses:
            raise ValueError
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

    V = [complex(real=Vreg_mag[x] if Vreg_declared[x] else Vreg_mag[0] if initial_V is None else initial_V[x].real,
                 imag=0.0 if initial_V is None else initial_V[x].imag) for x in range(num_buses)]
    Vmag = [abs(x) for x in V]
    Vang = [np.angle(x, deg=False) for x in V]
    S = [complex() for x in range(num_buses)]

    size = (num_buses - 1) * 2

    mismatch = [0.0 for x in range(size)]

    iteration = 0


    def calculate_Jacobian() -> [[float]]:
        # global Ybus_mag
        # global Ybus_ang
        # global Vmag
        # global Vang

        jacobian = [[0.0 for x in range(size)] for y in range(size)]

        for i in range(1, num_buses):
            for j in range(1, num_buses):
                ## del P / del d
                if i == j:
                    temp = 0.0
                    for k in range(num_buses):
                        if k != i:
                            temp += Ybus_mag[i][k] * Vmag[k] * m.sin(Vang[i] - Vang[k] - Ybus_ang[i][k])
                            pass
                        pass
                    temp *= -Vmag[i]
                    jacobian[i - 1][j - 1] = temp
                    pass
                else:
                    jacobian[i - 1][j - 1] = Vmag[i] * Ybus_mag[i][j] * Vmag[j] * m.sin(Vang[i] - Vang[j] - Ybus_ang[i][j])
                    pass

                ## del P / del V
                if i == j:
                    temp = Vmag[i] * Ybus_mag[i][j] * m.cos(Ybus_ang[i][j])
                    for k in range(num_buses):
                        temp += Ybus_mag[i][k] * Vmag[k] * m.cos(Vang[i] - Vang[k] - Ybus_ang[i][k])
                        pass
                    jacobian[i - 1][j + num_buses - 2] = temp
                    pass
                else:
                    jacobian[i - 1][j + num_buses - 2] = Vmag[i] * Ybus_mag[i][j] * m.cos(Vang[i] - Vang[j] - Ybus_ang[i][j])
                    pass

                ## del Q / del d
                if i == j:
                    temp = 0.0
                    for k in range(num_buses):
                        if k != i:
                            temp += Ybus_mag[i][k] * Vmag[k] * m.cos(Vang[i] - Vang[k] - Ybus_ang[i][k])
                            pass
                        pass
                    temp *= Vmag[i]
                    jacobian[i + num_buses - 2][j - 1] = temp
                    pass
                else:
                    jacobian[i + num_buses - 2][j - 1] = -Vmag[i] * Ybus_mag[i][j] * Vmag[j] * m.cos(Vang[i] - Vang[j] - Ybus_ang[i][j])
                    pass

                ## del Q / del V
                if i == j:
                    temp = -Vmag[i] * Ybus_mag[i][j] * m.sin(Ybus_ang[i][j])
                    for k in range(num_buses):
                        temp += Ybus_mag[i][k] * Vmag[k] * m.sin(Vang[i] - Vang[k] - Ybus_ang[i][k])
                        pass
                    jacobian[i + num_buses - 2][j + num_buses - 2] = temp
                    pass
                else:
                    jacobian[i + num_buses - 2][j + num_buses - 2] = Vmag[i] * Ybus_mag[i][j] * m.sin(Vang[i] - Vang[j] - Ybus_ang[i][j])
                    pass
                pass
            pass
        return jacobian

    solved=False


    while True:
        jacobian = calculate_Jacobian()

        for i in range(1, num_buses):
            V[i] = complex(real=Vmag[i] * m.cos(Vang[i]),
                       imag=Vmag[i] * m.sin(Vang[i]))
            pass

        I = np.matmul(Ybus_matrix, V)
        S = [V[i] * np.conjugate(I[i]) for i in range(num_buses)]

        if Verbose_Output:
            print('-------- Iteration {0} --------'.format(iteration+1))
            print('{0} and Calculated Power:'.format( 'Initial Voltage / Angle' if iteration == 0 else 'Voltage / Angle from Previous Iteration'))
            for i in range(num_buses):
                print('V{0} = {1:.6f} pu, d{0} = {2:.6f} rad, P{0} = {3:.6f} pu, Q{0} = {4:.6f} pu'.format(i+1,
                                                                                           Vmag[i],
                                                                                           Vang[i],
                                                                                           S[i].real,
                                                                                           S[i].imag))
                pass

            print('')
            pass

        # Determine if generators are regulating bus voltage or not
        Vregulating = [False for x in range(num_buses)]  # initially assume PQ

        for i in range(1, num_buses):
            if Vreg_declared[i]:
                ## specified as a PV bus, need to check reactive limits, if supplied
                under = False
                over = False
                '''Qgen_min and Qgen_max vectors provide constant value limits. There is no
                    need to check each time to make sure that the limit hasn't changed.'''
                if Qgen_min is not None:
                    if Qgen_min[i] is not None:
                        if (S[i].imag + Sload[i].imag) <= Qgen_min[i] or Vmag[i] > Vreg_mag[i]:
                            under = True
                            Sgen[i] = complex(real=Sgen[i].real,
                                              imag=Qgen_min[i])
                            pass
                        pass
                    pass
                if Qgen_max is not None:
                    if Qgen_max[i] is not None:
                        if (S[i].imag + Sload[i].imag) >= Qgen_max[i] or Vmag[i] < Vreg_mag[i]:
                            over = True
                            Sgen[i] = complex(real=Sgen[i].real,
                                              imag=Qgen_max[i])
                            pass
                        pass
                    pass
                '''Qgen_cap, on the other hand, will likely change limits each time due to
                    voltage dependency. Need to check each time.'''
                if Qgen_cap is not None:
                    if Qgen_cap[i] is not None:
                        # Note: the callable function must take parameters Vpu and Ppu
                        # and return [Qmin, Qmax]. All values will be provided in pu
                        # of the working base, so appropriate scaling must be handled
                        # in the callable function.
                        try:
                            [Qmin_val, Qmax_val] = Qgen_cap[i](Vpu=Vmag[i], Ppu=Sgen[i].real)
                            if (S[i].imag + Sload[i]) <= Qmin_val or Vmag[i] > Vreg_mag[i]:
                                if under:  # Qgen_min already flagged this
                                    # Use whichever is more restrictive (larger value)
                                    Qmin_limit = max(Sgen[i].imag, Qmin_val)
                                    Sgen[i] = complex(real=Sgen[i].real,
                                                      imag=Qmin_limit)
                                    pass
                                else:
                                    Sgen[i] = complex(real=Sgen[i].real,
                                                      imag=Qmin_val)
                                    under = True
                                    pass
                                pass
                            if (S[i].imag + Sload[i]) >= Qmax_val or Vmag[i] < Vreg_mag[i]:
                                if over:  # Qgen_max already flagged this
                                    # Use whichever is more restrictive (smaller value)
                                    Qmax_limit = min(Sgen[i].imag, Qmax_val)
                                    Sgen[i] = complex(real=Sgen[i].real,
                                                      imag=Qmax_limit)
                                    pass
                                else:
                                    Sgen[i] = complex(real=Sgen[i].real,
                                                      imag=Qmax_val)
                                    over = True
                                    pass
                                pass
                            pass
                        except Exception as e:
                            print(e)
                            pass
                        pass
                    pass

                Vregulating[i] = (not under) and (not over)

                pass

            Snet = Sgen[i] - Sload[i]

            if Sload_const_I is not None:
                if Sload_const_I[i] is not None:
                    Snet -= (Vmag[i] * Sload_const_I[i])
                    pass
                pass

            if Sload_const_Y is not None:
                if Sload_const_Y[i] is not None:
                    Snet -= (m.pow(Vmag[i], 2) * Sload_const_Y[i])
                    pass
                pass

            Serr = Snet - S[i]  # y - f(x)

            #print(Serr)

            mismatch[i - 1] = Serr.real


            if Vregulating[i]:
                mismatch[i + num_buses - 2] = 0.0
                pass
            else:
                mismatch[i + num_buses - 2] = Serr.imag
                pass
            pass

        del_val = np.matmul(np.linalg.inv(jacobian), mismatch)

        for i in range(1, num_buses):
            Vang[i] += del_val[i - 1]
            if Vreg_declared[i]:
                if Vregulating[i]:
                    Vmag[i] = Vreg_mag[i]
                    pass
                else:
                    # print(Vmag[i], Vreg_mag[i], del_val[i + num_buses - 2])
                    if Vmag[i] > Vreg_mag[i]:  # limited by min reactive capability
                        if del_val[i + num_buses - 2] < (Vreg_mag[i] - Vmag[i]):
                            Vmag[i] = Vreg_mag[i]
                            pass
                        else:
                            Vmag[i] += del_val[i + num_buses - 2]
                            pass
                        pass
                    elif Vmag[i] < Vreg_mag[i]:  # limited by max reactive capability
                        if del_val[i + num_buses - 2] > (Vreg_mag[i] - Vmag[i]):
                            Vmag[i] = Vreg_mag[i]
                            pass
                        else:
                            Vmag[i] += del_val[i + num_buses - 2]
                            pass
                        pass
                    else:
                        Vmag[i] += del_val[i + num_buses - 2]
                        pass
                    pass
                pass
            else:
                Vmag[i] += del_val[i + num_buses - 2]
                pass
            pass


        if Verbose_Output:

            vreg_text = False
            for i in range(1, num_buses):
                if Vreg_declared[i] and not Vregulating[i]:
                    print('Bus {0} has reached reactive power limits and is not regulating bus voltage.'.format(i+1))
                    print('Bus {0} shall be limited to {1:.6f} pu of reactive power.'.format(i+1,
                                                                                         Sgen[i].imag - Sload[i].imag))

                    vreg_text = True
                    pass
                pass

            if vreg_text:
                print('')
                pass

            print('Jacobian matrix:')
            pretty_print_matrix(jacobian)
            print('')
            print('Delta:')
            pretty_print_vector(del_val)
            print('')

            if max(max(del_val), -min(del_val)) <= TOLERANCE:
                print('Values yield a solution with a maximum error less than or equal to tolerance ({0}).'.format(TOLERANCE))
                pass
            else:
                print('Results:')
                print('Bus 1 is slack bus. Voltage and angle unchanged.')
                for i in range(1, num_buses):
                    voltage_message = '{0}V{1} {2} {3:.6f} pu'.format('' if Vregulating[i] and Vmag[i] == Vreg_mag[i] else 'new ',
                                                                  i+1,
                                                                  'regulating at' if Vregulating[i] and Vmag[i] == Vreg_mag[i] else '=',
                                                                  Vmag[i])
                    print('{0}, new d{1} = {2:.6f} rad'.format(voltage_message,
                                                           i+1,
                                                           Vang[i]))
                    pass
                pass
            print('')
            print('')
            pass

        iteration += 1

        if iteration >= MAX_ITERATIONS or max(max(del_val), -min(del_val)) <= TOLERANCE:
            if iteration >= MAX_ITERATIONS:
                print('MAXIMUM ITERATIONS REACHED! NO SOLUTION FOUND.')
                pass
            else:
                solved=True
            break
            pass
        pass

    #print(iteration)

    for i in range(1, num_buses):
        V[i] = complex(real=Vmag[i] * m.cos(Vang[i]),
                       imag=Vmag[i] * m.sin(Vang[i]))
        pass

    if Verbose_Output or Final_Output:
        print('')
        print('Final solution:')
        for i in range(num_buses):
            print('V{0} = {1:.6f} pu, d{0} = {2:.6f} rad, P{0} = {3:.6f} pu, Q{0} = {4:.6f} pu'.format(i+1,
                                                                                           Vmag[i],
                                                                                           Vang[i],
                                                                                           S[i].real,
                                                                                           S[i].imag))
            pass
        pass

    return [V, S, solved]




def pretty_print_matrix(matrix: [[float]]):
    print('\n'.join(['\t'.join(['{0:.6f}'.format(x) for x in row]) for row in matrix]))
    pass

def pretty_print_vector(vector: [[float]]):
    print('\n'.join(['{0}'.format(x) for x in vector]))
    pass
