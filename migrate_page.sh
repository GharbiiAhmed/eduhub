#!/bin/bash
# Helper script to migrate a page to [locale] structure
SOURCE=$1
DEST=$2

if [ -z "$SOURCE" ] || [ -z "$DEST" ]; then
  echo "Usage: $0 <source_file> <dest_file>"
  exit 1
fi

# Copy the file
cp "$SOURCE" "$DEST"

# Update imports
sed -i "s|from 'next/link'|from '@/i18n/routing'|g" "$DEST"
sed -i "s|from \"next/link\"|from '@/i18n/routing'|g" "$DEST"
sed -i "s|import Link from|import { Link } from|g" "$DEST"
sed -i "s|from 'next/navigation'|from '@/i18n/routing'|g" "$DEST"
sed -i "s|from \"next/navigation\"|from '@/i18n/routing'|g" "$DEST"
sed -i "s|import { useRouter } from 'next/navigation'|import { useRouter } from '@/i18n/routing'|g" "$DEST"
sed -i "s|import { usePathname } from 'next/navigation'|import { usePathname } from '@/i18n/routing'|g" "$DEST"

# Add useTranslations import if not present
if ! grep -q "useTranslations" "$DEST"; then
  sed -i "/^import.*from 'react'/a import { useTranslations } from 'next-intl'" "$DEST"
fi

echo "Migrated: $SOURCE -> $DEST"
