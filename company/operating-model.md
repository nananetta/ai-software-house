# Operating Model

## Company Mission

Operate like a lean software startup that can turn an idea from the CEO into a working product with speed, structure, and quality.

## Core Principles

1. **Clarity before speed**  
   Requirements should be clear enough before engineering starts.

2. **Architecture before implementation**  
   Developers should not invent the system shape on the fly unless explicitly allowed.

3. **Small iterations**  
   Deliver in increments. Avoid giant one-shot outputs.

4. **Structured handoffs**  
   Each role produces outputs for the next role.

5. **Independent review**  
   QA and DevOps should not simply trust prior agents.

6. **CEO decides trade-offs**  
   Scope, time, and quality trade-offs escalate to the CEO.

7. **Deployable product outputs**  
   Finished development outputs should be packageable as a single Docker image containing both frontend and backend unless an approved architecture decision states otherwise.

8. **Production-like defaults**  
   Standard product builds should support the actual app origin in CORS configuration, provide a simple `run.sh` startup path for the single Docker deliverable, and preserve authenticated sessions across browser refresh when refresh-token or cookie-based auth is used.

## Standard Delivery Approach

We use **Agile startup execution with structured role handoffs**.

## Standard Product Practices

Unless an approved product decision states otherwise, new products should follow these defaults:

- CORS configuration must allow the real frontend origin used by the delivered application, not only local development ports
- the final deliverable should include a simple startup script such as `run.sh` that builds and runs the standard single Docker image
- authentication flows using cookies or refresh tokens must restore the user session after a browser refresh instead of forcing a fresh login

### Why not pure waterfall
Pure waterfall is too rigid for AI agents and software startups. It delays feedback and causes bad assumptions to spread.

### Why not pure free-form agile
Purely free collaboration causes duplication, contradictions, and drift.

### Our model
Use:
- short iterative cycles
- clear responsibility per role
- lightweight documentation
- feedback loops after every major deliverable

## Repository Structure Rule

All new product work must be organized under:

```text
products/<product-slug>/
```

Guidelines:
- create one folder per product
- use lowercase kebab-case for folder names
- keep all product-specific context, plans, design docs, handoffs, QA notes, and ops material inside that product folder
- avoid scattering product files across shared top-level directories unless the file is part of the company-wide operating system

Recommended product layout:

```text
products/<product-slug>/
├── README.md
├── context/
├── planning/
├── architecture/
├── implementation/
├── qa/
├── ops/
└── handoffs/
```

## Mandatory Handoffs

1. CEO gives business goal
2. PM and BA convert goal into requirements
3. Architect creates solution design
4. Tech Lead converts design into work items
5. Developers implement
6. QA validates against requirements and edge cases
7. DevOps prepares build, release, and deployment approach
8. CEO reviews outcome and decides next step

Each handoff should be stored in the relevant product folder when it is product-specific.

## Escalation Rules

Escalate to CEO when:
- scope changes materially
- requirements conflict
- architecture adds significant cost or complexity
- release risk is high
- timeline cannot be met
