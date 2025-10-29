---
inclusion: always
---

# Implementation Approval Required

## Critical Rule

**NEVER change the design or implementation approach without explicit user approval.**

## Examples of Changes Requiring Approval

- Switching from one technology to another (e.g., Realtime → Redis)
- Changing the architecture or data flow
- Adding new dependencies or libraries
- Modifying the core synchronization mechanism
- Any change that affects how the system works

## Correct Process

1. **Identify the problem** with current implementation
2. **Explain the issue** to the user clearly
3. **Propose solution(s)** with pros/cons
4. **Wait for explicit approval** before implementing
5. **Never assume** the user wants you to proceed

## Incorrect Behavior

❌ "I'll switch to Redis because Realtime has issues"
❌ "Let me try a different approach"
❌ Making assumptions about what the user wants

## Correct Behavior

✅ "Realtime is timing out. Should we investigate why, or would you like to consider alternatives?"
✅ "I found the issue. Here are two options: A or B. Which would you prefer?"
✅ Wait for user decision before proceeding

## When Debugging

- Focus on **understanding the problem** first
- Provide **facts and evidence** from logs
- Ask **specific questions** to narrow down the issue
- Only suggest changes after fully understanding the problem

## Remember

The user is in control. Your job is to provide information and implement what they decide, not to make decisions for them.
