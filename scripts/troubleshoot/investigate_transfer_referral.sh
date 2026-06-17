#!/bin/bash

# Transfer Referral Investigation Script
# Usage: ./investigate_transfer_referral.sh [referral_id]
# Example: ./investigate_transfer_referral.sh 24b0d8c1-1957-4f1e-8d32-d961b759875d

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

# Database connection settings (modify these for your setup)
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"postgres"}
DB_USER=${DB_USER:-"postgres"}

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

# Function to run SQL query
run_query() {
    local query_name="$1"
    local sql_query="$2"
    
    echo -e "${YELLOW}Running: $query_name${NC}"
    echo -e "${PURPLE}Query:${NC} ${sql_query:0:100}..."
    echo ""
    
    # Use psql to run the query
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql_query"
    
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}❌ Query failed with exit code: $exit_code${NC}"
    else
        echo -e "${GREEN}✅ Query completed successfully${NC}"
    fi
    echo ""
}

# Function to check if required tools are installed
check_dependencies() {
    print_header "CHECKING DEPENDENCIES"
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ psql command not found. Please install PostgreSQL client.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ psql found${NC}"
    
    # Test database connection
    echo -e "${YELLOW}Testing database connection...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Cannot connect to database. Please check your connection settings.${NC}"
        echo -e "${YELLOW}Current settings:${NC}"
        echo -e "  Host: $DB_HOST"
        echo -e "  Port: $DB_PORT"
        echo -e "  Database: $DB_NAME"
        echo -e "  User: $DB_USER"
        echo -e "${YELLOW}Set DB_PASSWORD environment variable for password.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database connection successful${NC}"
}

# Main investigation function
investigate_referral() {
    print_header "TRANSFER REFERRAL INVESTIGATION"
    echo -e "${CYAN}Investigating Referral ID: ${YELLOW}$REFERRAL_ID${NC}"
    echo -e "${CYAN}Timestamp: ${YELLOW}$(date)${NC}"
    
    # 1. Basic Referral Information
    print_header "1. BASIC REFERRAL INFORMATION"
    run_query "Basic Referral Info" "
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
    WHERE id = '$REFERRAL_ID';
    "
    
    # 2. User Information
    print_header "2. USER INFORMATION"
    run_query "Users Involved" "
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
    ORDER BY ru.role;
    "
    
    # 3. Complete Transfer History Chain
    print_header "3. COMPLETE TRANSFER HISTORY CHAIN"
    run_query "Transfer History" "
    SELECT * FROM get_referral_transfer_history('$REFERRAL_ID');
    "
    
    # 4. Medication History Timeline
    print_header "4. MEDICATION HISTORY TIMELINE"
    run_query "Medication History" "
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
    ORDER BY updated_at ASC;
    "
    
    # 5. Medication Timeline Function
    print_header "5. MEDICATION TIMELINE (FORMATTED)"
    run_query "Medication Timeline Function" "
    SELECT * FROM get_medication_timeline('$REFERRAL_ID');
    "
    
    # 6. Referral Attachments
    print_header "6. REFERRAL ATTACHMENTS"
    run_query "Attachments" "
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
    ORDER BY created_at ASC;
    "
    
    # 7. Find Original Referral
    print_header "7. ORIGINAL REFERRAL (ROOT OF CHAIN)"
    run_query "Find Root Referral" "
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
    ORDER BY tr.level DESC;
    "
    
    # 8. Status Audit
    print_header "8. REFERRAL STATUS AUDIT"
    run_query "Status Consistency Check" "
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
    WHERE id = '$REFERRAL_ID';
    "
    
    # 9. Summary Report
    print_header "9. SUMMARY REPORT"
    run_query "Executive Summary" "
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
    WHERE r.id = '$REFERRAL_ID';
    "
    
    print_header "INVESTIGATION COMPLETED"
    echo -e "${GREEN}✅ Transfer referral investigation completed successfully!${NC}"
    echo -e "${YELLOW}📋 All queries executed for referral: $REFERRAL_ID${NC}"
    echo -e "${CYAN}🕒 Completed at: $(date)${NC}"
}

# Help function
show_help() {
    echo -e "${CYAN}Transfer Referral Investigation Script${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  $0 [referral_id]"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 24b0d8c1-1957-4f1e-8d32-d961b759875d"
    echo -e "  $0  # Uses default referral ID"
    echo ""
    echo -e "${YELLOW}Environment Variables:${NC}"
    echo -e "  DB_HOST     - Database host (default: localhost)"
    echo -e "  DB_PORT     - Database port (default: 5432)"
    echo -e "  DB_NAME     - Database name (default: postgres)"
    echo -e "  DB_USER     - Database user (default: postgres)"
    echo -e "  DB_PASSWORD - Database password (required)"
    echo ""
    echo -e "${YELLOW}Example with custom database:${NC}"
    echo -e "  DB_HOST=myhost DB_PASSWORD=mypass $0 my-referral-id"
}

# Main script execution
main() {
    # Check for help flag
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
        exit 0
    fi
    
    # Check dependencies
    check_dependencies
    
    # Run investigation
    investigate_referral
}

# Run main function with all arguments
main "$@"