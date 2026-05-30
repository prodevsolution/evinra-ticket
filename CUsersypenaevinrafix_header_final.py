import os
import re

files = [
    "evinra_events.html",
    "evinra_catalog.html", 
    "evinra_credit_plans.html",
    "evinra_credit_txn.html",
    "evinra_dashboard_v2.html",
    "evinra_experience_tickets.html",
    "evinra_general.html",
    "evinra_inshow_analytics.html",
    "evinra_order_detail.html",
    "evinra_rides_exp.html",
    "evinra_sales_overview.html",
    "evinra_event_sales_report.html",
    "evinra_attendance_scan_report.html",
    "evinra_vendor_settlement.html",
    "evinra_scan_roles.html",
    "evinra_shows.html",
    "evinra_split_dist.html",
    "evinra_refund_report.html"
]

base_path = "C:\Users\ypena\evinra\\"

# CSS to update
old_header_css = r'\.header-left\{display:flex;align-items:center;gap:24px;min-width:0;padding:0 28px 0 0\}'
new_header_css = '.header-left{display:flex;align-items:center;gap:24px;min-width:0;padding:0 0 0 0}'

old_logo_css = r'\.header-logo\{width:64px;height:64px;display:flex;align-items:center;justify-content:center;flex-shrink:0\}'
new_logo_css = '.header-logo{width:80px;height:80px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:32px}'

old_title_css = r'\.header-title\{display:flex;flex-direction:column;gap:2px;min-width:0;padding:0 0 0 28px;flex:1\}'
new_title_css = '.header-title{display:flex;flex-direction:column;gap:2px;min-width:0;padding:0 0 0 0;flex:1;margin-left:16px}'

# Pattern to remove .sb-logo sections
sb_logo_pattern = r'<div class="sb-logo">\s*<div class="sb-logo-badge">E</div>\s*<div>\s*<div class="sb-logo-text">Evinra</div>\s*<div class="sb-logo-sub">Ticketing</div>\s*</div>\s*</div>\s*'

for file in files:
    filepath = os.path.join(base_path, file)
    if not os.path.exists(filepath):
        print(f"SKIP: {file} (not found)")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove .sb-logo section
    content = re.sub(sb_logo_pattern, '', content, flags=re.DOTALL)
    
    # Update header CSS
    content = re.sub(old_header_css, new_header_css, content)
    content = re.sub(old_logo_css, new_logo_css, content)
    content = re.sub(old_title_css, new_title_css, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"FIXED: {file}")
    else:
        print(f"OK: {file} (no changes needed)")

print("\nDone!")
