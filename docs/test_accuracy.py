#!/usr/bin/env python3
"""
Mathematical Accuracy Test Suite for Reactive Capability Exercise

This script compares the Newton-Raphson power flow solver results between
the original Python implementation and the ported version to ensure 
identical mathematical precision.
"""

import sys
import os
import numpy as np
import cmath

# Add the original code directory to Python path
original_code_path = os.path.join(os.path.dirname(__file__), '..', 'original code')
sys.path.insert(0, original_code_path)

# Add embedded modules to path
embedded_modules_path = os.path.join(os.path.dirname(__file__), 'embedded_modules')
sys.path.insert(0, embedded_modules_path)

try:
    # Import original implementation
    import NewtonRaphson as nr_original
    
    # Import ported implementation
    from newton_raphson import GenericNewtonRaphson as nr_ported
    from reactive_control import SimulationState
    
    print("✓ Successfully imported both original and ported implementations")
    
except ImportError as e:
    print(f"✗ Import error: {e}")
    sys.exit(1)


class AccuracyTester:
    """Test suite for mathematical accuracy validation"""
    
    def __init__(self):
        self.test_cases = []
        self.results = []
        self.tolerance = 1e-9
        
    def create_test_cases(self):
        """Create comprehensive test cases for validation"""
        
        # Test Case 1: Basic 2-bus system (matches original reactive.py setup)
        num_buses = 2
        SYS_XE = 0.05
        
        Ybus_matrix = [[complex() for c in range(num_buses)] for r in range(num_buses)]
        Sys_Z = complex(0.0, SYS_XE)
        Yext = 1.0 / Sys_Z
        
        Ybus_matrix[0][0] = Yext
        Ybus_matrix[0][1] = -Yext
        Ybus_matrix[1][0] = -Yext
        Ybus_matrix[1][1] = Yext
        
        test_cases = [
            {
                'name': 'Basic 2-Bus System - Nominal Operating Point',
                'Ybus_matrix': [row[:] for row in Ybus_matrix],  # Deep copy
                'Vreg_mag': [1.0, None],
                'Sgen': [None, complex(0.8, 0.0)],
                'description': 'Standard operating point matching original simulation'
            },
            {
                'name': 'Basic 2-Bus System - High Reactive Load',
                'Ybus_matrix': [row[:] for row in Ybus_matrix],
                'Vreg_mag': [1.0, None],
                'Sgen': [None, complex(0.8, 0.5)],
                'description': 'High reactive power injection test'
            },
            {
                'name': 'Basic 2-Bus System - Capacitive Operation',
                'Ybus_matrix': [row[:] for row in Ybus_matrix],
                'Vreg_mag': [1.0, None],
                'Sgen': [None, complex(0.8, -0.3)],
                'description': 'Capacitive (negative reactive) operation'
            },
            {
                'name': 'Basic 2-Bus System - Low Voltage',
                'Ybus_matrix': [row[:] for row in Ybus_matrix],
                'Vreg_mag': [0.95, None],
                'Sgen': [None, complex(0.8, 0.2)],
                'description': 'Low voltage operation test'
            },
            {
                'name': 'Basic 2-Bus System - High Voltage',
                'Ybus_matrix': [row[:] for row in Ybus_matrix],
                'Vreg_mag': [1.05, None], 
                'Sgen': [None, complex(0.8, 0.1)],
                'description': 'High voltage operation test'
            }
        ]
        
        self.test_cases = test_cases
        print(f"✓ Created {len(test_cases)} test cases")
        
    def run_comparison_test(self, test_case):
        """Run a single comparison test between original and ported implementations"""
        
        print(f"\n--- Testing: {test_case['name']} ---")
        print(f"Description: {test_case['description']}")
        
        try:
            # Run original implementation
            V_orig, S_orig, solved_orig = nr_original.GenericNewtonRaphson(
                Ybus_matrix=test_case['Ybus_matrix'],
                Vreg_mag=test_case['Vreg_mag'],
                Sgen=test_case['Sgen'],
                Verbose_Output=False
            )
            
            # Run ported implementation  
            V_port, S_port, solved_port = nr_ported(
                Ybus_matrix=test_case['Ybus_matrix'],
                Vreg_mag=test_case['Vreg_mag'],
                Sgen=test_case['Sgen'],
                Verbose_Output=False
            )
            
            # Compare results
            result = self.compare_results(
                V_orig, S_orig, solved_orig,
                V_port, S_port, solved_port,
                test_case['name']
            )
            
            return result
            
        except Exception as e:
            print(f"✗ Test execution failed: {e}")
            return {
                'name': test_case['name'],
                'passed': False,
                'error': str(e),
                'convergence_match': False,
                'voltage_match': False,
                'power_match': False,
                'max_voltage_error': 0.0,
                'max_power_error': 0.0
            }
    
    def compare_results(self, V_orig, S_orig, solved_orig, V_port, S_port, solved_port, test_name):
        """Compare results between original and ported implementations"""
        
        result = {
            'name': test_name,
            'passed': True,
            'error': None,
            'convergence_match': solved_orig == solved_port,
            'voltage_match': True,
            'power_match': True,
            'max_voltage_error': 0.0,
            'max_power_error': 0.0
        }
        
        # Check convergence
        if not result['convergence_match']:
            print(f"✗ Convergence mismatch: Original={solved_orig}, Ported={solved_port}")
            result['passed'] = False
        else:
            print(f"✓ Convergence match: {solved_orig}")
        
        # Compare voltage results
        if len(V_orig) != len(V_port):
            print(f"✗ Voltage vector length mismatch: {len(V_orig)} vs {len(V_port)}")
            result['voltage_match'] = False
            result['passed'] = False
        else:
            max_v_error = 0.0
            for i, (v_orig, v_port) in enumerate(zip(V_orig, V_port)):
                v_error = abs(v_orig - v_port)
                max_v_error = max(max_v_error, v_error)
                
                if v_error > self.tolerance:
                    print(f"✗ Voltage Bus {i+1}: |{v_orig:.9f} - {v_port:.9f}| = {v_error:.2e} > {self.tolerance:.2e}")
                    result['voltage_match'] = False
                    result['passed'] = False
                else:
                    print(f"✓ Voltage Bus {i+1}: Error = {v_error:.2e}")
            
            result['max_voltage_error'] = max_v_error
        
        # Compare power results
        if len(S_orig) != len(S_port):
            print(f"✗ Power vector length mismatch: {len(S_orig)} vs {len(S_port)}")
            result['power_match'] = False
            result['passed'] = False
        else:
            max_s_error = 0.0
            for i, (s_orig, s_port) in enumerate(zip(S_orig, S_port)):
                s_error = abs(s_orig - s_port)
                max_s_error = max(max_s_error, s_error)
                
                if s_error > self.tolerance:
                    print(f"✗ Power Bus {i+1}: |{s_orig:.9f} - {s_port:.9f}| = {s_error:.2e} > {self.tolerance:.2e}")
                    result['power_match'] = False
                    result['passed'] = False
                else:
                    print(f"✓ Power Bus {i+1}: Error = {s_error:.2e}")
            
            result['max_power_error'] = max_s_error
        
        if result['passed']:
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED")
            
        return result
    
    def test_control_system_integration(self):
        """Test the reactive control system integration"""
        print(f"\n--- Testing: Reactive Control System Integration ---")
        
        try:
            # Create simulation state
            sim_state = SimulationState()
            
            # Test basic parameter access
            assert sim_state.DELT == 0.05, "Time step mismatch"
            assert sim_state.SYS_XE == 0.05, "System reactance mismatch"
            assert sim_state.VCTRL_KP == 10.0, "Voltage controller Kp mismatch"
            assert sim_state.VCTRL_KI == 50.0, "Voltage controller Ki mismatch"
            
            print("✓ Control system parameters initialized correctly")
            
            # Test Ybus matrix setup
            assert len(sim_state.Ybus_matrix) == 2, "Ybus matrix size incorrect"
            assert len(sim_state.Ybus_matrix[0]) == 2, "Ybus matrix size incorrect"
            
            # Check Ybus values match original
            Yext = 1.0 / complex(0.0, sim_state.SYS_XE)
            assert abs(sim_state.Ybus_matrix[0][0] - Yext) < 1e-12, "Ybus[0][0] incorrect"
            assert abs(sim_state.Ybus_matrix[0][1] - (-Yext)) < 1e-12, "Ybus[0][1] incorrect"
            assert abs(sim_state.Ybus_matrix[1][0] - (-Yext)) < 1e-12, "Ybus[1][0] incorrect"
            assert abs(sim_state.Ybus_matrix[1][1] - Yext) < 1e-12, "Ybus[1][1] incorrect"
            
            print("✓ Ybus matrix setup matches original implementation")
            
            # Test data initialization
            assert len(sim_state.time_vals) == 2, "Initial time values incorrect"
            assert len(sim_state.voltage_vals) == 2, "Initial voltage values incorrect"
            assert len(sim_state.voltage_ref_vals) == 2, "Initial voltage reference values incorrect"
            
            print("✓ Data arrays initialized correctly")
            
            return True
            
        except Exception as e:
            print(f"✗ Control system integration test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Starting Mathematical Accuracy Test Suite")
        print("=" * 60)
        
        # Create test cases
        self.create_test_cases()
        
        # Run Newton-Raphson comparison tests
        print(f"\n📊 Running Newton-Raphson Comparison Tests")
        print("-" * 50)
        
        passed_tests = 0
        total_tests = len(self.test_cases)
        
        for test_case in self.test_cases:
            result = self.run_comparison_test(test_case)
            self.results.append(result)
            
            if result['passed']:
                passed_tests += 1
        
        # Run control system integration test
        print(f"\n🎛️  Running Control System Integration Test")
        print("-" * 50)
        
        integration_passed = self.test_control_system_integration()
        if integration_passed:
            passed_tests += 1
        total_tests += 1
        
        # Generate summary report
        self.generate_summary_report(passed_tests, total_tests)
        
        return passed_tests == total_tests
    
    def generate_summary_report(self, passed_tests, total_tests):
        """Generate comprehensive test summary report"""
        print(f"\n📋 Test Summary Report")
        print("=" * 60)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Mathematical accuracy verified")
            print("✅ Newton-Raphson solver ported correctly")
            print("✅ Control system integration validated")
        else:
            print(f"\n⚠️  {total_tests - passed_tests} TESTS FAILED")
            print("❌ Mathematical accuracy issues detected")
            
            # Show detailed failure analysis
            print(f"\nDetailed Failure Analysis:")
            print("-" * 30)
            for result in self.results:
                if not result['passed']:
                    print(f"❌ {result['name']}")
                    if not result['convergence_match']:
                        print(f"   - Convergence mismatch")
                    if not result['voltage_match']:
                        print(f"   - Voltage error: {result['max_voltage_error']:.2e}")
                    if not result['power_match']:
                        print(f"   - Power error: {result['max_power_error']:.2e}")
                    if result['error']:
                        print(f"   - Exception: {result['error']}")
        
        print(f"\nTolerance Used: {self.tolerance:.2e}")
        print(f"Test completed at: {__import__('datetime').datetime.now().isoformat()}")


def main():
    """Main test execution"""
    tester = AccuracyTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()