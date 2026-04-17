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
