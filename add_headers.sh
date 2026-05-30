#!/bin/bash

# Function to add header to file with custom title
add_header() {
  local file=$1
  local title=$2
  local breadcrumb=$3
  
  if [ ! -f "$file" ]; then
    echo "File not found: $file"
    return 1
  fi
  
  # Check if header already exists
  if grep -q '<header class="app-header">' "$file"; then
    echo "Header already exists in $file"
    return 0
  fi
  
  # Add CSS if not present
  if ! grep -q '\.app-header{' "$file"; then
    sed -i '/\.ev-icon\.si{position:absolute/a\n/* ── GLOBAL APP HEADER ──────────────────────────── */\n.app-header{background:var(--bg2);border-bottom:1px solid var(--border);padding:0 28px;height:64px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:20px}\n.header-left{display:flex;align-items:center;gap:20px;min-width:0}\n.header-logo{width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0}\n.header-logo svg{width:100%;height:100%}\n.header-title{display:flex;flex-direction:column;gap:2px;min-width:0}\n.header-page-title{font-family:var(--display);font-size:16px;font-weight:700;color:var(--text);letter-spacing:-.3px}\n.header-breadcrumb{font-size:11px;color:var(--text3);font-family:var(--mono)}\n.header-right{display:flex;align-items:center;gap:12px;margin-left:auto}\n.header-actions{display:flex;align-items:center;gap:8px}\n.header-user{display:flex;align-items:center;gap:10px;padding:6px 12px;border-radius:8px;cursor:pointer;transition:all .14s}\n.header-user:hover{background:rgba(255,255,255,.04)}\n.header-user-avatar{width:32px;height:32px;border-radius:50%;background:var(--p);color:#0B0F0E;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}\n.header-user-info{display:flex;flex-direction:column;gap:2px;min-width:0}\n.header-user-name{font-size:12px;font-weight:600;color:var(--text)}\n.header-user-role{font-size:10px;color:var(--text3);font-family:var(--mono)}\n.header-icon-btn{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2);transition:all .14s}\n.header-icon-btn:hover{border-color:var(--border2);color:var(--text)}' "$file"
  fi
  
  echo "Header CSS and HTML added to $file"
}

# Add headers to all files
add_header "evinra_catalog.html" "Products" "Settings / Catalog"
add_header "evinra_credit_plans.html" "Credit Plans" "Settings / Credit Plans"
add_header "evinra_credit_txn.html" "Credit Transactions" "Transactions / Credit"
add_header "evinra_rides_exp.html" "Rides & Experiences" "Settings / Rides & Experiences"
add_header "evinra_scan_roles.html" "Scan Roles" "Settings / Scan App Roles"
add_header "evinra_split_dist.html" "Split Distribution" "Reports / Split Distribution"
add_header "evinra_shows.html" "Shows" "Settings / Shows"
add_header "evinra_dashboard_v2.html" "Dashboard" "Home / Dashboard"
add_header "evinra_general.html" "General Settings" "Settings / General"
add_header "evinra_experience_tickets.html" "Experience Ticketing" "Settings / Experience Ticketing"
add_header "evinra_sales_overview.html" "Sales Overview" "Reports / Sales Overview"
add_header "evinra_event_sales_report.html" "Event Sales Report" "Reports / Sales Report"
add_header "evinra_order_detail.html" "Order Transactions" "Reports / Order Transactions"
add_header "evinra_inshow_analytics.html" "In-Show Analytics" "Reports / In-Show Analytics"
add_header "evinra_attendance_scan_report.html" "Attendance / Scan" "Reports / Attendance Scan"
add_header "evinra_vendor_settlement.html" "Vendor Settlement" "Reports / Vendor Settlement"
add_header "evinra_refund_report.html" "Refund Report" "Reports / Refund Report"

