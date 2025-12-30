#!/bin/bash

# Script to help identify pages that need mobile responsiveness fixes
# This is a helper script - actual fixes need to be applied manually

echo "=== Mobile Responsiveness Fix Checklist ==="
echo ""
echo "Pages with headers that need fixing (flex items-center justify-between):"
echo ""

# Find all pages with non-responsive headers
grep -r "flex items-center justify-between" app/\[locale\]/admin --include="*.tsx" | wc -l
grep -r "flex items-center justify-between" app/\[locale\]/student --include="*.tsx" | wc -l
grep -r "flex items-center justify-between" app/\[locale\]/instructor --include="*.tsx" | wc -l

echo ""
echo "Common fixes needed:"
echo "1. Headers: Change 'flex items-center justify-between' to 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'"
echo "2. Titles: Change 'text-3xl' to 'text-2xl sm:text-3xl'"
echo "3. Tables: Add 'overflow-x-auto' wrapper"
echo "4. Forms: Change 'flex space-x-2' to 'flex flex-col sm:flex-row gap-2'"
echo "5. Table columns: Hide less important columns with 'hidden md:table-cell' or 'hidden lg:table-cell'"
echo ""
echo "See MOBILE_FIXES_APPLIED.md for detailed patterns"



















