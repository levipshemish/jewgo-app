#!/bin/bash

# Docker Hub Workflow Script for JewGo App
# This script handles building, tagging, and pushing Docker images to Docker Hub
# Functions like GitHub workflow with proper versioning and CI/CD integration

set -e  # Exit on any error

# Configuration
DOCKER_HUB_USERNAME="mml555"
REPO_NAME="jewgo"
FRONTEND_IMAGE="${DOCKER_HUB_USERNAME}/${REPO_NAME}-frontend"
BACKEND_IMAGE="${DOCKER_HUB_USERNAME}/${REPO_NAME}-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Function to get version from git
get_version() {
    local version_type=$1
    
    case $version_type in
        "commit")
            git rev-parse --short HEAD
            ;;
        "tag")
            git describe --tags --abbrev=0 2>/dev/null || echo "v1.0.0"
            ;;
        "branch")
            git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9]/-/g'
            ;;
        "timestamp")
            date +"%Y%m%d-%H%M%S"
            ;;
        *)
            echo "latest"
            ;;
    esac
}

# Function to generate tag
generate_tag() {
    local tag_type=$1
    local custom_tag=$2
    
    if [[ -n "$custom_tag" ]]; then
        echo "$custom_tag"
    else
        case $tag_type in
            "commit")
                echo "commit-$(get_version commit)"
                ;;
            "tag")
                echo "$(get_version tag)"
                ;;
            "branch")
                echo "$(get_version branch)"
                ;;
            "timestamp")
                echo "build-$(get_version timestamp)"
                ;;
            "latest")
                echo "latest"
                ;;
            *)
                echo "latest"
                ;;
        esac
    fi
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log_success "Docker is running"
}

# Function to check if logged into Docker Hub
check_docker_hub_auth() {
    if ! docker info | grep -q "Username"; then
        log_warning "Not logged into Docker Hub. Please run: docker login"
        read -p "Do you want to login now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login
        else
            log_error "Docker Hub login required to push images"
            exit 1
        fi
    fi
    log_success "Docker Hub authentication verified"
}

# Function to build frontend image
build_frontend() {
    local tag=$1
    local dockerfile=${2:-"Dockerfile"}
    
    log_info "Building frontend image with tag: $tag"
    log_info "Using Dockerfile: frontend/$dockerfile"
    
    cd frontend
    docker build -f "$dockerfile" -t "${FRONTEND_IMAGE}:${tag}" .
    
    if [[ $? -eq 0 ]]; then
        log_success "Frontend image built successfully: ${FRONTEND_IMAGE}:${tag}"
    else
        log_error "Failed to build frontend image"
        exit 1
    fi
    cd ..
}

# Function to build backend image
build_backend() {
    local tag=$1
    local dockerfile=${2:-"Dockerfile"}
    
    log_info "Building backend image with tag: $tag"
    log_info "Using Dockerfile: backend/$dockerfile"
    
    cd backend
    docker build -f "$dockerfile" -t "${BACKEND_IMAGE}:${tag}" .
    
    if [[ $? -eq 0 ]]; then
        log_success "Backend image built successfully: ${BACKEND_IMAGE}:${tag}"
    else
        log_error "Failed to build backend image"
        exit 1
    fi
    cd ..
}

# Function to push image to Docker Hub
push_image() {
    local image=$1
    local tag=$2
    
    log_info "Pushing ${image}:${tag} to Docker Hub..."
    
    docker push "${image}:${tag}"
    
    if [[ $? -eq 0 ]]; then
        log_success "Successfully pushed ${image}:${tag} to Docker Hub"
    else
        log_error "Failed to push ${image}:${tag} to Docker Hub"
        exit 1
    fi
}

# Function to run tests before building
run_tests() {
    log_info "Running tests before build..."
    
    # Frontend tests
    if [[ -d "frontend" ]]; then
        log_info "Running frontend tests..."
        cd frontend
        if npm test -- --passWithNoTests 2>/dev/null; then
            log_success "Frontend tests passed"
        else
            log_warning "Frontend tests failed or not configured"
        fi
        cd ..
    fi
    
    # Backend tests
    if [[ -d "backend" ]]; then
        log_info "Running backend tests..."
        cd backend
        if python -m pytest tests/ -v 2>/dev/null; then
            log_success "Backend tests passed"
        else
            log_warning "Backend tests failed or not configured"
        fi
        cd ..
    fi
}

# Function to show usage
show_usage() {
    echo "Docker Hub Workflow Script for JewGo App"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build [frontend|backend|all]    Build Docker images"
    echo "  push [frontend|backend|all]     Push images to Docker Hub"
    echo "  build-and-push [frontend|backend|all]  Build and push in one command"
    echo "  list                            List local images"
    echo "  clean                           Clean up local images"
    echo "  status                          Show build status"
    echo ""
    echo "Options:"
    echo "  --tag TYPE                      Tag type: commit, tag, branch, timestamp, latest"
    echo "  --custom-tag TAG                Use custom tag instead of auto-generated"
    echo "  --dockerfile FILE               Use specific Dockerfile (default: Dockerfile)"
    echo "  --skip-tests                    Skip running tests before build"
    echo "  --help                          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build-and-push all --tag commit"
    echo "  $0 build frontend --custom-tag v1.2.3"
    echo "  $0 push backend --tag latest"
    echo "  $0 build-and-push all --tag timestamp --skip-tests"
}

# Function to list local images
list_images() {
    log_info "Local JewGo images:"
    echo ""
    echo "Frontend images:"
    docker images | grep "${FRONTEND_IMAGE}" || echo "No frontend images found"
    echo ""
    echo "Backend images:"
    docker images | grep "${BACKEND_IMAGE}" || echo "No backend images found"
}

# Function to clean up images
clean_images() {
    log_info "Cleaning up JewGo images..."
    
    # Remove frontend images
    docker images | grep "${FRONTEND_IMAGE}" | awk '{print $3}' | xargs -r docker rmi -f
    log_success "Frontend images cleaned up"
    
    # Remove backend images
    docker images | grep "${BACKEND_IMAGE}" | awk '{print $3}' | xargs -r docker rmi -f
    log_success "Backend images cleaned up"
}

# Function to show build status
show_status() {
    log_info "Build Status:"
    echo ""
    echo "Docker Hub Username: $DOCKER_HUB_USERNAME"
    echo "Repository Name: $REPO_NAME"
    echo "Frontend Image: $FRONTEND_IMAGE"
    echo "Backend Image: $BACKEND_IMAGE"
    echo ""
    echo "Git Status:"
    echo "  Branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo "  Latest Tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags found')"
    echo ""
    echo "Docker Status:"
    if docker info >/dev/null 2>&1; then
        echo "  Docker: Running"
        if docker info | grep -q "Username"; then
            echo "  Docker Hub: Authenticated"
        else
            echo "  Docker Hub: Not authenticated"
        fi
    else
        echo "  Docker: Not running"
    fi
}

# Main script logic
main() {
    local command=""
    local service="all"
    local tag_type="latest"
    local custom_tag=""
    local dockerfile="Dockerfile"
    local skip_tests=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            build|push|build-and-push|list|clean|status)
                command="$1"
                shift
                ;;
            frontend|backend|all)
                service="$1"
                shift
                ;;
            --tag)
                tag_type="$2"
                shift 2
                ;;
            --custom-tag)
                custom_tag="$2"
                shift 2
                ;;
            --dockerfile)
                dockerfile="$2"
                shift 2
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate command
    if [[ -z "$command" ]]; then
        log_error "No command specified"
        show_usage
        exit 1
    fi
    
    # Generate tag
    local tag=$(generate_tag "$tag_type" "$custom_tag")
    
    # Execute command
    case $command in
        build)
            check_docker
            if [[ "$skip_tests" == false ]]; then
                run_tests
            fi
            
            case $service in
                frontend)
                    build_frontend "$tag" "$dockerfile"
                    ;;
                backend)
                    build_backend "$tag" "$dockerfile"
                    ;;
                all)
                    build_frontend "$tag" "$dockerfile"
                    build_backend "$tag" "$dockerfile"
                    ;;
            esac
            ;;
            
        push)
            check_docker
            check_docker_hub_auth
            
            case $service in
                frontend)
                    push_image "$FRONTEND_IMAGE" "$tag"
                    ;;
                backend)
                    push_image "$BACKEND_IMAGE" "$tag"
                    ;;
                all)
                    push_image "$FRONTEND_IMAGE" "$tag"
                    push_image "$BACKEND_IMAGE" "$tag"
                    ;;
            esac
            ;;
            
        build-and-push)
            check_docker
            check_docker_hub_auth
            
            if [[ "$skip_tests" == false ]]; then
                run_tests
            fi
            
            case $service in
                frontend)
                    build_frontend "$tag" "$dockerfile"
                    push_image "$FRONTEND_IMAGE" "$tag"
                    ;;
                backend)
                    build_backend "$tag" "$dockerfile"
                    push_image "$BACKEND_IMAGE" "$tag"
                    ;;
                all)
                    build_frontend "$tag" "$dockerfile"
                    build_backend "$tag" "$dockerfile"
                    push_image "$FRONTEND_IMAGE" "$tag"
                    push_image "$BACKEND_IMAGE" "$tag"
                    ;;
            esac
            ;;
            
        list)
            list_images
            ;;
            
        clean)
            clean_images
            ;;
            
        status)
            show_status
            ;;
    esac
    
    log_success "Command completed successfully!"
}

# Run main function with all arguments
main "$@"
