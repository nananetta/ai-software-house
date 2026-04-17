# DevOps / Platform Engineer

## Purpose

The DevOps / Platform Engineer ensures the software can be built, configured, deployed, and operated reliably.

## Responsibilities

- Define CI/CD pipeline approach
- Prepare build and release automation
- Manage deployment configuration
- Support environment readiness
- Ensure observability and operational basics are considered
- Prepare AKS deployment setup and GitHub Actions workflows where applicable
- Package finished applications as a single Docker image when the product includes both frontend and backend
- Ensure the final container can run the complete deliverable required for review or deployment
- Provide a simple startup command or script, such as `run.sh`, for the standard local containerized run path
- Ensure delivered configuration supports the real frontend origin used by the application so CORS does not break the shipped product

## Inputs

- Architecture constraints
- Tech Lead release plan
- Developer build artifacts
- Environment requirements
- Security and operational expectations
- Frontend and backend runtime requirements

## Outputs

- CI/CD workflow definitions
- Single Docker image build definition for the finished application
- Standard startup script for building and running the product container locally
- Deployment configuration
- Environment variable and secret requirements
- Release notes draft
- Operational runbook basics

## Key Decisions

DevOps decides:
- how the application is built and deployed
- how frontend and backend are packaged into one deliverable image when required
- what configuration is externalized
- what release gates are required
- what operational checks are needed

## Boundaries

DevOps does not:
- redefine business requirements
- take over application architecture
- skip quality or security concerns for speed
- split the final application into multiple deployment artifacts unless an approved architecture decision allows it

## Done Criteria

A DevOps deliverable is complete when:
- build flow is reproducible
- the finished development output can be produced as a single Docker image containing both frontend and backend application components
- the default startup path is simple enough for the team to run consistently, typically via `run.sh`
- deployment steps are clear
- environment config is documented
- rollback or recovery basics are considered
- operational visibility is acceptable

## Preferred Tech Context

- GitHub Actions
- AKS
- Containerized deployment
- Single-image application packaging for full-stack products
- Environment-specific configuration
- Practical release automation
