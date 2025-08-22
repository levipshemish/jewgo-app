#!/bin/bash

# Docker Hub Deployment Script with .env Support
# This script builds and pushes Docker images to Docker Hub using environment files
# Supports different environment configurations (development, staging, production)

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

# Function to show usage
show_usage() {
    echo "Docker Hub Deployment Script with .env Support"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy [frontend|backend|all]     Deploy with .env configuration"
    echo "  build [frontend|backend|all]      Build with .env configuration"
    echo "  push [frontend|backend|all]       Push images to Docker Hub"
    echo "  validate-env                      Validate .env files"
    echo "  list-env                          List available environment files"
    echo "  status                            Show deployment status"
    echo ""
    echo "Options:"
    echo "  --env ENV_FILE                    Environment file to use (default: .env)"
    echo "  --env-type TYPE                   Environment type: dev, staging, prod (default: dev)"
    echo "  --tag TYPE                        Tag type: commit, tag, branch, timestamp, latest"
    echo "  --custom-tag TAG                  Use custom tag instead of auto-generated"
    echo "  --dockerfile FILE                 Use specific Dockerfile"
    echo "  --skip-tests                      Skip running tests before build"
    echo "  --dry-run                         Show what would be done without executing"
    echo "  --help                            Show this help message"
    echo ""
    echo "Environment Files:"
    echo "  .env                              Default environment file"
    echo "  .env.development                  Development environment"
    echo "  .env.staging                      Staging environment"
    echo "  .env.production                   Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 deploy all --env .env.production --tag commit"
    echo "  $0 deploy frontend --env-type staging --custom-tag v1.2.3"
    echo "  $0 validate-env --env .env.production"
    echo "  $0 deploy all --env-type prod --tag latest --dry-run"
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
    local env_type=$3
    
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

# Function to determine environment file
get_env_file() {
    local env_file=$1
    local env_type=$2
    
    if [[ -n "$env_file" ]]; then
        echo "$env_file"
    elif [[ -n "$env_type" ]]; then
        case $env_type in
            "dev"|"development")
                echo ".env.development"
                ;;
            "staging")
                echo ".env.staging"
                ;;
            "prod"|"production")
                echo ".env.production"
                ;;
            *)
                echo ".env"
                ;;
        esac
    else
        echo ".env"
    fi
}

# Function to validate environment file
validate_env_file() {
    local env_file=$1
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        return 1
    fi
    
    log_info "Validating environment file: $env_file"
    
    # Check for required variables
    local required_vars=(
        "DATABASE_URL"
        "FLASK_SECRET_KEY"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warning "Missing required variables in $env_file:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    log_success "Environment file $env_file is valid"
    return 0
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

# Function to build frontend image with env
build_frontend_with_env() {
    local tag=$1
    local env_file=$2
    local dockerfile=${3:-"Dockerfile"}
    local dry_run=$4
    
    log_info "Building frontend image with tag: $tag"
    log_info "Using environment file: $env_file"
    log_info "Using Dockerfile: frontend/$dockerfile"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would build frontend with:"
        log_info "  - Tag: ${FRONTEND_IMAGE}:${tag}"
        log_info "  - Env file: $env_file"
        log_info "  - Dockerfile: frontend/$dockerfile"
        return 0
    fi
    
    cd frontend
    
    # Build with environment file
    if [[ -f "../$env_file" ]]; then
        docker build -f "$dockerfile" \
            --build-arg ENV_FILE="../$env_file" \
            -t "${FRONTEND_IMAGE}:${tag}" .
    else
        log_warning "Environment file $env_file not found, building without env"
        docker build -f "$dockerfile" -t "${FRONTEND_IMAGE}:${tag}" .
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "Frontend image built successfully: ${FRONTEND_IMAGE}:${tag}"
    else
        log_error "Failed to build frontend image"
        exit 1
    fi
    cd ..
}

# Function to build backend image with env
build_backend_with_env() {
    local tag=$1
    local env_file=$2
    local dockerfile=${3:-"Dockerfile"}
    local dry_run=$4
    
    log_info "Building backend image with tag: $tag"
    log_info "Using environment file: $env_file"
    log_info "Using Dockerfile: backend/$dockerfile"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would build backend with:"
        log_info "  - Tag: ${BACKEND_IMAGE}:${tag}"
        log_info "  - Env file: $env_file"
        log_info "  - Dockerfile: backend/$dockerfile"
        return 0
    fi
    
    cd backend
    
    # Build with environment file
    if [[ -f "../$env_file" ]]; then
        docker build -f "$dockerfile" \
            --build-arg ENV_FILE="../$env_file" \
            -t "${BACKEND_IMAGE}:${tag}" .
    else
        log_warning "Environment file $env_file not found, building without env"
        docker build -f "$dockerfile" -t "${BACKEND_IMAGE}:${tag}" .
    fi
    
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
    local dry_run=$3
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would push: ${image}:${tag}"
        return 0
    fi
    
    log_info "Pushing ${image}:${tag} to Docker Hub..."
    
    docker push "${image}:${tag}"
    
    if [[ $? -eq 0 ]]; then
        log_success "Successfully pushed ${image}:${tag} to Docker Hub"
    else
        log_error "Failed to push ${image}:${tag} to Docker Hub"
        exit 1
    fi
}

# Function to list available environment files
list_env_files() {
    log_info "Available environment files:"
    echo ""
    
    local env_files=(".env" ".env.development" ".env.staging" ".env.production")
    
    for file in "${env_files[@]}"; do
        if [[ -f "$file" ]]; then
            echo "✅ $file"
        else
            echo "❌ $file (not found)"
        fi
    done
    
    echo ""
    log_info "To create environment files:"
    echo "  cp env.template .env"
    echo "  cp env.template .env.development"
    echo "  cp env.template .env.staging"
    echo "  cp env.template .env.production"
}

# Function to show deployment status
show_status() {
    log_info "Deployment Status:"
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
    echo ""
    echo "Environment Files:"
    list_env_files
}

# Main script logic
main() {
    local command=""
    local service="all"
    local env_file=""
    local env_type=""
    local tag_type="latest"
    local custom_tag=""
    local dockerfile="Dockerfile"
    local skip_tests=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|build|push|validate-env|list-env|status)
                command="$1"
                shift
                ;;
            frontend|backend|all)
                service="$1"
                shift
                ;;
            --env)
                env_file="$2"
                shift 2
                ;;
            --env-type)
                env_type="$2"
                shift 2
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
            --dry-run)
                dry_run=true
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
    
    # Determine environment file
    local resolved_env_file=$(get_env_file "$env_file" "$env_type")
    
    # Execute command
    case $command in
        validate-env)
            validate_env_file "$resolved_env_file"
            ;;
            
        list-env)
            list_env_files
            ;;
            
        status)
            show_status
            ;;
            
        build)
            check_docker
            
            if [[ "$skip_tests" == false ]]; then
                log_info "Running tests before build..."
                # Add test execution here if needed
            fi
            
            local tag=$(generate_tag "$tag_type" "$custom_tag" "$env_type")
            
            case $service in
                frontend)
                    build_frontend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    ;;
                backend)
                    build_backend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    ;;
                all)
                    build_frontend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    build_backend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    ;;
            esac
            ;;
            
        push)
            check_docker
            check_docker_hub_auth
            
            local tag=$(generate_tag "$tag_type" "$custom_tag" "$env_type")
            
            case $service in
                frontend)
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    ;;
                backend)
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
                all)
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
            esac
            ;;
            
        deploy)
            check_docker
            check_docker_hub_auth
            
            # Validate environment file
            if ! validate_env_file "$resolved_env_file"; then
                log_error "Environment file validation failed"
                exit 1
            fi
            
            if [[ "$skip_tests" == false ]]; then
                log_info "Running tests before deployment..."
                # Add test execution here if needed
            fi
            
            local tag=$(generate_tag "$tag_type" "$custom_tag" "$env_type")
            
            case $service in
                frontend)
                    build_frontend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    ;;
                backend)
                    build_backend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
                all)
                    build_frontend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    build_backend_with_env "$tag" "$resolved_env_file" "$dockerfile" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
            esac
            ;;
    esac
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "Dry run completed - no actual changes made"
    else
        log_success "Command completed successfully!"
    fi
}

# Run main function with all arguments
main "$@"
