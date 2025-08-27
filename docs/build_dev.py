#!/usr/bin/env python3
"""
Development build script for Voltage Tuning Exercise

This script creates development and production versions of the HTML application.
Development version maintains readable code, while production version applies
minification and obfuscation for deployment.
"""

import os
import sys
import shutil
import re
import json
from datetime import datetime


class HTMLBuilder:
    """Build system for the Voltage Tuning Exercise HTML application"""
    
    def __init__(self):
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.project_root = os.path.dirname(self.script_dir)
        self.dev_dir = self.script_dir
        self.dist_dir = os.path.join(self.project_root, 'dist')
        
        # Ensure dist directory exists
        os.makedirs(self.dist_dir, exist_ok=True)
        
        print(f"Script directory: {self.script_dir}")
        print(f"Project root: {self.project_root}")
        print(f"Distribution directory: {self.dist_dir}")
    
    def create_development_build(self):
        """Create development version with readable code"""
        print("\n=== Creating Development Build ===")
        
        source_file = os.path.join(self.dev_dir, 'voltage-tuning-exercise-dev.html')
        target_file = os.path.join(self.dist_dir, 'voltage-tuning-exercise-dev.html')
        
        if not os.path.exists(source_file):
            print(f"ERROR: Source file not found: {source_file}")
            return False
        
        try:
            # Copy the development version directly
            shutil.copy2(source_file, target_file)
            
            # Update metadata
            self.update_build_metadata(target_file, 'development')
            
            file_size = os.path.getsize(target_file) / (1024 * 1024)  # MB
            print(f"✓ Development build created: {target_file}")
            print(f"  File size: {file_size:.2f} MB")
            
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to create development build: {e}")
            return False
    
    def create_production_build(self):
        """Create production version with minification"""
        print("\n=== Creating Production Build ===")
        
        source_file = os.path.join(self.dev_dir, 'voltage-tuning-exercise-dev.html')
        target_file = os.path.join(self.dist_dir, 'voltage-tuning-exercise.html')
        
        if not os.path.exists(source_file):
            print(f"ERROR: Source file not found: {source_file}")
            return False
        
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Apply production optimizations
            print("  Applying production optimizations...")
            
            # 1. Update title for production
            content = content.replace(
                'Voltage Tuning Exercise - Development Version',
                'Voltage Tuning Exercise'
            )
            
            # 2. Remove development comments
            content = self.remove_development_comments(content)
            
            # 3. Basic minification (remove extra whitespace in HTML)
            content = self.basic_html_minification(content)
            
            # 4. Update security configuration for production
            content = self.update_security_config(content)
            
            # Write production version
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Update metadata
            self.update_build_metadata(target_file, 'production')
            
            file_size = os.path.getsize(target_file) / (1024 * 1024)  # MB
            print(f"✓ Production build created: {target_file}")
            print(f"  File size: {file_size:.2f} MB")
            
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to create production build: {e}")
            return False
    
    def remove_development_comments(self, content):
        """Remove development-specific comments"""
        # Remove single-line comments starting with // (but preserve URLs)
        content = re.sub(r'(?<!:)//[^\n]*(?=\n)', '', content)
        
        # Remove multi-line comments /* ... */
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Remove Python docstrings (triple quotes)
        content = re.sub(r'""".*?"""', '', content, flags=re.DOTALL)
        content = re.sub(r"'''.*?'''", '', content, flags=re.DOTALL)
        
        return content
    
    def basic_html_minification(self, content):
        """Apply basic HTML minification"""
        # Remove extra whitespace between HTML tags
        content = re.sub(r'>\s+<', '><', content)
        
        # Remove leading/trailing whitespace from lines
        lines = [line.strip() for line in content.split('\n')]
        
        # Remove empty lines
        lines = [line for line in lines if line]
        
        return '\n'.join(lines)
    
    def update_security_config(self, content):
        """Update security configuration for production"""
        # Update security settings for production deployment
        security_config = '''this.config = {
            startDate: "2024-02-01",
            expirationDays: 90,
            bypassEnabled: false,
            adminKey: "voltage_prod_2024"
        };'''
        
        # Replace development security config
        content = re.sub(
            r'this\.config = \{[^}]+\};',
            security_config,
            content,
            flags=re.DOTALL
        )
        
        return content
    
    def update_build_metadata(self, file_path, build_type):
        """Update build metadata in the HTML file"""
        build_time = datetime.now().isoformat()
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add build metadata as a comment
            metadata = f'''<!-- Build Information
Build Type: {build_type}
Build Time: {build_time}
Generator: Voltage Tuning Exercise Build System v1.0
-->
'''
            
            # Insert after DOCTYPE declaration
            content = content.replace(
                '<!DOCTYPE html>',
                f'<!DOCTYPE html>\n{metadata}'
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
                
        except Exception as e:
            print(f"WARNING: Could not update build metadata: {e}")
    
    def create_documentation_files(self):
        """Create documentation files for distribution"""
        print("\n=== Creating Documentation Files ===")
        
        try:
            # Create README for distribution
            readme_content = """# Voltage Tuning Exercise

## Quick Start

1. **Download**: Download the HTML file to your computer
2. **Open**: Double-click the HTML file to open in your web browser
3. **Use**: Interact with the voltage reference slider to see real-time simulation

## System Requirements

- **Browser**: Microsoft Edge (recommended), Chrome, Firefox, or Safari
- **JavaScript**: Must be enabled
- **Internet Connection**: Required for initial load only (downloads Pyodide and Chart.js)
- **Local Storage**: Used for settings and admin bypass functionality

## Features

- Real-time voltage control simulation
- Interactive voltage reference adjustment (90-110%)
- Live plotting of voltage and reactive power responses
- Configurable system parameters
- Professional power industry training interface

## Security

This application includes time-based access control. Contact your training coordinator if you encounter access restrictions.

## Support

For technical support or questions, please contact your training coordinator.

---
Generated by Voltage Tuning Exercise Build System
"""
            
            readme_path = os.path.join(self.dist_dir, 'README.md')
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            print(f"✓ Documentation created: {readme_path}")
            
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to create documentation: {e}")
            return False
    
    def validate_build(self, file_path):
        """Validate the built HTML file"""
        print(f"\n=== Validating Build: {os.path.basename(file_path)} ===")
        
        if not os.path.exists(file_path):
            print(f"ERROR: Build file not found: {file_path}")
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check for essential components
            checks = [
                ('<!DOCTYPE html>', 'HTML5 DOCTYPE'),
                ('loadPyodide()', 'Pyodide integration'),
                ('chart.js', 'Chart.js integration'),
                ('GenericNewtonRaphson', 'Newton-Raphson solver'),
                ('simulate_step', 'Simulation controller'),
                ('SecurityManager', 'Security system'),
                ('voltage-slider', 'Voltage control interface'),
                ('voltage-chart', 'Voltage chart'),
                ('reactive-chart', 'Reactive power chart'),
            ]
            
            all_passed = True
            for check_string, description in checks:
                if check_string in content:
                    print(f"  ✓ {description}")
                else:
                    print(f"  ✗ {description}")
                    all_passed = False
            
            # Check file size
            file_size = os.path.getsize(file_path) / (1024 * 1024)
            if file_size > 20:  # Warn if larger than 20MB
                print(f"  ⚠ Large file size: {file_size:.2f} MB")
            else:
                print(f"  ✓ File size: {file_size:.2f} MB")
            
            if all_passed:
                print("  ✓ All validation checks passed!")
            else:
                print("  ✗ Some validation checks failed!")
            
            return all_passed
            
        except Exception as e:
            print(f"ERROR: Validation failed: {e}")
            return False
    
    def build_all(self):
        """Build all versions and documentation"""
        print("🚀 Starting Voltage Tuning Exercise Build Process")
        print("=" * 60)
        
        success = True
        
        # Create development build
        if not self.create_development_build():
            success = False
        
        # Create production build
        if not self.create_production_build():
            success = False
        
        # Create documentation
        if not self.create_documentation_files():
            success = False
        
        # Validate builds
        dev_file = os.path.join(self.dist_dir, 'voltage-tuning-exercise-dev.html')
        prod_file = os.path.join(self.dist_dir, 'voltage-tuning-exercise.html')
        
        if os.path.exists(dev_file):
            if not self.validate_build(dev_file):
                success = False
        
        if os.path.exists(prod_file):
            if not self.validate_build(prod_file):
                success = False
        
        # Summary
        print("\n" + "=" * 60)
        if success:
            print("🎉 Build completed successfully!")
            print(f"\nOutput files in: {self.dist_dir}")
            print("  • voltage-tuning-exercise-dev.html (Development)")
            print("  • voltage-tuning-exercise.html (Production)")
            print("  • README.md (Documentation)")
        else:
            print("❌ Build completed with errors!")
        
        return success


def main():
    """Main build process"""
    if len(sys.argv) > 1:
        build_type = sys.argv[1].lower()
        if build_type not in ['dev', 'prod', 'all']:
            print("Usage: python build_dev.py [dev|prod|all]")
            print("  dev  - Create development build only")
            print("  prod - Create production build only") 
            print("  all  - Create all builds (default)")
            sys.exit(1)
    else:
        build_type = 'all'
    
    builder = HTMLBuilder()
    
    if build_type == 'dev':
        success = builder.create_development_build()
    elif build_type == 'prod':
        success = builder.create_production_build()
    else:
        success = builder.build_all()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()