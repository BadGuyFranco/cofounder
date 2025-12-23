# Changelog: [Your Functionality Name]

All notable changes to this shared functionality will be documented in this file.

## [Unreleased]

### Added
- [New features that have been added]

### Changed
- [Changes to existing functionality]

### Fixed
- [Bug fixes]

### Removed
- [Features or dependencies that were removed]


## [1.0.0] - YYYY-MM-DD

### Added
- Initial release
- [Feature 1]
- [Feature 2]
- [Feature 3]

### Dependencies
- [Dependency 1] v[version]
- [Dependency 2] v[version]


## Template Instructions (DELETE WHEN DONE)

**This file is OPTIONAL and rarely used in practice for internal shared libraries.**

Most internal shared libraries don't need formal version tracking. Consider using this only if you're publishing externally or have multiple teams depending on versioned releases.

### When to Add Entries

Add entries when:
- ✅ Major feature additions
- ✅ Breaking changes
- ✅ Important bug fixes
- ✅ Dependency updates that affect usage
- ✅ API changes

Don't add entries for:
- ❌ Minor documentation updates
- ❌ Code refactoring (unless it changes usage)
- ❌ Fixing typos

### Format Guide

**Version numbers:**
- Major version (1.0.0 → 2.0.0): Breaking changes
- Minor version (1.0.0 → 1.1.0): New features, backward compatible
- Patch version (1.0.0 → 1.0.1): Bug fixes, backward compatible

**Date format:** YYYY-MM-DD (e.g., 2025-11-08)

**Categories:**
- **Added:** New features
- **Changed:** Changes to existing functionality
- **Deprecated:** Features that will be removed soon
- **Removed:** Features that were removed
- **Fixed:** Bug fixes
- **Security:** Security improvements

### Example Entry

```markdown
## [1.2.0] - 2025-11-15

### Added
- New batch processing mode for multiple files
- Support for PNG output format

### Changed
- Improved error messages for missing dependencies
- Updated to Python 3.11 compatibility

### Fixed
- Fixed crash when processing files with spaces in names
- Corrected output directory creation on Windows

### Dependencies
- Updated requests to 2.31.0
- Added pillow >=10.0.0
```

### Keep It User-Focused

Write for users, not developers:
- ✅ "Added support for batch processing"
- ❌ "Refactored process_files() function"

Focus on **what changed** and **why it matters to users**.


**For most internal shared libraries:**
Delete this file - formal versioning is rarely needed.

**If keeping this file:**
Delete this "Template Instructions" section when done.

