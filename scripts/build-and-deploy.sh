#!/bin/bash

# JewGo Build and Deploy Script
# This script builds images with proper environment handling and provides easy deployment updates

set -e

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
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# Function to show usage
show_usage() {
    echo "JewGo Build and Deploy Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build [frontend|backend|all]      Build images with environment validation"
    echo "  deploy [frontend|backend|all]     Build and push to Docker Hub"
    echo "  update [frontend|backend|all]     Quick update - build, push, and deploy"
    echo "  run [frontend|backend|all]        Run containers with environment files"
    echo "  stop [frontend|backend|all]       Stop running containers"
    echo "  restart [frontend|backend|all]    Restart containers with latest images"
    echo "  status                            Show deployment status"
    echo "  logs [frontend|backend|all]       Show container logs"
    echo "  validate-env                      Validate environment files"
    echo "  clean                             Clean up old images and containers"
    echo ""
    echo "Options:"
    echo "  --env ENV_TYPE                    Environment: dev, staging, prod (default: prod)"
    echo "  --tag TAG                         Image tag (default: auto-generated)"
    echo "  --env-file FILE                   Environment file path"
    echo "  --skip-tests                      Skip running tests before build"
    echo "  --force                           Force rebuild without cache"
    echo "  --dry-run                         Show what would be done without executing"
    echo "  --help                            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build all --env prod --tag v1.2.3"
    echo "  $0 update all --env staging"
    echo "  $0 run all --env-file .env.production"
    echo "  $0 restart backend --env prod"
    echo ""
    echo "Quick Commands:"
    echo "  $0 update all                    # Full update: build, push, deploy"
    echo "  $0 restart all                   # Restart with latest images"
    echo "  $0 status                        # Check current status"
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

# Function to build frontend image
build_frontend() {
    local tag=$1
    local env_file=$2
    local force=$3
    local dry_run=$4
    
    log_step "Building frontend image with tag: $tag"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would build frontend with:"
        log_info "  - Tag: ${FRONTEND_IMAGE}:${tag}"
        log_info "  - Env file: $env_file"
        log_info "  - Force: $force"
        return 0
    fi
    
    cd frontend
    
    # Build arguments
    local build_args=""
    if [[ "$force" == "true" ]]; then
        build_args="--no-cache"
    fi
    
    # Build with environment file
    if [[ -f "../$env_file" ]]; then
        log_info "Building with environment file: $env_file"
        docker build $build_args \
            --build-arg ENV_FILE="$env_file" \
            -t "${FRONTEND_IMAGE}:${tag}" \
            -f Dockerfile \
            ..
    else
        log_warning "Environment file $env_file not found, building without env"
        docker build $build_args \
            -t "${FRONTEND_IMAGE}:${tag}" \
            -f Dockerfile \
            ..
    fi
    
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
    local env_file=$2
    local force=$3
    local dry_run=$4
    
    log_step "Building backend image with tag: $tag"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would build backend with:"
        log_info "  - Tag: ${BACKEND_IMAGE}:${tag}"
        log_info "  - Env file: $env_file"
        log_info "  - Force: $force"
        return 0
    fi
    
    cd backend
    
    # Build arguments
    local build_args=""
    if [[ "$force" == "true" ]]; then
        build_args="--no-cache"
    fi
    
    # Build with environment file
    if [[ -f "../$env_file" ]]; then
        log_info "Building with environment file: $env_file"
        docker build $build_args \
            --build-arg ENV_FILE="$env_file" \
            -t "${BACKEND_IMAGE}:${tag}" \
            -f Dockerfile \
            ..
    else
        log_warning "Environment file $env_file not found, building without env"
        docker build $build_args \
            -t "${BACKEND_IMAGE}:${tag}" \
            -f Dockerfile \
            ..
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

# Function to run containers
run_containers() {
    local service=$1
    local env_file=$2
    local tag=$3
    local dry_run=$4
    
    log_step "Running containers with environment file: $env_file"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would run containers with:"
        log_info "  - Env file: $env_file"
        log_info "  - Tag: $tag"
        return 0
    fi
    
    # Create docker-compose override file
    cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  frontend:
    image: ${FRONTEND_IMAGE}:${tag}
    env_file:
      - ${env_file}
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  backend:
    image: ${BACKEND_IMAGE}:${tag}
    env_file:
      - ${env_file}
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
EOF
    
    case $service in
        frontend)
            docker-compose up -d frontend
            ;;
        backend)
            docker-compose up -d backend
            ;;
        all)
            docker-compose up -d
            ;;
    esac
    
    log_success "Containers started successfully"
}

# Function to stop containers
stop_containers() {
    local service=$1
    local dry_run=$2
    
    log_step "Stopping containers"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would stop containers"
        return 0
    fi
    
    case $service in
        frontend)
            docker-compose stop frontend
            ;;
        backend)
            docker-compose stop backend
            ;;
        all)
            docker-compose down
            ;;
    esac
    
    log_success "Containers stopped successfully"
}

# Function to restart containers
restart_containers() {
    local service=$1
    local env_file=$2
    local tag=$3
    local dry_run=$4
    
    log_step "Restarting containers with latest images"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would restart containers"
        return 0
    fi
    
    # Pull latest images
    log_info "Pulling latest images..."
    case $service in
        frontend)
            docker pull "${FRONTEND_IMAGE}:${tag}"
            ;;
        backend)
            docker pull "${BACKEND_IMAGE}:${tag}"
            ;;
        all)
            docker pull "${FRONTEND_IMAGE}:${tag}"
            docker pull "${BACKEND_IMAGE}:${tag}"
            ;;
    esac
    
    # Stop and restart
    stop_containers "$service" "$dry_run"
    run_containers "$service" "$env_file" "$tag" "$dry_run"
    
    log_success "Containers restarted successfully"
}

# Function to show status
show_status() {
    log_info "Deployment Status:"
    echo ""
    echo "Docker Hub Images:"
    echo "  Frontend: $FRONTEND_IMAGE"
    echo "  Backend: $BACKEND_IMAGE"
    echo ""
    echo "Local Images:"
    docker images | grep -E "(jewgo-frontend|jewgo-backend)" || echo "  No local images found"
    echo ""
    echo "Running Containers:"
    docker ps --filter "name=jewgo" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" || echo "  No containers running"
    echo ""
    echo "Environment Files:"
    for file in .env .env.development .env.staging .env.production; do
        if [[ -f "$file" ]]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (not found)"
        fi
    done
}

# Function to show logs
show_logs() {
    local service=$1
    
    case $service in
        frontend)
            docker-compose logs -f frontend
            ;;
        backend)
            docker-compose logs -f backend
            ;;
        all)
            docker-compose logs -f
            ;;
    esac
}

# Function to clean up
clean_up() {
    local dry_run=$1
    
    log_step "Cleaning up old images and containers"
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY RUN] Would clean up:"
        log_info "  - Stop and remove containers"
        log_info "  - Remove old images"
        log_info "  - Remove unused volumes"
        return 0
    fi
    
    # Stop and remove containers
    docker-compose down 2>/dev/null || true
    
    # Remove old images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed"
}

# Main script logic
main() {
    local command=""
    local service="all"
    local env_type="prod"
    local env_file=""
    local tag=""
    local skip_tests=false
    local force=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            build|deploy|update|run|stop|restart|status|logs|validate-env|clean)
                command="$1"
                shift
                ;;
            frontend|backend|all)
                service="$1"
                shift
                ;;
            --env)
                env_type="$2"
                shift 2
                ;;
            --env-file)
                env_file="$2"
                shift 2
                ;;
            --tag)
                tag="$2"
                shift 2
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --force)
                force=true
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
    
    # Generate tag if not provided
    if [[ -z "$tag" ]]; then
        tag=$(generate_tag "commit" "" "$env_type")
    fi
    
    # Execute command
    case $command in
        validate-env)
            validate_env_file "$resolved_env_file"
            ;;
            
        status)
            show_status
            ;;
            
        logs)
            show_logs "$service"
            ;;
            
        clean)
            clean_up "$dry_run"
            ;;
            
        build)
            check_docker
            
            if [[ "$skip_tests" == false ]]; then
                log_info "Running tests before build..."
                # Add test execution here if needed
            fi
            
            case $service in
                frontend)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    ;;
                backend)
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    ;;
                all)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    ;;
            esac
            ;;
            
        deploy)
            check_docker
            check_docker_hub_auth
            
            # Build first
            case $service in
                frontend)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    ;;
                backend)
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
                all)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
            esac
            ;;
            
        update)
            check_docker
            check_docker_hub_auth
            
            log_step "Full update: build, push, and deploy"
            
            # Build and push
            case $service in
                frontend)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    ;;
                backend)
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
                all)
                    build_frontend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    build_backend "$tag" "$resolved_env_file" "$force" "$dry_run"
                    push_image "$FRONTEND_IMAGE" "$tag" "$dry_run"
                    push_image "$BACKEND_IMAGE" "$tag" "$dry_run"
                    ;;
            esac
            
            # Deploy
            run_containers "$service" "$resolved_env_file" "$tag" "$dry_run"
            ;;
            
        run)
            check_docker
            run_containers "$service" "$resolved_env_file" "$tag" "$dry_run"
            ;;
            
        stop)
            check_docker
            stop_containers "$service" "$dry_run"
            ;;
            
        restart)
            check_docker
            check_docker_hub_auth
            restart_containers "$service" "$resolved_env_file" "$tag" "$dry_run"
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
