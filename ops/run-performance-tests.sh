#!/bin/bash

# JWT Authentication System - Performance Test Runner
# This script runs comprehensive performance tests and generates reports

set -e  # Exit on any error

echo "=================================="
echo "JWT Authentication Performance Tests"
echo "=================================="

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:5000"}
TEST_RESULTS_DIR="test_results_$(date +%Y%m%d_%H%M%S)"
K6_BINARY=${K6_BINARY:-"k6"}
PYTHON_BINARY=${PYTHON_BINARY:-"python"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if backend is running
    if ! curl -s "${BACKEND_URL}/api/auth/health" > /dev/null 2>&1; then
        log_error "Backend service not accessible at ${BACKEND_URL}"
        log_info "Please start the backend service first"
        exit 1
    fi
    
    # Check K6
    if ! command -v "${K6_BINARY}" > /dev/null 2>&1; then
        log_error "K6 not found. Please install K6: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check Python
    if ! command -v "${PYTHON_BINARY}" > /dev/null 2>&1; then
        log_error "Python not found"
        exit 1
    fi
    
    # Check Python dependencies
    if ! ${PYTHON_BINARY} -c "import requests, psutil, concurrent.futures, pytest" 2>/dev/null; then
        log_warning "Some Python dependencies missing. Installing..."
        pip install requests psutil pytest
    fi
    
    log_success "Prerequisites check passed"
}

# Create results directory
setup_results_dir() {
    mkdir -p "${TEST_RESULTS_DIR}"
    log_info "Results will be saved to: ${TEST_RESULTS_DIR}"
}

# Run K6 HTTP load tests
run_k6_tests() {
    log_info "Running K6 HTTP load tests..."
    
    local k6_results="${TEST_RESULTS_DIR}/k6_results.json"
    local k6_summary="${TEST_RESULTS_DIR}/k6_summary.txt"
    
    # Basic load test
    log_info "  → Running basic load test..."
    BASE_URL="${BACKEND_URL}" "${K6_BINARY}" run \
        --summary-export="${k6_results}" \
        --out json="${TEST_RESULTS_DIR}/k6_metrics.json" \
        ops/k6/auth_load_test.js 2>&1 | tee "${k6_summary}"
    
    local k6_exit_code=$?
    
    if [ $k6_exit_code -eq 0 ]; then
        log_success "K6 load tests completed successfully"
    else
        log_error "K6 load tests failed (exit code: ${k6_exit_code})"
        return $k6_exit_code
    fi
    
    # Quick spike test
    log_info "  → Running spike test..."
    BASE_URL="${BACKEND_URL}" "${K6_BINARY}" run \
        --stage 0s:0 --stage 10s:50 --stage 30s:50 --stage 10s:0 \
        --summary-export="${TEST_RESULTS_DIR}/k6_spike_results.json" \
        ops/k6/auth_load_test.js > "${TEST_RESULTS_DIR}/k6_spike_summary.txt" 2>&1
    
    log_success "Spike test completed"
}

# Run Python concurrent tests
run_python_tests() {
    log_info "Running Python concurrent tests..."
    
    local python_results="${TEST_RESULTS_DIR}/python_test_results.txt"
    
    cd backend/tests/performance
    
    # Run comprehensive concurrent tests
    ${PYTHON_BINARY} test_concurrent_auth.py > "../../../${python_results}" 2>&1
    local python_exit_code=$?
    
    if [ $python_exit_code -eq 0 ]; then
        log_success "Python concurrent tests completed successfully"
    else
        log_error "Python concurrent tests failed (exit code: ${python_exit_code})"
        cat "../../../${python_results}"
        return $python_exit_code
    fi
    
    cd ../../..
}

# Run password reset tests
run_password_reset_tests() {
    log_info "Running password reset performance tests..."
    
    local pytest_results="${TEST_RESULTS_DIR}/password_reset_results.txt"
    
    cd backend
    
    # Run password reset tests
    ${PYTHON_BINARY} -m pytest tests/test_password_reset.py -v > "../${pytest_results}" 2>&1
    local pytest_exit_code=$?
    
    if [ $pytest_exit_code -eq 0 ]; then
        log_success "Password reset tests completed successfully"
    else
        log_warning "Password reset tests had issues (exit code: ${pytest_exit_code})"
    fi
    
    cd ..
}

# Collect system metrics during tests
collect_system_metrics() {
    log_info "Collecting system metrics..."
    
    local metrics_file="${TEST_RESULTS_DIR}/system_metrics.txt"
    
    {
        echo "=== System Metrics at $(date) ==="
        echo
        echo "CPU Info:"
        if command -v lscpu > /dev/null 2>&1; then
            lscpu | grep -E "(CPU|Thread|Core)"
        elif command -v sysctl > /dev/null 2>&1; then
            sysctl -n hw.ncpu hw.physicalcpu 2>/dev/null || echo "CPU info not available"
        fi
        
        echo
        echo "Memory Info:"
        if command -v free > /dev/null 2>&1; then
            free -h
        elif command -v vm_stat > /dev/null 2>&1; then
            vm_stat
        fi
        
        echo
        echo "Backend Service Health:"
        curl -s "${BACKEND_URL}/api/auth/health" || echo "Health check failed"
        
        echo
        echo "Backend Metrics Sample:"
        curl -s "${BACKEND_URL}/metrics" | head -20 || echo "Metrics not available"
        
    } > "${metrics_file}"
    
    log_success "System metrics collected"
}

# Generate test report
generate_report() {
    log_info "Generating test report..."
    
    local report_file="${TEST_RESULTS_DIR}/performance_test_report.md"
    
    cat > "${report_file}" << EOF
# JWT Authentication System - Performance Test Report

**Test Date:** $(date)  
**Backend URL:** ${BACKEND_URL}  
**Test Duration:** Started at $(date -r "${TEST_RESULTS_DIR}" 2>/dev/null || echo "Unknown")

## Test Summary

### K6 HTTP Load Tests
EOF
    
    if [ -f "${TEST_RESULTS_DIR}/k6_summary.txt" ]; then
        echo "✅ **Status:** Completed" >> "${report_file}"
        echo "" >> "${report_file}"
        echo "**Results:**" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
        tail -20 "${TEST_RESULTS_DIR}/k6_summary.txt" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
    else
        echo "❌ **Status:** Failed or not run" >> "${report_file}"
    fi
    
    cat >> "${report_file}" << EOF

### Python Concurrent Tests
EOF
    
    if [ -f "${TEST_RESULTS_DIR}/python_test_results.txt" ]; then
        echo "✅ **Status:** Completed" >> "${report_file}"
        echo "" >> "${report_file}"
        echo "**Results:**" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
        cat "${TEST_RESULTS_DIR}/python_test_results.txt" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
    else
        echo "❌ **Status:** Failed or not run" >> "${report_file}"
    fi
    
    cat >> "${report_file}" << EOF

### System Metrics
EOF
    
    if [ -f "${TEST_RESULTS_DIR}/system_metrics.txt" ]; then
        echo "\`\`\`" >> "${report_file}"
        cat "${TEST_RESULTS_DIR}/system_metrics.txt" >> "${report_file}"
        echo "\`\`\`" >> "${report_file}"
    fi
    
    cat >> "${report_file}" << EOF

## Files Generated
- K6 detailed results: \`k6_results.json\`
- K6 metrics data: \`k6_metrics.json\`
- Python test output: \`python_test_results.txt\`
- System metrics: \`system_metrics.txt\`
- This report: \`performance_test_report.md\`

## Recommendations

Review the detailed test results and metrics to identify any performance issues.
Compare results with established baselines and performance targets.

EOF
    
    log_success "Test report generated: ${report_file}"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    echo
    log_info "Starting JWT Authentication Performance Tests"
    log_info "Backend URL: ${BACKEND_URL}"
    echo
    
    # Run all test phases
    check_prerequisites
    setup_results_dir
    collect_system_metrics
    
    # Run tests
    local overall_success=true
    
    if ! run_k6_tests; then
        overall_success=false
    fi
    
    if ! run_python_tests; then
        overall_success=false
    fi
    
    run_password_reset_tests  # Don't fail overall on this
    
    # Generate report
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo
    echo "=================================="
    log_info "Test execution completed in ${duration} seconds"
    log_info "Results available in: ${TEST_RESULTS_DIR}"
    echo "=================================="
    
    if $overall_success; then
        log_success "All critical performance tests passed!"
        exit 0
    else
        log_error "Some performance tests failed. Check results for details."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "help"|"--help"|"-h")
        echo "JWT Authentication Performance Test Runner"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  help, --help, -h    Show this help message"
        echo "  k6-only            Run only K6 HTTP tests"
        echo "  python-only        Run only Python concurrent tests"
        echo "  quick              Run quick test suite (reduced load)"
        echo
        echo "Environment Variables:"
        echo "  BACKEND_URL        Backend service URL (default: http://localhost:5000)"
        echo "  K6_BINARY          K6 binary path (default: k6)"
        echo "  PYTHON_BINARY      Python binary path (default: python)"
        echo
        exit 0
        ;;
    "k6-only")
        log_info "Running K6 tests only"
        check_prerequisites
        setup_results_dir
        run_k6_tests
        generate_report
        ;;
    "python-only")
        log_info "Running Python tests only"
        check_prerequisites
        setup_results_dir
        run_python_tests
        generate_report
        ;;
    "quick")
        log_info "Running quick test suite"
        export K6_VUS=10
        export K6_DURATION=2m
        main
        ;;
    *)
        main
        ;;
esac