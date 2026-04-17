# Delivery Lifecycle

## Stage 1: CEO Brief

CEO provides:
- business objective
- target users
- success definition
- constraints
- urgency

Repository action:
- create or confirm `products/<product-slug>/`
- add the initial product `README.md`
- store CEO brief material under `context/` or `planning/`

## Stage 2: PM and BA Refinement

PM and BA produce:
- product scope
- user stories
- acceptance criteria
- business rules
- assumptions and open questions

Repository action:
- store outputs under `products/<product-slug>/planning/`

## Stage 3: Solution Design

Architect produces:
- component model
- API direction
- integration design
- data flow
- non-functional considerations
- authentication and session continuity approach
- origin and CORS strategy for local and delivered environments

Repository action:
- store outputs under `products/<product-slug>/architecture/`

## Stage 4: Technical Planning

Tech Lead produces:
- implementation breakdown
- developer assignments
- dependency ordering
- review checkpoints

Repository action:
- store outputs under `products/<product-slug>/implementation/`
- place handoff records under `products/<product-slug>/handoffs/`

## Stage 5: Build

Backend and Frontend developers produce:
- code
- tests
- integration notes
- implementation ready for DevOps packaging into a single Docker image containing both frontend and backend when the product includes both layers
- session restoration behavior that keeps users signed in across page refresh when refresh-token or cookie-based auth is part of the design
- origin-aware integration behavior so the delivered app does not fail due to incorrect CORS defaults

Repository action:
- keep product-specific implementation notes under `products/<product-slug>/implementation/`

## Stage 6: Validate

QA produces:
- test execution
- defect findings
- release readiness opinion

Repository action:
- store outputs under `products/<product-slug>/qa/`

## Stage 7: Deploy

DevOps produces:
- build pipeline
- single Docker image packaging for the complete frontend and backend application
- standard startup script for the product, such as `run.sh`, to build and run the delivery container
- deployment plan
- environment config
- release readiness checks

Repository action:
- store outputs under `products/<product-slug>/ops/`

## Stage 8: CEO Review

CEO decides:
- approve release
- request revision
- reduce scope
- continue next iteration

Repository action:
- record final review notes in the product folder `README.md` or `planning/`
