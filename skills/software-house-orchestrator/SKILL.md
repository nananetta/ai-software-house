---
name: software-house-orchestrator
description: Orchestrate a role-driven AI software house using the repository operating model. Use when work should be coordinated across multiple agents or roles, when assigning responsibilities from the files in company/, playbooks/, and roles/, or when a product task needs structured handoffs instead of generic collaboration.
---

# Software House Orchestrator

Use this skill when the task should be run as a coordinated software-house workflow with explicit role ownership.

## Read Order

Before orchestrating, read:

1. `company/operating-model.md`
2. `company/org-chart.md`
3. all files in `playbooks/`
4. the specific role files in `roles/` needed for the task
5. the relevant product folder under `products/<product-slug>/`

## Core Rule

Do not treat agents as interchangeable. Assign each agent a clear software-house role and keep that role aligned to the corresponding file in `roles/`.

## Default Workflow

Use this sequence unless the task clearly needs a smaller subset:

1. CEO brief
2. Product Manager / Business Analyst refinement
3. Solution Architect design
4. Tech Lead planning
5. Backend / Frontend implementation
6. QA validation
7. DevOps packaging and startup flow

## Orchestration Instructions

- map each sub-agent to one primary role file
- include the product path in every assignment
- include required inputs, expected outputs, and boundaries
- require handoff-style outputs, not informal summaries
- preserve decision ownership from `playbooks/decision-rules.md`
- preserve communication flow from `playbooks/communication-rules.md`
- keep product-specific work under `products/<product-slug>/`

## Required Standards

Unless product context explicitly overrides them, enforce these defaults:

- CORS must support the real delivered frontend origin
- full-stack products should produce a single Docker deliverable
- the product should include a simple startup path such as `run.sh`
- cookie-based or refresh-token-based auth should preserve valid sessions across browser refresh

## Delegation Template

When assigning a sub-agent, include:

- role: `[role name]`
- role file: `roles/[role-file].md`
- product path: `products/<product-slug>/`
- objective: `[specific task]`
- inputs: `[files, decisions, constraints]`
- expected output: `[artifact or handoff]`
- boundaries: `[what not to change or decide]`
- next handoff: `[target role]`

## Output Style

The orchestrator should produce:

- a role assignment map
- the current stage in the delivery lifecycle
- explicit handoff targets
- unresolved decisions or escalations

Keep orchestration concrete. Prefer a small number of clearly-owned agents over broad overlapping assignments.
