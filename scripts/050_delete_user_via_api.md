# Delete Orphaned User via API

## Method 1: Use the Cleanup API Endpoint (Recommended)

If you're logged in as an admin in your application:

1. Open your browser's developer console (F12)
2. Navigate to any admin page in your app
3. Run this in the console:

```javascript
fetch('/api/admin/users/cleanup-orphaned', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err))
```

This will delete ALL orphaned users (users without profiles).

## Method 2: Use TypeScript Script with Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Run the script:
   ```bash
   npx tsx scripts/048_delete_orphaned_auth_user.ts 6680c6a7-5470-47c1-918e-f8ca11e89754
   ```

## Method 3: Use Supabase CLI

If you have Supabase CLI installed:

```bash
supabase auth admin delete-user 6680c6a7-5470-47c1-918e-f8ca11e89754 --project-ref your-project-ref
```

## Method 4: Manual SQL + Admin API

If the dashboard is failing, it might be due to related data. You can:

1. First, check for related data using the SQL script:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM scripts/049_force_delete_orphaned_user.sql
   ```

2. Then use the TypeScript script with proper credentials to delete via Admin API


























