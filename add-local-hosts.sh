#!/bin/bash

# Add QWIKKER local development subdomains to /etc/hosts

echo ""
echo "Adding QWIKKER subdomains to /etc/hosts..."
echo "You'll need to enter your password."
echo ""

# Check if entries already exist
if grep -q "bournemouth.localhost" /etc/hosts; then
    echo "Entries already exist in /etc/hosts"
else
    echo "
# QWIKKER local development subdomains
127.0.0.1 bournemouth.localhost
127.0.0.1 bali.localhost
127.0.0.1 calgary.localhost" | sudo tee -a /etc/hosts > /dev/null
    echo "✅ Done! Subdomains added to /etc/hosts"
fi

echo ""
echo "You can now test:"
echo "  - http://localhost:3000 → Global homepage"
echo "  - http://bournemouth.localhost:3000 → Bournemouth city page"
echo "  - http://bali.localhost:3000 → Bali city page"
echo "  - http://calgary.localhost:3000 → Calgary city page"
echo ""
