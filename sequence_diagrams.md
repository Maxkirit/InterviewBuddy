# UML Syntax
### Actors
interact with the system and its objects
### synchronous calls
full arrow one way and dotted line other way for response
### asynchronous calls
full arrow one way

## Auth flow

```mermaid

sequenceDiagram
    actor User
    participant Client
    participant API_Gateway
    participant Authentication_svc
    participant User_svc
    participant Backend
    participant 3rd Party Auth Server

    Note over User,3rd Party Auth Server: Authentication Flow
    User->>Client: login (internal account)
    Client->>API_Gateway: userLogin(email, password)
    API_Gateway->>Authentication_svc: requestAuth(email, password)
    Authentication_svc->>Authentication_svc: hash password
    Authentication_svc->>Authentication_svc: verifyCredentials(email, hashed_password)

    alt 3rd Party Authentication (OpenID Connect) (successful)
        User->>Client: login with Google, Github, 42, etc
        Client->>API_Gateway: 3rd party login request
        API_Gateway-->>Client: redirection
        User->>3rd Party Auth Server: login
        3rd Party Auth Server->>3rd Party Auth Server: validates login
        3rd Party Auth Server-->>API_Gateway: id_token
        API_Gateway->>Authentication_svc: sub (3rd party authenticator)
        Authentication_svc->>Authentication_svc: match sub to auth_id
    end
    alt Authentication failed
        Authentication_svc-->>API_Gateway: invalid credentials
        API_Gateway-->>Client: 401 Unauthorized
        Client-->>User: restart sequence
        Note over User: max retry number eventually
    end
    Authentication_svc->>User_svc: matchUserId(auth_id)
    User_svc-->>Authentication_svc: user_info
    Authentication_svc->>Authentication_svc: create access and refresh tokens
    Authentication_svc-->>API_Gateway: access_token, refresh_token
    API_Gateway-->>Client: access_token, refresh_token, 200 OK
    Client->>Client: stores tokens locally (Set-Cookie: httpOnly, Secure, SameSite)
    Client-->>User: logged in

    Note over User,3rd Party Auth Server: Common function flow, access token valid (refresh flow other graph)
    User->>Client: Business logic (start interview, add connection, etc)
    Client->>API_Gateway: request body + access_token
    API_Gateway->>API_Gateway: check format and decode header
    API_Gateway->>Authentication_svc: get signing key (/jwks)
    Authentication_svc-->>API_Gateway: secret_key
    API_Gateway->>API_Gateway: verify signature
    API_Gateway->>API_Gateway: check expiration claim
    
    alt access token expired
        API_Gateway->>Authentication_svc: getNewAccessToken(refresh_token)
        Authentication_svc->>Authentication_svc: matches with version control
        Note right of Authentication_svc: if refresh token expired or invalid, logout user
        Authentication_svc-->>API_Gateway: access_token
        API_Gateway->>API_Gateway: verify signature
        API_Gateway->>API_Gateway: check expiration claim
        API_Gateway->>Client: send new tokens
        Client->>Client: update tokens (Set-Cookie: httpOnly, Secure, SameSite)
    end
    API_Gateway->>Backend: request logic
    Backend->>Backend: microservices each validate<br/>their own permissions baked in tokens
    alt insufficient permissions
        Backend-->>API_Gateway: 403 Forbidden
        API_Gateway-->>Client: 403 Forbidden
    end
    Backend-->>API_Gateway: request response
    API_Gateway-->>Client: 200 OK
    Client-->>User: action done

    Note over User,3rd Party Auth Server: Logout flow
    User->>Client: logout
    Client->>API_Gateway: logout request + access_token
    API_Gateway->>Authentication_svc: invalidateTokens(access_token, refresh_token)
    Authentication_svc->>Authentication_svc: change version_control
    Authentication_svc-->>API_Gateway: 200 OK
    API_Gateway-->>Client: 200 OK
    Client->>Client: clear cookies



```