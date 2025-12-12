#!/usr/bin/env python3
"""
Analyze and select representative CMake test files from official repository
"""

import os
import re
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple
import json

class CMakeTestSelector:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.test_dir = self.project_root / "test" / "datasets" / "cmake-official"
        self.tmp_dir = Path("/tmp/cmake-tests")

    def clone_cmake_repo(self):
        """Clone CMake repository with sparse checkout"""
        if not (self.tmp_dir / "CMake").exists():
            print("🔄 Cloning CMake repository (sparse checkout)...")
            subprocess.run([
                "git", "clone", "--depth", "1", "--filter=blob:none",
                "--sparse", "https://github.com/Kitware/CMake.git",
                str(self.tmp_dir / "CMake")
            ], check=True)

            subprocess.run([
                "git", "-C", str(self.tmp_dir / "CMake"),
                "sparse-checkout", "set", "Tests"
            ], check=True)
            print("✅ Repository cloned")
        else:
            print("✅ Repository already exists")

    def analyze_file(self, filepath: Path) -> Dict:
        """Analyze a CMake file for complexity and features"""
        try:
            content = filepath.read_text(encoding='utf-8', errors='ignore')
        except:
            return None

        lines = content.split('\n')

        # Calculate metrics
        metrics = {
            'path': str(filepath),
            'filename': filepath.name,
            'lines': len(lines),
            'non_empty_lines': len([l for l in lines if l.strip()]),
            'commands': len(re.findall(r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(', content, re.MULTILINE)),
            'comments': len(re.findall(r'#', content)),
            'functions': len(re.findall(r'function\s*\(', content, re.IGNORECASE)),
            'macros': len(re.findall(r'macro\s*\(', content, re.IGNORECASE)),
            'if_blocks': len(re.findall(r'if\s*\(', content, re.IGNORECASE)),
            'foreach_loops': len(re.findall(r'foreach\s*\(', content, re.IGNORECASE)),
            'while_loops': len(re.findall(r'while\s*\(', content, re.IGNORECASE)),
            'multiline_commands': len(re.findall(r'\(\s*$.*?^\s*\)', content, re.MULTILINE | re.DOTALL)),
        }

        # Calculate complexity score
        metrics['complexity'] = (
            metrics['commands'] +
            metrics['functions'] * 2 +
            metrics['macros'] * 2 +
            metrics['if_blocks'] +
            metrics['foreach_loops'] +
            metrics['while_loops']
        )

        return metrics

    def find_representative_files(self) -> List[Dict]:
        """Find representative test files based on different criteria"""
        cmake_root = self.tmp_dir / "CMake" / "Tests"

        if not cmake_root.exists():
            print("❌ CMake Tests directory not found. Run clone_cmake_repo() first.")
            return []

        print("🔍 Scanning test files...")

        # Collect all CMake files
        all_files = []
        for pattern in ["**/*.cmake", "**/CMakeLists.txt"]:
            all_files.extend(cmake_root.glob(pattern))

        print(f"📁 Found {len(all_files)} CMake files")

        # Analyze files
        print("📊 Analyzing files...")
        analyzed = []
        for f in all_files:
            metrics = self.analyze_file(f)
            if metrics and metrics['non_empty_lines'] > 5:  # Skip very small files
                analyzed.append(metrics)

        print(f"✅ Analyzed {len(analyzed)} files")

        # Sort by complexity
        analyzed.sort(key=lambda x: x['complexity'], reverse=True)

        return analyzed

    def select_diverse_set(self, analyzed: List[Dict], count: int = 20) -> List[Dict]:
        """Select a diverse set of test files"""
        selected = []

        # Categories with target counts
        categories = {
            'simple': {'max_lines': 50, 'max_complexity': 20, 'count': 5},
            'medium': {'min_lines': 50, 'max_lines': 200, 'min_complexity': 20, 'max_complexity': 100, 'count': 8},
            'complex': {'min_lines': 200, 'min_complexity': 100, 'count': 7},
        }

        for cat_name, criteria in categories.items():
            print(f"\n📦 Selecting {cat_name} files...")

            # Filter by criteria
            candidates = [
                f for f in analyzed
                if (criteria.get('min_lines', 0) <= f['lines'] <= criteria.get('max_lines', 999999))
                and (criteria.get('min_complexity', 0) <= f['complexity'] <= criteria.get('max_complexity', 999999))
                and f not in selected
            ]

            # Select diverse files
            target_count = criteria['count']
            step = max(1, len(candidates) // target_count)

            for i in range(0, min(len(candidates), target_count * step), step):
                if len(selected) < count:
                    selected.append(candidates[i])
                    print(f"  ✓ {Path(candidates[i]['path']).name[:50]:<50} "
                          f"(lines: {candidates[i]['lines']}, complexity: {candidates[i]['complexity']})")

        return selected[:count]

    def copy_selected_files(self, selected: List[Dict]):
        """Copy selected files to test directory"""
        self.test_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n📋 Copying {len(selected)} files to {self.test_dir}")

        for item in selected:
            src = Path(item['path'])

            # Create a meaningful name
            rel_path = src.relative_to(self.tmp_dir / "CMake" / "Tests")
            # Flatten directory structure into filename
            dest_name = str(rel_path).replace('/', '_').replace('\\', '_')
            dest = self.test_dir / dest_name

            dest.write_bytes(src.read_bytes())
            print(f"  ✅ {dest_name}")

        # Create README
        readme = self.test_dir / "README.md"
        readme.write_text(f"""# CMake Official Test Files

This directory contains {len(selected)} representative test files from the CMake official repository.

## Source
- Repository: https://github.com/Kitware/CMake
- Directory: Tests/
- Selected on: {subprocess.check_output(['date'], text=True).strip()}

## Selection Criteria
- Diverse complexity levels (simple, medium, complex)
- Real-world usage patterns
- Various CMake features and commands

## Files
""" + "\n".join([f"- `{Path(f['path']).name}` ({f['lines']} lines, complexity: {f['complexity']})"
                 for f in selected]))

        print(f"\n✨ Done! Files saved to: {self.test_dir}")
        print(f"📄 README created: {readme}")

def main():
    import sys

    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    selector = CMakeTestSelector(str(project_root))

    print("=" * 60)
    print("CMake Official Test Files Selector")
    print("=" * 60)

    # Step 1: Clone repository
    selector.clone_cmake_repo()

    # Step 2: Analyze files
    analyzed = selector.find_representative_files()

    if not analyzed:
        print("❌ No files found to analyze")
        sys.exit(1)

    # Step 3: Select diverse set
    selected = selector.select_diverse_set(analyzed, count=20)

    # Step 4: Copy files
    selector.copy_selected_files(selected)

    print("\n" + "=" * 60)
    print("✅ Process completed successfully!")
    print("=" * 60)
    print("\n💡 Next steps:")
    print("1. Review files in test/datasets/cmake-official/")
    print("2. Add selected files to well-formatted test suite if needed")
    print("3. Run: npm run test:unit")

if __name__ == "__main__":
    main()
