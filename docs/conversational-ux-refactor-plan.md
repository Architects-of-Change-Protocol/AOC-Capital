# PMFreak Conversational-First UX Refactor Plan

## Updated layout architecture

- **Left sidebar (persistent workspace context):** Projects, Stakeholders, Timeline, Risks, Decisions, Documents.
- **Center column (primary):** Always-on chat canvas, conversation history, nudges, input composer, drag/drop uploads.
- **Right panel (optional ambient intelligence):** Context memory snippets, blocker signals, extracted tasks, stakeholder alerts.
- **Principle:** Any structured capability should enrich chat understanding, not force users into a separate workflow.

## Static/menu-driven UX patterns to remove or reduce

- Heavy prompt grids that feel like scenario selection.
- Mode switching as a required pre-step to asking a question.
- Card-first pages that push users to “choose analysis type” before speaking.
- Enterprise upload flows that feel detached from conversation.

## Component refactor plan

1. Make `/copilot` the center of gravity and conversational default entry point.
2. Convert rigid prompt menus into lightweight “quick nudges.”
3. Move project/methodology selectors into compact context chips/controls.
4. Add drag/drop + attachment affordance directly in chat composer area.
5. Add right-panel ambient context cards (read-only summaries surfaced from backend state).
6. Keep backend APIs/data models intact; adjust only surface interaction model.

## Visual hierarchy improvements

- Increase whitespace around message stream and input composer.
- Reduce nested card density and border-heavy treatment.
- Keep left navigation simple and predictable; no dense status dashboards by default.
- Use subtle text and color for nudges/context to avoid stealing focus from chat.
- Make chat bubbles and message stream the strongest visual rhythm.

## Implementation roadmap

### Phase 1 (completed in this refactor)
- Update navigation information architecture to conversational workspace taxonomy.
- Refactor Copilot UI to chat-first layout with optional ambient context panel.
- Add drag/drop and attachment behavior tied to upload API.

### Phase 2
- Persist file upload events and extracted entities directly into conversation timeline.
- Replace static ambient placeholders with live signals from project-state APIs.
- Introduce project memory timeline and decision ledger snippets in right panel.

### Phase 3
- Add proactive in-thread insights (inline citations, risk pulse, ownership detection).
- Add session-to-session memory continuity controls (what the copilot should remember/forget).
- Add contextual retrieval indicators to increase trust without exposing backend complexity.

## Production-ready recommendations

- Keep every advanced feature accessible via natural language first.
- Treat modules (risks, stakeholder intel, meetings) as context sources, not user workflows.
- Maintain single canonical chat experience that gracefully accepts uploads, updates, and follow-ups.
- Add analytics around “time-to-first-meaningful-answer” and “flow interruption rate” to validate UX shift.
