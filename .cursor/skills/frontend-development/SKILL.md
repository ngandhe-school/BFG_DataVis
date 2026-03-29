---
name: frontend-development
description: Build and validate frontend changes for this React + Vite project, including UI behavior, component updates, styling, and browser-level verification. Use when the user asks for frontend features, UI fixes, layout work, interaction updates, or React component changes.
---

# Frontend Development Workflow

## Scope

Use this skill for frontend requests touching:
- `src/App.jsx`
- `src/components/`
- `src/hooks/`
- `src/styles.css`
- `src/tailwind.css`

## Quick start

1. Identify the UI flow and files impacted.
2. Pick a clear UI direction before coding (visual and interaction intent).
3. Implement the smallest coherent React/CSS change.
3. Run a fast verification pass (`npm run build` at minimum).
4. Validate user-facing behavior with Playwright CLI.
5. Report what changed, what was validated, and any remaining risk.

## UI direction first (commonly used pattern)

Before coding, state:
- Purpose: what user problem this screen solves.
- Tone: restrained, editorial, bold, playful, technical, etc.
- Constraints: responsiveness, accessibility, and performance limits.
- Differentiation: one memorable UI detail for this task.

Then implement code that is functional, polished, and cohesive with one clear direction.

## Implementation defaults (React + UI)

- Prefer composable React components over large inline blocks.
- Keep state close to the component that owns it unless shared across screens.
- Reuse existing naming and structure from `src/components/screens/`.
- Avoid introducing new dependencies unless required.
- Keep styles consistent with existing CSS tokens and layout patterns.
- Extract complex JSX conditionals into named booleans.
- Pass callbacks via `onX` props; do not pass raw state setters when avoidable.
- Derive computed values during render or `useMemo`; avoid syncing props to state with `useEffect`.
- Avoid `useEffect` for event actions when handler-based logic is sufficient.

## Accessibility baseline (commonly used pattern)

- Use semantic HTML before ARIA.
- Ensure keyboard navigation works for interactive elements.
- Keep visible focus states for buttons, inputs, and links.
- Verify contrast remains readable in the changed UI.
- Prefer explicit labels and accessible names over placeholder-only inputs.

## Validation checklist

Copy and use this checklist for frontend changes:

```markdown
Frontend task progress:
- [ ] Define UI direction (purpose, tone, constraints)
- [ ] Implement component/style change
- [ ] Run `npm run build`
- [ ] Open app and verify primary flow
- [ ] Verify basic keyboard and focus behavior
- [ ] Capture at least one snapshot
- [ ] Capture at least one screenshot
- [ ] Check browser console/network if behavior is unexpected
```

## Playwright CLI workflow for this repo

Prefer project scripts:

```bash
npm run pw:open
npm run pw:snapshot
npm run pw:screenshot
npm run pw:console
npm run pw:network
npm run pw:close
```

Fallback for macOS socket issues:

```bash
npm run pw:open:fallback
```

## Frontend acceptance criteria

A frontend change is complete only when:
- The app builds successfully.
- The requested UI behavior is visible in browser testing.
- Basic accessibility checks pass (semantic structure, focus, keyboard).
- At least one `snapshot` and one `screenshot` are captured.
- No obvious console errors are introduced in the changed flow.

## Source patterns adopted

This workflow mirrors commonly used public skill patterns from:
- Anthropic official `frontend-design` skill.
- Anthropic official `webapp-testing` skill.
- Community `writing-react` and `frontend-patterns` style skills.

## Additional resources

- For project setup and architecture, see [`README.md`](../../../README.md).
- For browser automation policy, see [`playwright-cli-workflow.mdc`](../../rules/playwright-cli-workflow.mdc).
- For external source links used to build this skill, see [`references.md`](references.md).
