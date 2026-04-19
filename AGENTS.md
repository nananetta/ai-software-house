# AI Software House Startup

This folder defines the operating model for our multi-agent software house.

## Company Structure

```text
ai-software-house/
├── README.md
├── company/
│   ├── operating-model.md
│   └── org-chart.md
├── products/
│   ├── README.md
│   └── product-a-is-the-best/
│       ├── README.md
│       ├── context/
│       ├── planning/
│       ├── architecture/
│       ├── implementation/
│       ├── qa/
│       ├── ops/
│       └── handoffs/
├── roles/
│   ├── ceo.md
│   ├── product-manager.md
│   ├── business-analyst.md
│   ├── solution-architect.md
│   ├── tech-lead.md
│   ├── backend-developer.md
│   ├── frontend-developer.md
│   ├── qa-test-engineer.md
│   └── devops-platform-engineer.md
├── playbooks/
│   ├── delivery-lifecycle.md
│   ├── communication-rules.md
│   └── decision-rules.md
└── templates/
    └── handoff-template.md
```

## Purpose

Use these files as the standing operating manual for how our AI agent company works.

- The human user is the CEO.
- Each agent has a defined role, scope, inputs, outputs, and boundaries.
- Work should flow through clear handoffs rather than uncontrolled free-for-all collaboration.
- Every new product must live under `products/<product-slug>/`.
- Product-specific files should stay inside that product folder rather than being spread across the repo.

## Recommended Delivery Style

Use a hybrid approach:
- **Agile for delivery and iteration**
- **Lightweight waterfall inside each phase for clarity of handoffs**

That means:
- PM and BA refine requirements first
- Architect defines the solution shape
- Tech Lead breaks work into implementation tasks
- Developers build
- QA validates
- DevOps packages and deploys

## Default Team Flow

CEO → PM / BA → Solution Architect → Tech Lead → Developers → QA → DevOps → CEO

## Product Repository Convention

Every new product build should be created under:

```text
products/<product-slug>/
```

Example:

```text
products/product-a-is-the-best/
```

Use lowercase kebab-case slugs for product folders. Keep all product-related context, planning notes, architecture, implementation assets, QA outputs, and operational material inside that folder.

## How To Read This Repository

When using this repository as operating context:

- Read all files under `playbooks/` as the working guidelines for how the company should operate day to day.
- Refer to all files under `company/` for the organization overview, including org chart and operating model.
- Refer to all files under `roles/` as the role definitions for each agent in the company.

Interpret the folders this way:

- `playbooks/`: execution rules, delivery flow, communication rules, and decision rules
- `company/`: company-level structure and operating model
- `roles/`: agent responsibilities, boundaries, expected outputs, and collaboration scope

When acting as or coordinating agents, use the relevant role file in `roles/` together with the company context in `company/` and the working rules in `playbooks/`.

## Standard Development Practices

Treat the following as default product standards unless a product-specific decision says otherwise:

- CORS configuration must support the actual frontend origin used by the delivered app, not only local dev defaults
- full-stack products should have a single Docker deliverable and a simple startup script such as `run.sh`
- cookie-based or refresh-token-based authentication should preserve the session across browser refresh when credentials are still valid

## Sub-Agent Orchestration

When work is split across multiple agents, treat this repository as a role-driven multi-agent system rather than a pool of generic helpers.

### Role Assignment Rules

- Assign each sub-agent exactly one primary role from `roles/`
- Give the sub-agent the matching role file as its operating contract
- Also give the sub-agent the relevant company-wide context from `company/` and `playbooks/`
- Keep decision ownership aligned with `playbooks/decision-rules.md`
- Keep communication and handoffs aligned with `playbooks/communication-rules.md` and `templates/handoff-template.md`

### Default Orchestration Flow

Use this role sequence unless the task clearly does not require every role:

CEO → Product Manager / Business Analyst → Solution Architect → Tech Lead → Backend / Frontend Developers → QA / Test Engineer → DevOps / Platform Engineer

### Sub-Agent Prompting Standard

When creating a sub-agent, include:

- the assigned role name
- the path to the role file under `roles/`
- the relevant product path under `products/<product-slug>/`
- the required inputs and expected outputs for that role
- boundaries the sub-agent must not cross
- the next role or handoff target

### Orchestrator Expectations

The coordinating agent should:

- read `company/` for org-chart and operating-model context
- read `playbooks/` for workflow, communication, and decision rules
- read `roles/` to map responsibilities to sub-agents
- avoid giving multiple sub-agents overlapping ownership unless collaboration is intentional
- require handoff-style outputs instead of unstructured progress updates
- treat role files as binding operating instructions for each assigned sub-agent
- inspect the current product state before spawning sub-agents
- continue orchestration until the relevant role coverage is complete, even if agent-thread limits require waiting, closing completed agents, and spawning remaining roles in stages
- synthesize completed role handoffs into one prioritized summary instead of stopping at the first sub-agent result
- default to producing an action plan with owners and next handoff targets after collecting the role outputs

### Example Delegation Pattern

- assign requirements clarification to `roles/product-manager.md` and `roles/business-analyst.md`
- assign system shape to `roles/solution-architect.md`
- assign work breakdown and coordination to `roles/tech-lead.md`
- assign implementation to `roles/backend-developer.md` and `roles/frontend-developer.md`
- assign validation to `roles/qa-test-engineer.md`
- assign packaging and runtime delivery to `roles/devops-platform-engineer.md`
