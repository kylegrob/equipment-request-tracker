---
name: requirements-reviewer
description: Compare a feature specification with its implementation and produce an evidence-based requirements review. Use when reviewing whether code meets a feature's documented acceptance criteria, identifying gaps or unsupported behavior, or assessing related data, security, and testing concerns. Read-only unless the user explicitly asks for changes.
---

# Requirements Reviewer

Review the feature specification against the current implementation. This skill is read-only by default: do not edit, create, delete, or format files. Make changes only when the user explicitly asks for implementation or file changes in the current request.

## Review process

1. Identify the feature and read its specification in `docs/` before reviewing implementation. If there are several plausible specifications, choose the one that best matches the requested feature and state which one you used. If no specification can be found, report that limitation and do not invent acceptance criteria.
2. Extract every stated acceptance criterion and relevant requirement. Keep criteria distinct so each can be assessed individually.
3. Trace each criterion into the implementation. Follow relevant event handlers, rendering, storage/business logic, and any related code paths. Check the repository guidance when present.
4. Inspect relevant existing tests and test commands to determine what they cover. Do not run tests or change files unless the user asks you to verify or modify them.
5. Report conclusions with evidence. Cite the specification and code using repository-relative file paths and line numbers (for example, `docs/feature.md:12` and `src/app.js:48-55`). Use precise references for every acceptance-criteria status, gap, unsupported behavior, and material data or security concern. When line numbers are unavailable, cite the file and the relevant named section or symbol, and say that line numbers could not be confirmed.

## Required report

Use these sections in the final review:

### Specification reviewed

Name the specification file and summarize its scope briefly.

### Satisfied acceptance criteria

List each criterion that the implementation satisfies, with citations to both the specification and the implementing code. If none are fully satisfied, say so.

### Gaps

List criteria that are missing, incomplete, or only partly implemented. Explain what is missing and cite the requirement and relevant implementation evidence. Do not mark behavior satisfied based only on a UI control or label; trace the behavior it is meant to provide.

### Unsupported behavior

Identify implementation behavior that is not supported by the specification or that conflicts with it. Cite the specification scope and the code path. Do not call a reasonable implementation detail unsupported unless the spec constrains or excludes it.

### Data or security concerns

Report concrete risks to existing data, validation, user-provided content, storage compatibility, privacy, or security. Cite the relevant code and, when applicable, the specification. If none were found in the reviewed paths, say that explicitly and note any scope limits.

### Tests still needed

List acceptance criteria and important edge cases not covered by existing tests. Cite existing test files or explain that no relevant tests were found. Separate missing test coverage from implementation gaps; a missing test does not by itself prove a feature is broken.

## Reporting standards

- Distinguish confirmed facts from inferences and unknowns.
- Prefer concise, specific findings over general advice.
- Do not claim that a criterion passes unless the cited code demonstrates the required behavior across its relevant path.
- Keep data migration and backwards compatibility visible when storage formats or persisted records are affected.
- Flag unsafe rendering of user-provided content and cite the exact rendering path.
- Do not make edits, propose a patch as if applied, or claim tests were run when they were not.
