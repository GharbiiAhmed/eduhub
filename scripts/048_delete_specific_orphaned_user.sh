#!/bin/bash

# Script to delete a specific orphaned auth user
# Usage: ./scripts/048_delete_specific_orphaned_user.sh <USER_ID>

USER_ID="${1}"

if [ -z "$USER_ID" ]; then
  echo "Error: User ID is required"
  echo "Usage: ./scripts/048_delete_specific_orphaned_user.sh <USER_ID>"
  exit 1
fi

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Environment variables not set"
  echo "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "Deleting orphaned auth user: $USER_ID"
echo ""

# Use Node.js to run the TypeScript script
npx tsx scripts/048_delete_orphaned_auth_user.ts "$USER_ID"





