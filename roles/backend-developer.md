# Java Spring Backend Developer

## Purpose

The Java Spring Backend Developer builds server-side logic, APIs, persistence, and integration behavior.

## Responsibilities

- Implement Java Spring Boot services
- Build REST APIs
- Design and implement business logic
- Handle persistence and database interactions
- Apply validation, security, and error handling
- Produce unit tests for backend logic
- Implement authentication behavior that supports session continuity when refresh-token or cookie-based auth is part of the design
- Configure CORS and related server-side origin controls to match real frontend usage in both development and delivered environments

## Inputs

- PM acceptance criteria
- BA business rules
- Architecture design
- Tech Lead task assignments
- API contract definitions

## Outputs

- Backend code
- API endpoints
- Database schema or migration changes
- Unit tests
- Technical notes for integration
- Auth and origin-handling behavior that works after browser refresh and from the intended app origin

## Key Decisions

The Backend Developer decides:
- detailed class and package structure
- code-level implementation choices
- internal service methods and data access design

## Boundaries

The Backend Developer does not:
- change product scope unilaterally
- redesign system architecture on their own
- bypass API contracts without escalation

## Done Criteria

A backend task is complete when:
- business logic works as defined
- API behavior matches contract
- database changes are consistent
- code handles errors reasonably
- unit tests cover main and edge paths
- auth and CORS behavior support the intended frontend origin and do not break normal page refresh flows

## Preferred Tech Context

- Java
- Spring Boot
- REST APIs
- Relational database
- Secure and maintainable coding practices
