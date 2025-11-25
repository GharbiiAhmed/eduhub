#!/bin/bash

# Script to manually trigger engagement emails
# Can be run via cron or manually
# Usage: ./scripts/send-engagement-emails.sh [weekly-progress|course-reminders|course-recommendations|all]

BASE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "Warning: CRON_SECRET not set. Cron endpoints may require authentication."
fi

send_request() {
  local endpoint=$1
  local name=$2
  
  echo "Sending $name emails..."
  
  if [ -n "$CRON_SECRET" ]; then
    curl -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json"
  else
    curl -X GET "$BASE_URL$endpoint" \
      -H "Content-Type: application/json"
  fi
  
  echo ""
}

case "${1:-all}" in
  weekly-progress)
    send_request "/api/cron/weekly-progress" "Weekly Progress"
    ;;
  course-reminders)
    send_request "/api/cron/course-reminders" "Course Reminders"
    ;;
  course-recommendations)
    send_request "/api/cron/course-recommendations" "Course Recommendations"
    ;;
  all)
    send_request "/api/cron/weekly-progress" "Weekly Progress"
    sleep 5
    send_request "/api/cron/course-reminders" "Course Reminders"
    sleep 5
    send_request "/api/cron/course-recommendations" "Course Recommendations"
    ;;
  *)
    echo "Usage: $0 [weekly-progress|course-reminders|course-recommendations|all]"
    exit 1
    ;;
esac

echo "Done!"










