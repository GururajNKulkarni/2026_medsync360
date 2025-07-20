# Changelog

All notable changes to the MedSync application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-07-19

### Fixed
- **Referral Management System - Attachment Viewing Issue** 
  - **Issue**: Users couldn't view or download attached files in referral details. Files showed "Image Not Available" and "Failed to load image. URL may be incorrect or inaccessible" errors.
  - **Root Causes**: 
    - Hardcoded Supabase URL instead of using environment variables
    - Incorrect file URL construction for storage access
    - Missing proper signed URL generation for secure file access
    - Inadequate error handling and fallback mechanisms
  
  **Changes Made:**

#### `src/hooks/useReferrals.ts`
- **Added `getSignedFileUrl()` function** with comprehensive URL generation strategy:
  - Primary: Generate signed URLs for secure access (1-hour expiry)
  - Secondary: Use public URLs for public buckets  
  - Tertiary: Manual URL construction using environment variables
  - Graceful error handling that doesn't break the UI
- **Enhanced `useReferralAttachments()` hook**:
  - Now generates proper URLs for each attachment using the new URL function
  - Supports both RPC function calls and direct database queries
  - Handles legacy attachments from the referrals table
  - Improved error logging and debugging
  - Added comprehensive console logging for troubleshooting

#### `src/components/features/referrals/ReferralDetails.tsx`  
- **Enhanced error handling in `handlePreview()` function**:
  - More descriptive error messages for users
  - Better validation of file URLs before attempting preview
- **Improved `handleDownload()` function**:
  - Added fallback download mechanism (opens in new tab if download fails)
  - Enhanced error handling with try-catch blocks
  - Added `target="_blank"` for better download experience
- **Better user feedback**:
  - More informative error messages
  - Clear guidance when files can't be accessed

### Technical Details
- **Files Modified**: 
  - `src/hooks/useReferrals.ts` 
  - `src/components/features/referrals/ReferralDetails.tsx`
- **Dependencies**: Uses existing Supabase storage API and environment variables
- **Backward Compatibility**: Maintains compatibility with existing attachment data structure
- **Testing**: Requires testing with actual attachments to verify URL generation works

### Database Status Verified
- ✅ `referral_attachments` bucket exists and is public
- ✅ Files are stored with proper metadata
- ✅ Bucket permissions allow authenticated users to view/download attachments
- ✅ RPC function `get_referral_attachments` is available for enhanced queries

---

## Template for Future Entries

### [Version] - YYYY-MM-DD

### Added
- New features

### Changed  
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Any bug fixes

### Security
- Security improvements

---

## Change Categories

- **Added** - New features
- **Changed** - Changes in existing functionality  
- **Deprecated** - Soon-to-be removed features
- **Removed** - Now removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

## File Change Tracking

When making changes, please:
1. Update this CHANGELOG.md with the date and description
2. List all modified files
3. Explain the technical reasoning
4. Note any breaking changes
5. Include testing requirements

---

*This changelog helps maintain a clear history of all modifications to the MedSync application for audit, debugging, and team communication purposes.*
