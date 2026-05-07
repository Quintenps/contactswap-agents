# Feature: API Health Endpoint

> Minimal endpoint to verify the API is up.

**Status:** Done  
**Assigned:** Copilot  
**Parent:** SPEC.md -> Technical Architecture  
**Depends On:** None

## Goal

Setup the API and create an endpoint to verify the API is up

## Scope

### In

- Setup the API
- Create an endpoint
- Verify the endpoint works correctly
- Be sure to follow the technologies specified in the spec

## Acceptance Criteria

- [x] AC1: The API is created in src/api
- [x] AC2: The API is created using Hono
- [x] AC3: And endpoint /health is created and returns a 200
- [x] AC4: It needs to be compatible with Cloudflare worker