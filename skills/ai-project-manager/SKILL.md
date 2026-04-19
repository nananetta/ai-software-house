---
name: ai-project-manager
description: Orchestrate a role-driven AI software house using the repository operating model. Use when work should be coordinated across multiple agents or roles, when assigning responsibilities from the files in company/, playbooks/, and roles/, or when a product task needs structured handoffs instead of generic collaboration. Also treat mentions of "ai-pm" as referring to this same skill.
---

# Software House Orchestrator

Use this skill when the task should be run as a coordinated software-house workflow with explicit role ownership.

If the user says `ai-pm`, interpret that as shorthand for this same `ai-project-manager` skill.

## Read Order

Before orchestrating, read:

1. `company/operating-model.md`
2. `company/org-chart.md`
3. all files in `playbooks/`
4. the specific role files in `roles/` needed for the task
5. the relevant product folder under `products/<product-slug>/`

## Core Rule

Do not treat agents as interchangeable. Assign each agent a clear software-house role and keep that role aligned to the corresponding file in `roles/`.

When the user explicitly asks to use `$ai-project-manager`, do not stop at a generic explanation of how the software house could work. Actually run the orchestration workflow for the named product or task.

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

## Standard Execution Pattern

When the user asks to orchestrate work for a product, follow this sequence:

1. Inspect the current product state locally:
   read the relevant `products/<product-slug>/` files before spawning role agents
2. Choose the smallest useful role set for the task:
   if the user asks broadly, default to PM/BA, Architect, Tech Lead, Backend, Frontend, QA, and DevOps
3. Spawn sub-agents by role:
   assign one primary role per sub-agent and give each a bounded handoff-style objective
4. Respect platform limits:
   if concurrent sub-agent limits prevent the full set from starting, wait for completed agents, close them, and spawn the remaining roles instead of stopping early
5. Collect every role handoff:
   do not finalize after the first response unless the user explicitly asks for partial output
6. Synthesize the outputs:
   combine findings into one orchestration summary with priorities, ownership, and next handoff targets
7. Recommend the next execution step:
   typically a Tech Lead action plan, implementation plan, or concrete handoff files

## Required Completion Behavior

When running this skill for an active task, the orchestrator should complete the work in this manner by default:

- inspect the current product before delegating
- spawn role-specific sub-agents when the user asks for sub-agents or role-based orchestration
- continue until the relevant role coverage is complete, even if agent-thread limits require staging the work
- treat completed sub-agent outputs as handoffs to be synthesized, not as the final answer by themselves
- finish with a consolidated summary that includes:
  - role assignment map
  - highest-severity findings or gaps
  - prioritized next actions
  - recommended owner for each action
  - explicit next handoff target

Do not stop at “here is how to use the orchestrator” when the user has actually asked the orchestrator to act.

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
- when applicable, a prioritized Tech Lead-style action plan that turns multi-role findings into executable work

Keep orchestration concrete. Prefer a small number of clearly-owned agents over broad overlapping assignments.
