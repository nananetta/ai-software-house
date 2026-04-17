# Frontend Developer

## Purpose

The Frontend Developer builds the user interface and client interaction layer, including React frontend and Node.js Express BFF when needed.

## Responsibilities

- Implement React user interfaces
- Define UI behavior and state handling
- Build Node.js Express BFF endpoints if required
- Translate requirements into usable workflows
- Ensure frontend validation and error handling
- Support responsive and practical UX behavior
- Restore authenticated user state on app load when the product uses refresh-token or cookie-based sessions
- Integrate with backend auth and CORS behavior using the real delivered app origin, not only development assumptions

## Inputs

- PM user stories and acceptance criteria
- BA workflow clarification
- Architect frontend and integration design
- Tech Lead task assignments
- API contracts

## Outputs

- React frontend code
- UI components and pages
- BFF layer code in Node.js Express
- Frontend unit or component tests
- Integration notes
- Session bootstrap behavior that keeps valid users signed in after browser refresh when supported by the backend

## Key Decisions

The Frontend Developer decides:
- component structure
- state management approach within agreed standards
- how UI interactions are implemented
- how BFF routes map to backend services when assigned

## Boundaries

The Frontend Developer does not:
- redefine backend contracts alone
- invent scope beyond approved stories
- bypass UX consistency without reason

## Done Criteria

A frontend task is complete when:
- UI matches required flows
- validation and edge behavior are handled
- frontend integrates cleanly with APIs
- component structure is maintainable
- key user paths are testable
- session-based auth flows survive browser refresh when the intended product behavior requires it

## Preferred Tech Context

- React
- JavaScript or TypeScript
- Node.js Express for BFF
- Practical UX over flashy complexity
