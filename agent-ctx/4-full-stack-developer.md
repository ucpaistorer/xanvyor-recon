---
Task ID: 4
Agent: full-stack-developer
Task: Add NIK Check and KTP Location Tracker modules to OSINT page

Work Log:
- Updated ModuleType to include 'nik' and 'ktptrack'
- Added new module entries to MODULES array with orange/amber (NIK) and teal/cyan (KTP) themes
- Added Upload, Copy, Check icons to lucide-react imports
- Updated Dashboard stats from "10+" to "12+" tools available
- Added NIK Check and KTP Tracker capability entries to Dashboard
- Created NIKModule component with full NIK decoding display
- Created KTPTrackModule component with OpenStreetMap map integration
- Updated renderModule switch with new cases
- All lint checks pass with zero errors
- Dev server compiles and serves successfully

Stage Summary:
- Two new OSINT modules added to the frontend
- NIK Check: Shows decoded NIK data, KK number with copy, area info, data leaks, and AI analysis
- KTP Tracker: Shows extracted KTP data, embedded OpenStreetMap map, location links, data leaks, and AI analysis
- Dashboard updated to reflect 12+ tools
- All existing patterns followed (fetch, error/loading handling, framer-motion animations, dark theme)
