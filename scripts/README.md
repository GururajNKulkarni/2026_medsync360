# 📁 Scripts Directory Documentation

**Last Updated:** August 7, 2025  
**Total Scripts:** 17 files

---

## 📂 **Directory Structure**

```
scripts/
├── migrations/          # Database migration scripts
├── testing/            # Testing and validation scripts
├── diagnostics/        # System diagnostic scripts
├── storage/           # Storage bucket management
├── data-management/   # Data manipulation scripts
├── deployment/        # Deployment and CI/CD scripts
└── troubleshoot/      # Troubleshooting and debugging
```

---

## 🔧 **Script Categories**

### **1. Migrations** 📦
**Purpose:** Database schema changes and data migrations

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `apply-medication-history-migration.js` | Apply medication history schema | 2025-07-26 | ✅ Active |
| `apply-medication-migration.js` | Apply medication tracking fields | 2025-07-19 | ✅ Active |
| `apply-transfer-function-fix.js` | Fix transfer function parameters | 2025-07-27 | ✅ Active |
| `apply-transfer-migration.js` | Apply transfer system schema | 2025-07-27 | ✅ Active |

### **2. Testing** 🧪
**Purpose:** System testing and validation

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `comprehensive-upload-test.js` | Test file upload functionality | 2025-07-20 | ✅ Active |
| `test-file-upload.js` | Basic file upload testing | 2025-07-19 | ✅ Active |
| `test-openai-connection.js` | Test OpenAI API connectivity | 2025-06-29 | ✅ Active |

### **3. Diagnostics** 🔍
**Purpose:** System diagnostics and health checks

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `database-diagnostics.js` | Database health check | 2025-07-19 | ✅ Active |
| `run-bulletproof-tests.cjs` | Comprehensive system tests | 2025-07-30 | ✅ Active |

### **4. Storage** 📁
**Purpose:** Storage bucket management

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `apply-storage-bucket-fix.js` | Fix storage bucket issues | 2025-07-20 | ✅ Active |
| `fix-bucket-public-access.js` | Configure bucket permissions | 2025-07-19 | ✅ Active |
| `setup-storage-bucket.js` | Initialize storage bucket | 2025-07-19 | ✅ Active |

### **5. Data Management** 📊
**Purpose:** Data manipulation and seeding

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `fix-broken-attachments.js` | Fix broken file attachments | 2025-07-19 | ✅ Active |
| `fix-file-extensions.js` | Fix file extension issues | 2025-07-19 | ✅ Active |
| `seed-research-data.js` | Seed research data | 2025-06-29 | ✅ Active |

### **6. Troubleshooting** 🛠️
**Purpose:** Debugging and issue resolution

| Script | Purpose | Last Updated | Status |
|--------|---------|--------------|--------|
| `fix-transfer-history.js` | Fix transfer history issues | 2025-08-07 | ✅ Active |
| `validate-referral-data.js` | Validate referral data integrity | 2025-08-06 | ✅ Active |
| `troubleshoot-referral.js` | Comprehensive referral troubleshooting | 2025-08-06 | ✅ Active |
| `investigate_transfer_referral.sh` | Transfer investigation (Bash) | 2025-08-07 | ✅ Active |
| `investigate_transfer_referral_mcp.sh` | Transfer investigation (MCP) | 2025-08-07 | ✅ Active |
| `final-transfer-verification.cjs` | Final transfer system verification | 2025-07-30 | ✅ Active |
| `final-ui-backend-alignment-check.cjs` | UI-backend alignment verification | 2025-07-30 | ✅ Active |
| `investigate_transfer_issue.cjs` | Transfer issue investigation | 2025-07-30 | ✅ Active |
| `investigate_transfer_issue.js` | Transfer issue investigation (JS) | 2025-07-30 | ✅ Active |
| `database-diagnostics.js` | Database diagnostics | 2025-07-19 | ✅ Active |
| `test-openai-connection.js` | OpenAI connection test | 2025-06-29 | ✅ Active |

---

## 🚀 **Quick Start Guide**

### **For Database Issues:**
```bash
# Run comprehensive diagnostics
node scripts/diagnostics/run-bulletproof-tests.cjs

# Check specific referral
node scripts/troubleshoot/troubleshoot-referral.js <referral_id>

# Validate data integrity
node scripts/validate-referral-data.js
```

### **For Transfer Issues:**
```bash
# Investigate transfer chain
node scripts/troubleshoot/final-transfer-verification.cjs

# Check UI-backend alignment
node scripts/troubleshoot/final-ui-backend-alignment-check.cjs

# Fix transfer history
node scripts/fix-transfer-history.js
```

### **For Storage Issues:**
```bash
# Setup storage bucket
node scripts/storage/setup-storage-bucket.js

# Fix bucket permissions
node scripts/storage/fix-bucket-public-access.js

# Test file upload
node scripts/testing/test-file-upload.js
```

---

## 📋 **Maintenance Schedule**

### **Daily:**
- Monitor system logs
- Check for failed transfers
- Validate data integrity

### **Weekly:**
- Run comprehensive diagnostics
- Check storage bucket health
- Validate transfer relationships

### **Monthly:**
- Update script documentation
- Review and clean up old scripts
- Performance optimization

---

## 🔧 **Script Development Guidelines**

### **Naming Convention:**
- Use descriptive names: `fix-transfer-history.js`
- Include date for versioning: `20250807-fix-transfer-status.js`
- Use appropriate extensions: `.js`, `.cjs`, `.sh`

### **Documentation:**
- Include header comments with purpose
- Document parameters and return values
- Add usage examples

### **Error Handling:**
- Always include try-catch blocks
- Log errors with context
- Provide helpful error messages

### **Testing:**
- Test scripts before deployment
- Include validation checks
- Add rollback capabilities

---

## 🚨 **Troubleshooting Common Issues**

### **Permission Denied:**
```bash
# Check file permissions
chmod +x scripts/*.sh

# Run with proper user
sudo node scripts/script-name.js
```

### **Module Not Found:**
```bash
# Install dependencies
npm install

# Check package.json
cat package.json
```

### **Database Connection:**
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Test connection
node scripts/test-openai-connection.js
```

---

## 📞 **Support**

For script-related issues:
1. Check this documentation first
2. Review script comments and logs
3. Run diagnostic scripts
4. Contact development team

---

**Documentation Status:** ✅ Complete  
**Last Review:** August 7, 2025  
**Next Review:** September 7, 2025 