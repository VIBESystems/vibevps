#!/bin/bash

#╔══════════════════════════════════════════════════════════════════════════════╗
#║                       VIBEVps - AUTOMATIC INSTALLATION                       ║
#║                                                                               ║
#║  Requirements: Ubuntu 24.04 LTS (clean installation)                         ║
#║                                                                               ║
#║  This script will install:                                                    ║
#║  - Node.js 20                                                                 ║
#║  - PM2                                                                        ║
#║  - Nginx                                                                      ║
#║  - VIBEVps                                                                    ║
#╚══════════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Installation directory
INSTALL_DIR="/var/www/vibevps"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Output functions
print_header() {
    echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "${CYAN}📦 $1${NC}"
}

print_success() {
    echo -e "${GREEN}   ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}   ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}   ❌ $1${NC}"
}

# Check that the script is run as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check operating system
check_os() {
    print_step "Checking operating system..."

    if [[ ! -f /etc/os-release ]]; then
        print_error "Unsupported operating system"
        exit 1
    fi

    . /etc/os-release

    if [[ "$ID" != "ubuntu" ]]; then
        print_error "Unsupported operating system. Required: Ubuntu"
        exit 1
    fi

    if [[ "$VERSION_ID" != "24.04" ]]; then
        print_warning "Ubuntu version: $VERSION_ID (recommended: 24.04 LTS)"
        read -p "Do you want to continue anyway? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Ubuntu $VERSION_ID LTS"
    fi
}

# Collect information from user
collect_info() {
    print_header "CONFIGURATION"

    # Nginx Port
    read -p "Nginx port [default: 80]: " NGINX_PORT
    NGINX_PORT=${NGINX_PORT:-80}
    print_success "Nginx port: $NGINX_PORT"

    # Detect server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    print_success "Server IP detected: $SERVER_IP"

    # Generate secrets
    JWT_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    print_success "JWT secret generated"
    print_success "Encryption key generated"

    echo
    read -p "Proceed with installation? [Y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
}

# System update
update_system() {
    print_header "SYSTEM UPDATE"

    print_step "Updating packages..."
    apt update -qq
    apt upgrade -y -qq
    print_success "System updated"

    print_step "Installing base dependencies..."
    apt install -y -qq curl wget unzip git software-properties-common
    print_success "Base dependencies installed"
}

# Node.js installation
install_nodejs() {
    print_header "NODE.JS INSTALLATION"

    # Check if Node.js 20 is already installed
    if command -v node &> /dev/null && [[ "$(node -v)" == v20.* ]]; then
        print_success "Node.js $(node -v) already installed"
    else
        print_step "Installing Node.js 20 via NodeSource..."
        apt install -y -qq ca-certificates curl gnupg
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
        apt update -qq
        apt install -y -qq nodejs
        print_success "Node.js $(node -v) installed"
    fi

    print_step "Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed"

    print_step "Configuring PM2 for automatic startup..."
    pm2 startup systemd -u root --hp /root
    print_success "PM2 configured for automatic startup"
}

# Nginx installation
install_nginx() {
    print_header "NGINX INSTALLATION"

    print_step "Installing Nginx..."
    apt install -y -qq nginx
    print_success "Nginx installed"

    print_step "Configuring virtual host..."
    cp "$SCRIPT_DIR/config/nginx-vibevps.conf" /etc/nginx/sites-available/vibevps
    sed -i "s|{{NGINX_PORT}}|$NGINX_PORT|g" /etc/nginx/sites-available/vibevps
    sed -i "s|{{SERVER_IP}}|$SERVER_IP|g" /etc/nginx/sites-available/vibevps
    print_success "Virtual host configured"

    print_step "Enabling site..."
    ln -sf /etc/nginx/sites-available/vibevps /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    print_success "Site enabled"

    print_step "Testing Nginx configuration..."
    nginx -t > /dev/null 2>&1
    print_success "Configuration valid"

    print_step "Starting Nginx..."
    systemctl restart nginx
    systemctl enable nginx
    print_success "Nginx started and enabled at boot"
}

# VIBEVps installation
install_vibevps() {
    print_header "INSTALLING VIBEVps"

    print_step "Creating directory..."
    mkdir -p "$INSTALL_DIR"
    print_success "Directory $INSTALL_DIR created"

    print_step "Copying application files..."
    cp -r "$SCRIPT_DIR/backend" "$INSTALL_DIR/"
    cp -r "$SCRIPT_DIR/frontend" "$INSTALL_DIR/"
    cp -r "$SCRIPT_DIR/scripts" "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/scripts/"*.sh
    cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/"
    cp "$SCRIPT_DIR/package-lock.json" "$INSTALL_DIR/"
    print_success "Files copied"

    print_step "Creating data directory..."
    mkdir -p "$INSTALL_DIR/data"
    print_success "Data directory created"

    print_step "Configuring environment variables..."
    cp "$SCRIPT_DIR/config/.env.template" "$INSTALL_DIR/.env"
    sed -i "s|{{JWT_SECRET}}|$JWT_SECRET|g" "$INSTALL_DIR/.env"
    sed -i "s|{{ENCRYPTION_KEY}}|$ENCRYPTION_KEY|g" "$INSTALL_DIR/.env"
    sed -i "s|{{SERVER_IP}}|$SERVER_IP|g" "$INSTALL_DIR/.env"
    sed -i "s|{{NGINX_PORT}}|$NGINX_PORT|g" "$INSTALL_DIR/.env"
    print_success ".env file configured"

    print_step "Installing npm dependencies..."
    cd "$INSTALL_DIR"
    npm install
    print_success "Dependencies installed"

    print_step "Building application..."
    npm run build
    print_success "Application built"

    print_step "Setting permissions..."
    chown -R www-data:www-data "$INSTALL_DIR"
    print_success "Permissions set (www-data)"

    print_step "Creating PM2 ecosystem file..."
    cat > "$INSTALL_DIR/ecosystem.config.cjs" << 'PMEOF'
module.exports = {
  apps: [{
    name: 'vibevps',
    script: 'backend/dist/server.js',
    cwd: '/var/www/vibevps',
    env_file: '.env',
    node_args: '--env-file=.env'
  }]
};
PMEOF
    print_success "PM2 ecosystem file created"

    print_step "Starting application with PM2..."
    pm2 start "$INSTALL_DIR/ecosystem.config.cjs" > /dev/null 2>&1
    pm2 save > /dev/null 2>&1
    print_success "Application started"
}

# Final summary
print_summary() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ INSTALLATION COMPLETED                       ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  🌐 URL: ${CYAN}http://$SERVER_IP:$NGINX_PORT${NC}                      "
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  👤 Admin Credentials:                                       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     Username: ${CYAN}admin${NC}                                          "
    echo -e "${GREEN}║${NC}     Password: ${CYAN}admin123!${NC}                                      "
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  📁 Installation directory: ${CYAN}$INSTALL_DIR${NC}                     "
    echo -e "${GREEN}║${NC}  📁 Database: ${CYAN}$INSTALL_DIR/data/vibevps.db${NC}                   "
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  📝 Useful commands:                                         ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     ${YELLOW}sudo pm2 status${NC}                - Application status      "
    echo -e "${GREEN}║${NC}     ${YELLOW}sudo pm2 logs vibevps${NC}          - Application logs        "
    echo -e "${GREEN}║${NC}     ${YELLOW}sudo pm2 restart vibevps${NC}       - Restart app             "
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# Save installation log
save_log() {
    LOG_FILE="/var/log/vibevps-install.log"
    {
        echo "=== VIBEVps Installation Log ==="
        echo "Date: $(date)"
        echo "Server IP: $SERVER_IP"
        echo "Nginx Port: $NGINX_PORT"
        echo "Directory: $INSTALL_DIR"
        echo ""
        echo "=== Services ==="
        systemctl is-active nginx
        pm2 status
    } > "$LOG_FILE" 2>&1
}

# ============================================
# MAIN EXECUTION
# ============================================

clear
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║     ██╗   ██╗██╗██████╗ ███████╗██╗   ██╗██████╗ ███████╗                   ║"
echo "║     ██║   ██║██║██╔══██╗██╔════╝██║   ██║██╔══██╗██╔════╝                   ║"
echo "║     ██║   ██║██║██████╔╝█████╗  ██║   ██║██████╔╝███████╗                   ║"
echo "║     ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔═══╝ ╚════██║                  ║"
echo "║      ╚████╔╝ ██║██████╔╝███████╗ ╚████╔╝ ██║     ███████║                   ║"
echo "║       ╚═══╝  ╚═╝╚═════╝ ╚══════╝  ╚═══╝  ╚═╝     ╚══════╝                  ║"
echo "║                                                                              ║"
echo "║                          AUTOMATIC INSTALLATION                              ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# Run installation steps
check_root
check_os
collect_info
update_system
install_nodejs
install_nginx
install_vibevps
save_log
print_summary
