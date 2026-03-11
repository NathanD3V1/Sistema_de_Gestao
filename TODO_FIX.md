# TODO - Fix BigInt Error for UUID Fields

## Problem
Error: `invalid input syntax for type bigint: "00000000-0000-0000-0000-000000000001"`
- Frontend passes string IDs like "eqp-1", "eqp-2", "eqp-3"
- Database expects UUID format like "00000000-0000-0000-0000-000000000001"
- The UUID string is being interpreted as a BIGINT number somewhere

## Root Cause Analysis
1. The code uses UUID strings but somewhere they're being converted to numbers
2. The Supabase client might be sending data incorrectly
3. There might be type coercion happening in the database driver

## Implemented Fixes

### 1. Added company ID mapping in db.ts
- Created `COMPANY_ID_MAP` for mapping company IDs
- Created `convertCompanyIdToDb()` function
n- Created `toUuidString()` helper to ensure UUIDs are treated as strings

### 2. Updated dbCreateIncident
- Uses `toUuidString()` for both company_id and team_id
- Added debug logging to trace values

### 3. Updated dbCreateTeam  
- Uses `toUuidString()` for company_id
- Added debug logging

### 4. Updated Supabase client configuration
- Added explicit type annotation: `SupabaseClient`
- Added global headers to prevent type coercion

## Tasks Completed
- [x] 1. Analyze codebase and understand the issue
- [x] 2. Add team ID mapping utility in db.ts (already exists)
- [x] 3. Add company ID mapping utility in db.ts
- [x] 4. Ensure all UUID fields are passed as strings, not numbers
- [ ] 5. Verify the Supabase database schema matches the SQL definition
- [ ] 6. Test the fix end-to-end

## Database Verification Required
If the error persists, the database schema might have been created with wrong types. Run this SQL to verify:

```sql
-- Check column types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('company', 'team', 'incident', 'user', 'message', 'status_history')
AND column_name IN ('id', 'company_id', 'team_id', 'sender_id', 'incident_id');
```

If any show `bigint` instead of `uuid`, the columns need to be recreated.

