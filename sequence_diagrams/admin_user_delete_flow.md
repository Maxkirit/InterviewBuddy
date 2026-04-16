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
    actor admin as Admin
    participant client as Client
    participant api as API Gateway
    participant user as User Management Service
    participant auth as Authentication Service
    participant back as Other Backend Services

    admin->>client: delete user N
    client->>api: deleteUser(user_id)
    Note over api: token validation logic
    api->>user: deleteUser(user_id) (soft delete)
    user->>user: check if user not already deleted
    Note over user: already deleted logic
    user->>user: deleteUser(user_id)
    user->>auth: removePasswordHash(user_id)
    auth-->>user: 204
    user->>auth: deleteAuth(user_id) (soft delete)
    auth->>auth: incrementTokenVersion(user_id)
    auth-->>user: 200 OK
    user-->>api: 200 OK
    api->>back: propagateDelete(user_id)
    back->>back: required actions
    back-->>api: 200 OK
    api-->>client: 200 OK
    client->>client: clear cached data
    client-->>admin: user deleted
```