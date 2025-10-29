#!/bin/bash

# Generate PR title and description from git changes
# This script analyzes git diff and generates English PR content

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Analyzing changes...${NC}"

# Get list of changed files
changed_files=$(git diff --cached --name-only 2>/dev/null || git diff --name-only)

if [ -z "$changed_files" ]; then
    echo "No changes detected. Please stage your changes first."
    exit 1
fi

# Count changes by category
client_changes=$(echo "$changed_files" | grep -c "^src/client/" || true)
server_changes=$(echo "$changed_files" | grep -c "^src/server/" || true)
shared_changes=$(echo "$changed_files" | grep -c "^src/shared/" || true)
test_changes=$(echo "$changed_files" | grep -c "\.test\.ts$" || true)
doc_changes=$(echo "$changed_files" | grep -c -E "(README|\.md$)" || true)

# Detect feature type
feature_type="feat"
if echo "$changed_files" | grep -q "test\.ts$"; then
    if [ $test_changes -gt $((client_changes + server_changes)) ]; then
        feature_type="test"
    fi
fi
if echo "$changed_files" | grep -q -E "(README|\.md$)"; then
    if [ $doc_changes -gt $((client_changes + server_changes)) ]; then
        feature_type="docs"
    fi
fi
if echo "$changed_files" | grep -q "package\.json"; then
    feature_type="chore"
fi

# Detect main feature area
main_area="general"
if [ $client_changes -gt 0 ] && [ $server_changes -gt 0 ]; then
    main_area="multiplayer"
elif [ $client_changes -gt 0 ]; then
    if echo "$changed_files" | grep -q "sync"; then
        main_area="synchronization"
    elif echo "$changed_files" | grep -q "lobby"; then
        main_area="lobby system"
    elif echo "$changed_files" | grep -q "api"; then
        main_area="API client"
    elif echo "$changed_files" | grep -q "ui"; then
        main_area="UI"
    else
        main_area="client"
    fi
elif [ $server_changes -gt 0 ]; then
    if echo "$changed_files" | grep -q "redis"; then
        main_area="database"
    elif echo "$changed_files" | grep -q "game-manager"; then
        main_area="game management"
    elif echo "$changed_files" | grep -q "api"; then
        main_area="API endpoints"
    else
        main_area="server"
    fi
fi

# Generate title
if [ "$feature_type" = "feat" ]; then
    title="feat: implement ${main_area} functionality"
elif [ "$feature_type" = "test" ]; then
    title="test: add tests for ${main_area}"
elif [ "$feature_type" = "docs" ]; then
    title="docs: update ${main_area} documentation"
else
    title="chore: update ${main_area}"
fi

# Generate branch name
branch_name=$(echo "$title" | sed 's/: /-/g' | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')

# Generate detailed changes list
echo -e "\n${GREEN}Generating PR content...${NC}\n"

# Analyze specific changes
changes_list=""
if [ $client_changes -gt 0 ]; then
    changes_list="${changes_list}- Implemented client-side components ($client_changes files)\n"
fi
if [ $server_changes -gt 0 ]; then
    changes_list="${changes_list}- Implemented server-side components ($server_changes files)\n"
fi
if [ $shared_changes -gt 0 ]; then
    changes_list="${changes_list}- Updated shared types and utilities ($shared_changes files)\n"
fi
if [ $test_changes -gt 0 ]; then
    changes_list="${changes_list}- Added comprehensive test coverage ($test_changes test files)\n"
fi
if [ $doc_changes -gt 0 ]; then
    changes_list="${changes_list}- Updated documentation ($doc_changes files)\n"
fi

# Check for specific features
if echo "$changed_files" | grep -q "game-sync-manager"; then
    changes_list="${changes_list}- Real-time game state synchronization (100ms interval)\n"
fi
if echo "$changed_files" | grep -q "game-api-client"; then
    changes_list="${changes_list}- API client with retry logic and error handling\n"
fi
if echo "$changed_files" | grep -q "lobby-manager"; then
    changes_list="${changes_list}- Lobby system with player list and countdown\n"
fi
if echo "$changed_files" | grep -q "redis-storage"; then
    changes_list="${changes_list}- Redis storage with batch operations and TTL management\n"
fi
if echo "$changed_files" | grep -q "compression"; then
    changes_list="${changes_list}- Data compression for network optimization\n"
fi

# Output results
echo -e "${YELLOW}Branch name:${NC} $branch_name"
echo -e "${YELLOW}PR title:${NC} $title"
echo ""
echo -e "${YELLOW}Changes:${NC}"
echo -e "$changes_list"

# Export for use in Makefile
echo "$branch_name" > /tmp/pr_branch_name
echo "$title" > /tmp/pr_title
echo -e "$changes_list" > /tmp/pr_changes

echo -e "\n${GREEN}PR content generated successfully!${NC}"
