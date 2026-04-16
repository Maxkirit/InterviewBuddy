# UML Syntax
### Actors
interact with the system and its objects
### synchronous calls
full arrow one way and dotted line other way for response
### asynchronous calls
full arrow one way

## sign up flow

```mermaid
sequenceDiagram
    actor user as User
    participant client as Client
    participant 3rd as 3rd Party Auth Server
    participant api as API Gateway
    participant auth as Authentication_ Service
    participant user_svc as User Management Service

    alt Internal user registration
        user->>client: sign up with email
        client->>api: createUser(email, password, name, surname)
        api->>auth: createUserAuth(email, password, name,surname)
        auth->>auth: checkRegistration(email), checks if email already in use

        alt account already exists
            auth->>api: 409 Conflict
            api->>client: 409 Conflict
            client->>user: acoount exists, try login
        end



    else 3rd Party registration w/ OIDC 
        user->>client: continue with Google
        client->>api: 3rd party auth request
        api-->>client: redirection
        client-->>user: 3rd party login window
        user->>client: login with 3rd party account
        client->>3rd: login
        3rd->>3rd: validate login attempt
        Note over 3rd: login failed logic
        3rd->>api: id token
        api->>auth: sub, name, surname(3rd party authenticator)
        auth->>auth: check if user doesnt exist
        Note over auth: if user exists, follow auth flow logic
    end

    auth->>auth: create auth table entry
    auth->>user_svc: createUser(auth_id, name, surname)
    Note over user_svc: If failure for any reason<br/>retry and timeout logic?
    user_svc-->>auth: 201  Created, user_id
    auth->>auth: create access token
    auth-->>api: 201 Created, access & refresh token, user_id
    api->>api: cache user_id
    api-->>client: 201 Created, tokens (set-cookie, httpOnly, SameSite, Secure)
    client-->>user: complete your profile page
    user->>client: completes user profile
    client->>api: user_info
    Note over api: token validation logic
    api->>user_svc: setUserInfo(user_id, user_info)
    user_svc-->>api: 204 Updated succesfully + is_recruiter
    api-->>client: 204 Updated successfully + is_recruiter
    client-->>user: profile updated
```