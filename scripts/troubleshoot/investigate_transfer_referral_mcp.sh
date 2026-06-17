#!/bin/bash

# Transfer Referral Investigation Script using Supabase MCP
# Usage: ./investigate_transfer_referral_mcp.sh [referral_id]
# Example: ./investigate_transfer_referral_mcp.sh 24b0d8c1-1957-4f1e-8d32-d961b759875d

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default referral ID if not provided
REFERRAL_ID=${1:-"24b0d8c1-1957-4f1e-8d32-d961b759875d"}

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

# Function to create SQL file and execute via cursor
create_and_show_sql() {
    local query_name="$1"
    local sql_query="$2"
    local filename="query_$(echo "$query_name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').sql"
    
    echo -e "${YELLOW}Creating SQL file: $filename${NC}"
    echo -e "${PURPLE}Query: $query_name${NC}"
    
    # Create SQL file with header comment
    cat > "$filename" << EOF
-- $query_name
-- Referral ID: $REFERRAL_ID
-- Generated: $(date)

$sql_query
EOF
    
    echo -e "${GREEN}✅ Created: $filename${NC}"
    echo -e "${CYAN}💡 Run this in Cursor/Claude with: mcp_supabase_execute_sql${NC}"
    echo ""
}

# Main investigation function
investigate_referral() {
    print_header "TRANSFER REFERRAL INVESTIGATION - SQL FILE GENERATOR"
    echo -e "${CYAN}Investigating Referral ID: ${YELLOW}$REFERRAL_ID${NC}"
    echo -e "${CYAN}Timestamp: ${YELLOW}$(date)${NC}"
    echo -e "${YELLOW}Note: This will create SQL files for you to run in Cursor/Claude${NC}"
    
    # Create output directory
    mkdir -p "transfer_investigation_$REFERRAL_ID"
    cd "transfer_investigation_$REFERRAL_ID"
    
    # 1. Basic Referral Information
    print_header "1. BASIC REFERRAL INFORMATION"
    create_and_show_sql "Basic Referral Info" "
SELECT 
  id,
  title,
  description,
  patient_name,
  patient_age,
  patient_sex,
  admission_date,
  urgency,
  status,
  created_at,
  start_time,
  end_time,
  from_user_id,
  to_user_id,
  from_department,
  to_department,
  medication_given,
  initial_medication,
  last_medication_update,
  medication_update_count,
  transfer_parent_id,
  transfer_reason,
  transfer_notes,
  transferred_from_user_id,
  transferred_from_department,
  transferred_at
FROM referrals 
WHERE id = '$REFERRAL_ID';"
    
    # 2. User Information
    print_header "2. USER INFORMATION"
    create_and_show_sql "Users Involved" "
WITH referral_users AS (
  SELECT 
    from_user_id as user_id, 'Original Sender' as role
  FROM referrals 
  WHERE id = '$REFERRAL_ID'
  
  UNION
  
  SELECT 
    to_user_id as user_id, 'Current Recipient' as role
  FROM referrals 
  WHERE id = '$REFERRAL_ID'
  
  UNION
  
  SELECT 
    transferred_from_user_id as user_id, 'Transferred From' as role
  FROM referrals 
  WHERE id = '$REFERRAL_ID'
    AND transferred_from_user_id IS NOT NULL
)
SELECT 
  ru.role,
  u.id,
  u.full_name,
  u.email,
  u.department,
  u.role as user_role,
  u.created_at as user_created_at
FROM referral_users ru
JOIN users u ON ru.user_id = u.id
ORDER BY ru.role;"
    
    # 3. Complete Transfer History Chain
    print_header "3. COMPLETE TRANSFER HISTORY CHAIN"
    create_and_show_sql "Transfer History" "
SELECT * FROM get_referral_transfer_history('$REFERRAL_ID');"
    
    # 4. Medication History Timeline
    print_header "4. MEDICATION HISTORY TIMELINE"
    create_and_show_sql "Medication History" "
SELECT 
  id,
  referral_id,
  medication_text,
  update_type,
  updated_by,
  updated_at,
  notes,
  created_at
FROM medication_history 
WHERE referral_id = '$REFERRAL_ID'
ORDER BY updated_at ASC;"
    
    # 5. Medication Timeline Function
    print_header "5. MEDICATION TIMELINE (FORMATTED)"
    create_and_show_sql "Medication Timeline Function" "
SELECT * FROM get_medication_timeline('$REFERRAL_ID');"
    
    # 6. Referral Attachments
    print_header "6. REFERRAL ATTACHMENTS"
    create_and_show_sql "Attachments" "
SELECT 
  id,
  referral_id,
  file_name,
  original_file_name,
  file_type,
  file_size,
  file_url,
  uploaded_by,
  created_at,
  updated_at
FROM referral_attachments 
WHERE referral_id = '$REFERRAL_ID'
ORDER BY created_at ASC;"
    
    # 7. Find Original Referral
    print_header "7. ORIGINAL REFERRAL (ROOT OF CHAIN)"
    create_and_show_sql "Find Root Referral" "
WITH RECURSIVE transfer_root AS (
  SELECT 
    id,
    transfer_parent_id,
    1 as level,
    ARRAY[id] as path
  FROM referrals 
  WHERE id = '$REFERRAL_ID'
  
  UNION ALL
  
  SELECT 
    r.id,
    r.transfer_parent_id,
    tr.level + 1,
    tr.path || r.id
  FROM referrals r
  INNER JOIN transfer_root tr ON r.id = tr.transfer_parent_id
)
SELECT 
  tr.level,
  tr.path,
  r.id,
  r.title,
  r.patient_name,
  r.created_at,
  r.status,
  fu.full_name as from_doctor,
  tu.full_name as to_doctor,
  r.from_department,
  r.to_department
FROM transfer_root tr
JOIN referrals r ON tr.id = r.id
LEFT JOIN users fu ON r.from_user_id = fu.id
LEFT JOIN users tu ON r.to_user_id = tu.id
ORDER BY tr.level DESC;"
    
    # 8. Status Audit
    print_header "8. REFERRAL STATUS AUDIT"
    create_and_show_sql "Status Consistency Check" "
SELECT 
  id,
  status,
  created_at,
  start_time,
  end_time,
  transferred_at,
  CASE 
    WHEN status = 'Closed' AND end_time IS NULL THEN 'INCONSISTENT: Closed but no end_time'
    WHEN status != 'Closed' AND end_time IS NOT NULL THEN 'INCONSISTENT: Has end_time but not closed'
    WHEN status = 'Transferred' AND transferred_at IS NULL THEN 'INCONSISTENT: Transferred but no timestamp'
    WHEN transfer_parent_id IS NOT NULL AND status != 'Received' THEN 'INCONSISTENT: Is transfer but wrong status'
    ELSE 'CONSISTENT'
  END as status_consistency,
  CASE 
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (end_time - start_time))/3600 || ' hours'
    WHEN start_time IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (NOW() - start_time))/3600 || ' hours (ongoing)'
    ELSE 'No timing data'
  END as duration
FROM referrals 
WHERE id = '$REFERRAL_ID';"
    
    # 9. Summary Report
    print_header "9. SUMMARY REPORT"
    create_and_show_sql "Executive Summary" "
SELECT 
  'TRANSFER REFERRAL SUMMARY' as report_section,
  r.id,
  r.patient_name,
  r.status,
  r.urgency,
  'Transferred from: ' || COALESCE(r.transferred_from_department, 'Unknown') || 
  ' to: ' || r.to_department as transfer_path,
  'Reason: ' || COALESCE(r.transfer_reason, 'Not specified') as transfer_reason,
  'Date: ' || TO_CHAR(r.transferred_at, 'Mon DD, YYYY at HH24:MI') as transfer_time,
  CASE 
    WHEN r.medication_given != r.initial_medication THEN 'Medication updated during transfer'
    ELSE 'Medication unchanged'
  END as medication_status,
  (SELECT COUNT(*) FROM medication_history WHERE referral_id = r.id) as medication_updates,
  (SELECT COUNT(*) FROM referral_attachments WHERE referral_id = r.id) as attachment_count
FROM referrals r
WHERE r.id = '$REFERRAL_ID';"
    
    # Create master script
    print_header "CREATING MASTER EXECUTION SCRIPT"
    cat > "run_all_queries.md" << EOF
# Transfer Referral Investigation
**Referral ID:** $REFERRAL_ID  
**Generated:** $(date)

## How to Run These Queries

### Option 1: Use Cursor/Claude MCP Tools
For each .sql file, run:
\`\`\`
mcp_supabase_execute_sql with the query content
\`\`\`

### Option 2: Copy-paste in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each query
4. Click "Run"

## Query Files Created:
1. \`query_basic_referral_info.sql\` - Basic referral information
2. \`query_users_involved.sql\` - All users involved in this referral
3. \`query_transfer_history.sql\` - Complete transfer chain
4. \`query_medication_history.sql\` - All medication changes
5. \`query_medication_timeline_function.sql\` - Formatted medication timeline
6. \`query_attachments.sql\` - All attached files
7. \`query_find_root_referral.sql\` - Original referral in chain
8. \`query_status_consistency_check.sql\` - Data integrity audit
9. \`query_executive_summary.sql\` - Final summary report

## Quick Start:
Run queries 1, 3, and 9 first for the key information.
EOF
    
    cd ..
    
    print_header "INVESTIGATION FILES CREATED"
    echo -e "${GREEN}✅ All SQL files created successfully!${NC}"
    echo -e "${YELLOW}📁 Location: transfer_investigation_$REFERRAL_ID/${NC}"
    echo -e "${CYAN}📋 Files created:${NC}"
    ls -la "transfer_investigation_$REFERRAL_ID/"
    echo ""
    echo -e "${YELLOW}📖 Next steps:${NC}"
    echo -e "1. ${CYAN}cd transfer_investigation_$REFERRAL_ID${NC}"
    echo -e "2. ${CYAN}cat run_all_queries.md${NC} - for instructions"
    echo -e "3. Run each .sql file using Cursor/Claude MCP tools"
    echo ""
    echo -e "${PURPLE}💡 Pro tip: Start with query_basic_referral_info.sql${NC}"
}

# Help function
show_help() {
    echo -e "${CYAN}Transfer Referral Investigation Script (MCP Version)${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  $0 [referral_id]"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 24b0d8c1-1957-4f1e-8d32-d961b759875d"
    echo -e "  $0  # Uses default referral ID"
    echo ""
    echo -e "${YELLOW}What this does:${NC}"
    echo -e "  Creates SQL files for investigation instead of running directly"
    echo -e "  Use with Cursor/Claude MCP tools or Supabase dashboard"
}

# Main script execution
main() {
    # Check for help flag
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    # Run investigation
    investigate_referral
}

# Run main function with all arguments
main "$@"