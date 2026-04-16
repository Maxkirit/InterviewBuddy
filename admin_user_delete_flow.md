# UML Syntax
### Actors
interact with the system and its objects
### synchronous calls
full arrow one way and dotted line other way for response
### asynchronous calls
full arrow one way

## admin delete flow

```mermaid
sequenceDiagram
    actor user as Admin
    participant client as Client
    participant api as API Gateway
    participant auth as Authentication_ Service
    participant user_svc as User Management Service

```