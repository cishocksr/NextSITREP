# Auth Java Beginner Guide

This guide explains the Java backend pieces involved when a user registers, logs in, stays logged in, and logs out.

The big idea: the frontend sends email/password to the backend. The backend verifies the user, creates a JWT, puts that JWT into an HttpOnly cookie, and later reads that cookie to know who the user is.

## Files Involved

| File | Job |
| --- | --- |
| `backend/src/main/java/com/veteransconnect/controller/AuthController.java` | Handles `/register`, `/login`, `/logout`, `/me`, and `/csrf` auth endpoints. |
| `backend/src/main/java/com/veteransconnect/config/SecurityConfig.java` | Defines which routes are public, which require login, CORS, CSRF, cookies, and the security filter chain. |
| `backend/src/main/java/com/veteransconnect/security/JwtAuthenticationFilter.java` | Runs on every request and checks whether the request has a valid JWT cookie/header. |
| `backend/src/main/java/com/veteransconnect/security/JwtService.java` | Creates JWTs and validates existing JWTs. |
| `backend/src/main/java/com/veteransconnect/security/CustomUserDetailsService.java` | Loads a user from the database in the shape Spring Security expects. |
| `backend/src/main/java/com/veteransconnect/dto/AuthResponse.java` | JSON response sent back after login/register/me. Does not include the JWT itself. |
| `backend/src/main/java/com/veteransconnect/dto/LoginRequest.java` | The login request body: email and password. |
| `backend/src/main/java/com/veteransconnect/dto/UserRegistrationRequest.java` | The registration request body: name, email, password, branch, zip code. |
| `backend/src/main/java/com/veteransconnect/service/UserServiceImpl.java` | Creates users, hashes passwords, and retrieves user data. |

## The Short Version

When a user signs up:

1. Frontend sends `POST /api/v1/auth/register`.
2. `AuthController.register()` receives the request.
3. `UserServiceImpl.registerUser()` creates the user and stores a hashed password.
4. `CustomUserDetailsService` loads the new user for Spring Security.
5. `JwtService.generateToken()` creates a JWT.
6. `AuthController.addAuthCookie()` puts the JWT in an HttpOnly cookie named `vc_session`.
7. Backend returns an `AuthResponse` with user info.
8. Frontend navigates to the logged-in area.

When a user logs in:

1. Frontend sends `POST /api/v1/auth/login`.
2. `AuthController.login()` receives the request.
3. Spring Security checks the email/password.
4. If valid, `JwtService.generateToken()` creates a JWT.
5. Backend stores the JWT in the `vc_session` cookie.
6. Backend returns user info.
7. Frontend treats the user as logged in.

When a logged-in user makes another request:

1. Browser automatically includes the `vc_session` cookie.
2. `JwtAuthenticationFilter` reads the cookie.
3. `JwtService` validates the JWT.
4. Spring Security marks the request as authenticated.
5. The controller is allowed to run.

## `AuthController.java`

This is the controller for authentication routes.

A controller is a Java class that receives HTTP requests. In this file, the base path is:

```java
@RequestMapping("/api/v1/auth")
```

That means every method inside starts with `/api/v1/auth`.

### `POST /api/v1/auth/register`

This method creates a new account and immediately logs the user in.

Important lines:

```java
@PostMapping("/register")
public ResponseEntity<AuthResponse> register(...)
```

`@PostMapping("/register")` means this method handles a POST request to `/api/v1/auth/register`.

The request body is:

```java
@Valid @RequestBody UserRegistrationRequest request
```

That means:

- `@RequestBody` tells Spring to turn incoming JSON into a Java object.
- `UserRegistrationRequest` is the shape of that JSON.
- `@Valid` tells Spring to run validation rules, like required fields or password rules.

The method then does this:

```java
authRateLimiter.checkAllowed(httpRequest, "register", request.email());
```

This prevents someone from repeatedly hammering the register endpoint.

Then:

```java
UserResponse user = userService.registerUser(request);
```

This creates the user in the database. The service is where password hashing happens.

Then:

```java
UserDetails userDetails = userDetailsService.loadUserByUsername(request.email());
String token = jwtService.generateToken(userDetails);
addAuthCookie(httpResponse, token);
```

This loads the user in Spring Security format, generates a JWT, and stores that JWT in a cookie.

Finally:

```java
return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
```

`201 Created` means the backend successfully created a new user.

### `POST /api/v1/auth/login`

This method logs in an existing user.

The key difference from register is this line:

```java
authenticationManager.authenticate(
    new UsernamePasswordAuthenticationToken(
        request.email(),
        request.password()
    )
);
```

This asks Spring Security: "Does this email/password match a real user?"

If the password is wrong, Spring throws an authentication error. The rest of the method does not run.

If the password is correct, the method creates a JWT and cookie just like registration does.

### `POST /api/v1/auth/logout`

This method clears the auth cookie.

```java
clearAuthCookie(response);
return ResponseEntity.noContent().build();
```

`204 No Content` means the request worked, but there is no JSON body to return.

### `GET /api/v1/auth/me`

This method returns the currently logged-in user.

```java
public ResponseEntity<AuthResponse> me(Principal principal)
```

`Principal` is Spring's way of saying "the authenticated user for this request."

If the JWT cookie is valid, Spring knows who the user is and `principal.getName()` returns their email.

If there is no valid JWT cookie, this endpoint returns `401 Unauthorized`.

### `GET /api/v1/auth/csrf`

This endpoint gives the frontend a CSRF token.

CSRF protection matters because the app uses cookies for auth. The browser sends cookies automatically, so Spring requires a second proof that unsafe requests really came from our frontend.

## `SecurityConfig.java`

This file is the rulebook for backend security.

### Public Routes

These routes do not require an existing login:

```java
.requestMatchers(
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/csrf"
).permitAll()
```

That makes sense because users need to register or log in before they have a token.

### Protected Routes

This line protects everything else:

```java
.anyRequest().authenticated()
```

So routes like saved resources require a valid JWT cookie.

### Stateless Sessions

```java
session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
```

This means the backend does not store login sessions in server memory.

Instead, the JWT cookie proves who the user is on every request.

### CORS

CORS decides which frontend origins can call this backend.

The backend allows the configured frontend origin, commonly:

```text
http://localhost:3000
```

The important setting is:

```java
config.setAllowCredentials(true);
```

This allows the browser to send and receive cookies across frontend/backend origins during development.

### CSRF

The backend enables CSRF protection:

```java
.csrf(csrf -> csrf
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
    .csrfTokenRequestHandler(csrfRequestHandler)
)
```

Because auth is stored in a cookie, Spring wants unsafe requests like POST, PATCH, and DELETE to include an `X-XSRF-TOKEN` header.

## `JwtAuthenticationFilter.java`

This file runs before controllers.

Its job is to inspect every incoming request and ask:

"Does this request have a valid JWT?"

### Step 1: Read the JWT

```java
final String jwt = resolveToken(request);
```

`resolveToken()` checks two places:

1. `Authorization: Bearer ...` header
2. `vc_session` cookie

The browser app mostly uses the cookie.

### Step 2: If There Is No Token

```java
if (jwt == null) {
    filterChain.doFilter(request, response);
    return;
}
```

No token does not automatically mean failure. It might be a public route like login or register.

So the filter lets the request continue. Later, `SecurityConfig` decides whether the route is allowed.

### Step 3: Validate the Token

```java
final String userEmail = jwtService.extractUsername(jwt);
UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
```

The filter extracts the email from the JWT, then loads the matching user from the database.

Then:

```java
if (jwtService.isTokenValid(jwt, userDetails)) {
    ...
}
```

This checks:

- Was the JWT signed by our backend?
- Is it expired?
- Does the email in the token match the database user?

### Step 4: Mark the Request as Logged In

```java
SecurityContextHolder.getContext().setAuthentication(authToken);
```

This is the moment Spring Security considers the request authenticated.

After this, controllers can use `Principal`, and protected routes can run.

## `JwtService.java`

This service creates and checks JWTs.

A JWT has three parts:

```text
HEADER.PAYLOAD.SIGNATURE
```

- Header says what kind of token it is.
- Payload contains data like the user email and expiration time.
- Signature proves the backend created it and nobody changed it.

### Creating a Token

```java
public String generateToken(UserDetails userDetails)
```

This creates a token where the subject is the user's email:

```java
.subject(userDetails.getUsername())
```

The token also gets:

```java
.issuedAt(...)
.expiration(...)
.signWith(getSigningKey())
```

So the JWT says:

- who it belongs to
- when it was created
- when it expires
- proof that our backend signed it

### Validating a Token

```java
public boolean isTokenValid(String token, UserDetails userDetails)
```

This returns true only when:

- the email in the token equals the user's email
- the token has not expired

Parsing the token also verifies the signature.

## `CustomUserDetailsService.java`

Spring Security does not know how to use this app's custom `User` entity by itself.

This service translates from our database user to Spring Security's `UserDetails`.

```java
public UserDetails loadUserByUsername(String email)
```

Even though the method says `Username`, this app uses email as the login name.

The service loads:

```java
User user = userRepository.findByEmail(email)
```

Then returns a Spring Security user:

```java
return org.springframework.security.core.userdetails.User.builder()
    .username(user.getEmail())
    .password(user.getPasswordHash())
    .roles("VETERAN")
    .build();
```

Important: the password here is not plain text. It is the BCrypt password hash from the database.

## `AuthResponse.java`

This is the JSON body returned after:

- register
- login
- me

It includes:

```java
long expiresIn;
UUID userId;
String email;
String firstName;
String lastName;
BranchOfService branchOfService;
String zipCode;
```

It does not include the JWT.

That is intentional. The JWT is stored in an HttpOnly cookie so JavaScript cannot read it.

This is safer because if malicious JavaScript ever ran on the page, it could not steal the JWT from `localStorage`.

## Cookie Login Flow

The backend sets this cookie:

```java
ResponseCookie.from(jwtCookieName, token)
    .httpOnly(true)
    .secure(jwtCookieSecure)
    .sameSite(jwtCookieSameSite)
    .path("/")
    .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
    .build();
```

Meaning:

- `httpOnly(true)`: JavaScript cannot read the cookie.
- `secure(...)`: in production, only send over HTTPS.
- `sameSite(...)`: controls cross-site cookie behavior.
- `path("/")`: send cookie to all backend routes.
- `maxAge(...)`: cookie expires when the JWT expires.

## Why Login Might Appear to Bounce Back

The Java backend can successfully log in a user and still the frontend can appear logged out if the frontend state gets cleared.

The backend's job is:

1. verify credentials
2. set the cookie
3. return user data

The frontend's job is:

1. save enough user data for the UI
2. navigate to a protected page
3. call `/me` to rehydrate from the cookie
4. redirect to `/login` if it thinks there is no user

So a bounce back to login can happen if:

- the cookie was not stored by the browser
- CORS credentials are wrong
- CSRF token handling fails
- the frontend calls `/me` before/after auth and clears fresh user state
- `/home` or another protected route checks auth before the provider finishes loading

The recent frontend fix guards against a stale `/me` response clearing a newer successful login/register.

## Beginner Glossary

### Controller

A Java class that receives HTTP requests and returns HTTP responses.

### DTO

"Data Transfer Object." A small object used to move data in or out of an API.

### Service

A class that holds business logic, like creating users or generating JWTs.

### Repository

A class/interface that talks to the database.

### JWT

"JSON Web Token." A signed string that proves the backend logged in a user.

### Cookie

Small data the browser stores and sends with requests.

### HttpOnly Cookie

A cookie JavaScript cannot read. This is safer for auth tokens.

### CSRF

"Cross-Site Request Forgery." A browser attack where another site tries to make requests using your cookies. CSRF tokens help stop that.

### CORS

"Cross-Origin Resource Sharing." Browser rules for whether one origin, like `localhost:3000`, can call another origin, like `localhost:8080`.

### Principal

Spring's object representing the currently authenticated user.

### SecurityContext

Spring Security's per-request storage for "who is logged in right now?"

## Mental Model

Think of the JWT cookie like a wristband at an event:

1. Register/login is the front desk checking your identity and giving you a wristband.
2. The browser stores the wristband as a cookie.
3. Every protected backend request shows the wristband automatically.
4. `JwtAuthenticationFilter` checks if the wristband is real.
5. If it is real, the user gets access.

