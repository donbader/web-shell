#!/bin/bash

# Cleanup script for web-shell dangling containers
# Removes all session containers (both tracked and orphaned)

set -e

echo "🧹 Web Shell Container Cleanup"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Count existing session containers
SESSION_CONTAINERS=$(docker ps -a --filter "name=web-shell-session-" --format "{{.Names}}" | wc -l)

echo -e "${BLUE}Found ${SESSION_CONTAINERS} session containers${NC}"

if [ "$SESSION_CONTAINERS" -eq 0 ]; then
  echo -e "${GREEN}✓ No session containers to clean up${NC}"
  exit 0
fi

echo ""
echo "Session containers:"
docker ps -a --filter "name=web-shell-session-" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
echo ""

# Ask for confirmation unless --force flag is provided
if [ "$1" != "--force" ]; then
  read -p "$(echo -e ${YELLOW}Remove all session containers? [y/N]:${NC} )" -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Cleanup cancelled${NC}"
    exit 0
  fi
fi

echo ""
echo -e "${BLUE}Stopping and removing session containers...${NC}"

# Stop all session containers with timeout
STOPPED=0
FAILED=0

for container in $(docker ps -a --filter "name=web-shell-session-" --format "{{.Names}}"); do
  echo -n "  Removing $container... "
  if docker rm -f "$container" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((STOPPED++))
  else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
  fi
done

echo ""
echo "=============================="
echo -e "${GREEN}✓ Removed: ${STOPPED}${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}✗ Failed: ${FAILED}${NC}"
fi

# Also show if there are any orphaned volumes
ORPHANED_VOLUMES=$(docker volume ls -qf "label=web-shell.persistent" 2>/dev/null | wc -l)
if [ "$ORPHANED_VOLUMES" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠ Found ${ORPHANED_VOLUMES} persistent volumes${NC}"
  echo "Run 'docker volume ls -f label=web-shell.persistent' to see them"
  echo "Use 'docker volume rm <name>' to remove if no longer needed"
fi

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
