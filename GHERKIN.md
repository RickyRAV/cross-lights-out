# Lights Out Backlog

Each ticket below has a Gherkin scenario and an assignee. Ricky handles the backend and home lab deployment, plus the mobile app's state management/data-fetching setup, native notification feature, offline caching, and the Login/Register, Leaderboard, and Join Group screens (which build directly on backend endpoints he wrote). Nikola handles the app shell/navigation and the rest of the mobile screens. Either of us can pick up any ticket if the other is stuck.

- Current stack decision: mobile `Expo (React Native)` with `NativeWind` for styling, backend `Fastify + Drizzle + PostgreSQL`, state `Zustand + TanStack Query`
- See `docs/project-specification.md` for the full spec this backlog implements

## LO-1 Define implementation stack and architecture

**Assignee: Ricky & Nikola (joint)**

```gherkin
Feature: Lights Out implementation stack and architecture

  Scenario: The approved implementation stack is documented
    Given the project requirements and team discussion
    When the architecture decision is reviewed
    Then the mobile stack is specified as Expo/React Native with Zustand and TanStack Query
    And the backend stack is specified as a self-hosted API and PostgreSQL

  Scenario: The two external data sources are clearly separated
    Given the app needs both public race data and shared multiplayer state
    When the architecture is documented
    Then Jolpica-F1 is identified as the read-only race data source, called only by our own backend
    And the self-hosted backend is identified as the source of truth for predictions, groups, the leaderboard, and cached race data. The app never calls Jolpica-F1 directly

  Scenario: Follow-up work can implement against a stable baseline
    Given the architecture ticket has been completed
    When engineers create implementation tickets
    Then the technical direction is unambiguous
    And major stack decisions do not need to be re-opened
```

## LO-2 Bootstrap monorepo structure and pnpm workspaces

**Assignee: Ricky**

```gherkin
Feature: Repository bootstrap

  Scenario: The repository is restructured for two-app development
    Given the repository currently contains only a flat Expo starter
    When the bootstrap work is completed
    Then the repository contains apps/mobile and apps/api directories
    And a root pnpm-workspace.yaml ties them together

  Scenario: Shared engineering standards are established
    Given multiple engineers will work in the repository
    When the baseline configuration is added
    Then formatting/linting configuration is present
    And environment templates and ignore rules are present
```

## LO-3 Self-hosted Postgres + API skeleton and home-lab deployment

**Assignee: Ricky**

```gherkin
Feature: Backend service skeleton and deployment

  Scenario: The backend project is initialized
    Given the self-hosted backend is the chosen stack
    When the backend skeleton is created
    Then the backend can be built and started locally via docker-compose.yml

  Scenario: The backend is deployed hands-off on the home lab
    Given docker-compose.prod.yml is deployed on the home server
    When it is deployed via Coolify and routed through Traefik
    Then the backend and database run continuously without manual intervention
    And both developers' mobile apps can reach the same shared instance during development

  Scenario: Local persistence is provisioned
    Given the project requires PostgreSQL
    When the persistence setup is completed
    Then a local PostgreSQL environment is available for development
    And configuration (connection strings, secrets) is externalized, not hardcoded
```

## LO-4 Backend: friend groups and invite-code auth

**Assignee: Ricky**

_(implements user story 8)_

```gherkin
Feature: Friend groups and lightweight auth

  Scenario: A user can create a friend group
    Given a logged-in user has no group yet
    When they create a group
    Then an invite code is generated for that group

  Scenario: A user can join a group via invite code
    Given a user has received a valid invite code
    When they submit it during onboarding
    Then they are added to that friend group
    And they appear on that group's leaderboard from that point forward

  Scenario: An invalid or reused-incorrectly invite code is rejected
    Given a user submits a code that does not correspond to an active group
    When the join request is processed
    Then the request is rejected with a clear error
    And no group membership is created
```

## LO-5 Backend: sealed predictions endpoints

**Assignee: Ricky**

_(implements user stories 2, 3)_

```gherkin
Feature: Prediction submission and sealing

  Scenario: A user submits a prediction before lockout
    Given the prediction window for a race is open
    When a user submits an ordered list of 5 drivers
    Then the prediction is stored against that user and race
    And it becomes read-only once the lockout timestamp passes

  Scenario: Predictions are sealed before lockout
    Given a race's lockout has not yet passed
    When another group member requests race data
    Then other users' specific picks are never included in the response
    And only a submitted/not-submitted flag per member is returned

  Scenario: Predictions unseal after lockout
    Given a race's lockout has passed
    When a group member requests race data
    Then all group members' predictions for that race become visible
```

## LO-6 Backend: race grading job

**Assignee: Ricky**

_(implements user story 5)_

```gherkin
Feature: Automatic prediction grading

  Scenario: A finished race is graded
    Given a race session has ended
    When the grading job fetches the final classification from Jolpica-F1
    Then every group member's prediction for that race is scored against the actual order
    And points are persisted per user per race

  Scenario: The scoring function is correct
    Given a known predicted order and a known actual order
    When the scoring function is run
    Then it returns the expected point total
    And this is covered by unit tests across exact-match, partial-match, and no-match cases

  Scenario: Grading a race twice does not double-count points
    Given a race has already been graded
    When the grading job runs again for that race
    Then existing scores are not duplicated or incorrectly recalculated
```

## LO-7 Backend: season leaderboard endpoint

**Assignee: Ricky**

_(implements user story 6)_

```gherkin
Feature: Season leaderboard

  Scenario: The leaderboard reflects total scored points
    Given one or more races have been graded for a group
    When the leaderboard endpoint is called
    Then group members are ranked by total season points

  Scenario: The leaderboard updates after new results
    Given a new race has just been graded
    When a client requests the leaderboard
    Then the newly graded race's points are already reflected without any manual recalculation step
```

## LO-8a Mobile: Expo app shell and navigation

**Assignee: Nikola**

```gherkin
Feature: Mobile application shell and navigation

  Scenario: The mobile app is initialized
    Given the project uses Expo for the mobile app
    When the app shell is created inside apps/mobile
    Then the application can start locally via Expo Go and an emulator

  Scenario: Navigation structure is in place
    Given the shell exists
    When an engineer inspects the navigation
    Then Predict, Leaderboard, History, and Settings are reachable as tabs via Expo Router
    And Race Detail is reachable as a stack screen from Predict
```

## LO-8b Mobile: state management and data-fetching setup

**Assignee: Ricky**

```gherkin
Feature: Mobile state and data libraries

  Scenario: State libraries are wired
    Given the app needs both local UI state and server data
    When the store and query client are set up
    Then Zustand manages local/UI state (in-progress prediction draft, auth session)
    And TanStack Query manages all server data with caching, backed by hooks that wrap every call to the backend API

  Scenario: Screens consume data only through hooks
    Given the query client is configured
    When a screen needs data from the backend
    Then it calls a TanStack Query hook, never `fetch` directly
```

## LO-9 Mobile: race calendar and countdown

**Assignee: Nikola**

_(implements user story 1)_

```gherkin
Feature: Race calendar display

  Scenario: The next race is shown with a countdown
    Given the Predict screen is opened
    When race data is fetched from our own API
    Then the next race's name, date, and a live countdown to lockout are displayed

  Scenario: Loading and error states are handled
    Given the race data request is in flight or fails
    When the Predict screen renders
    Then a loading state or a clear error state is shown instead of a blank screen
```

## LO-10 Mobile: prediction submission flow

**Assignee: Nikola**

_(implements user story 2)_

```gherkin
Feature: Prediction submission UI

  Scenario: A user builds and submits a prediction
    Given the prediction window is open
    When the user orders 5 drivers and confirms
    Then the prediction is sent to the backend
    And the UI switches to a sealed "already submitted" state

  Scenario: A submitted prediction cannot be edited after lockout
    Given the lockout has passed
    When the user reopens the Predict screen
    Then their prediction is shown as locked, not editable
```

## LO-11 Mobile: friend submission status

**Assignee: Nikola**

_(implements user story 3)_

```gherkin
Feature: Friend submission status

  Scenario: Submission status is visible before lockout
    Given the prediction window is open
    When the user views Race Detail
    Then each group member's submitted/not-submitted status is shown
    And no member's actual picks are shown before lockout
```

## LO-12 Mobile: lockout reminder notification

**Assignee: Ricky**

_(implements user story 4)_

```gherkin
Feature: Lockout reminder notifications

  Scenario: Notification permission is requested correctly
    Given the app is opened for the first time
    When the notification permission flow runs
    Then the user is asked to grant permission
    And the granted/denied/undetermined states are all handled without crashing

  Scenario: A reminder fires before lockout
    Given permission is granted and the user has not yet predicted
    When the lockout enters the configured reminder window
    Then a local notification is delivered on Android

  Scenario: The reminder warns about a prediction that hasn't been sent
    Given the user submitted a prediction offline and it is still waiting to send
    When the lockout enters the configured reminder window
    Then the notification says the prediction hasn't been sent yet

  Scenario: The app remains usable without notification permission
    Given the user denied notification permission
    When they use the Predict screen
    Then the in-app countdown is still visible and predictions can still be submitted
```

## LO-13 Mobile: leaderboard screen

**Assignee: Ricky**

_(implements user story 6)_

```gherkin
Feature: Leaderboard screen

  Scenario: Group standings are displayed
    Given the leaderboard endpoint returns ranked members
    When the Leaderboard screen is opened
    Then members are shown ranked by total season points
```

## LO-14 Mobile: personal history screen

**Assignee: Nikola**

_(implements user stories 7 and 9)_

```gherkin
Feature: Personal prediction history

  Scenario: Past predictions are listed with results
    Given the user has predictions from past races
    When the History screen is opened
    Then each past race shows the user's prediction, the actual result, and points earned
```

## LO-15 Mobile: offline caching and queued submissions

**Assignee: Ricky**

_(implements user story 7)_

```gherkin
Feature: Offline behavior

  Scenario: Cached data remains browsable offline
    Given the app has previously loaded data while online
    When the device loses connectivity
    Then the calendar, history, and last-synced leaderboard remain viewable
    And a "last updated" indicator is shown instead of a blank or broken screen

  Scenario: A prediction submitted offline is sent automatically
    Given the device has no network connection
    When the user submits a prediction
    Then it is queued on the device and shown as "waiting to send"
    And it is sent automatically once the device is back online

  Scenario: A queued prediction survives an app restart
    Given a prediction is waiting to send
    When the app is closed and reopened
    Then the prediction is still queued and is sent once the device is online

  Scenario: A queued prediction misses lockout
    Given a prediction is waiting to send
    When the device only comes back online after the race's lockout
    Then the prediction is not sent
    And the user is told it didn't count because they were offline until after lockout
```

## LO-16 Mobile: create or join friend group onboarding

**Assignee: Ricky**

_(implements user story 8)_

```gherkin
Feature: Create or join friend group onboarding

  Scenario: A user joins via invite code
    Given a user has just registered and is not in a group yet
    And they have a valid invite code
    When they enter it on the onboarding screen
    Then they are added to the group
    And the group's leaderboard becomes visible to them

  Scenario: A user creates a group and shares it
    Given a user has just registered and is not in a group yet
    When they create a group
    Then its invite code is shown with a way to copy or share it
    And they continue into the app afterwards

  Scenario: A returning user skips onboarding
    Given a user is already in a group
    When they log in
    Then they land on the Predict tab without seeing onboarding
```

## LO-17 Testing and minimum coverage

**Assignee: Ricky (backend scoring tests, mobile leaderboard component test)**

_(implements user story 5)_

```gherkin
Feature: Automated tests for Lights Out

  Scenario: The scoring algorithm is thoroughly unit tested
    Given the grading logic in LO-6 is implemented
    When the test suite is reviewed
    Then exact-match, partial-match, and no-match scoring cases are all covered

  Scenario: A mobile component has test coverage
    Given the leaderboard component from LO-13 is implemented
    When its component test is run
    Then it renders correctly given representative props

  Scenario: Testing decisions can be explained
    Given the test strategy has been implemented
    When either team member is asked in the final review
    Then the rationale for what was and wasn't tested can be explained clearly
```

## LO-18 Backend: race calendar proxy and cache

**Assignee: Ricky**

_(implements user story 1)_

```gherkin
Feature: Race calendar proxy and cache

  Scenario: The app never calls Jolpica-F1 directly
    Given the mobile app needs the upcoming race and countdown
    When it requests race data
    Then it calls our own API, not Jolpica-F1

  Scenario: The backend serves cached race data
    Given the backend has a cached copy of the race calendar
    When a client requests it
    Then the cached copy is returned instead of calling Jolpica-F1 on every request

  Scenario: The cache refreshes when stale
    Given the cached race calendar is older than its refresh window
    When the next request comes in
    Then the backend refetches from Jolpica-F1 and updates the cache before responding
```

## LO-19 Backend: list the current user's friend groups

**Assignee: Ricky**

_(implements user story 8)_

```gherkin
Feature: List my friend groups

  Scenario: A member re-fetches their group
    Given a user belongs to a friend group
    When they call the list-my-groups endpoint
    Then their group is returned, including its invite code

  Scenario: A user with no groups gets an empty list
    Given a user has never created or joined a group
    When they call the list-my-groups endpoint
    Then an empty array is returned, not an error
```

## LO-20 Backend: fetch my own prediction for a race

**Assignee: Ricky**

_(implements user story 2)_

```gherkin
Feature: Fetch my own prediction

  Scenario: A user re-opens the Predict screen after submitting
    Given a user has already submitted a prediction for a race
    When they request their own prediction for that race
    Then their full predicted order is returned, locked or not

  Scenario: A user has not predicted yet
    Given a user has not submitted a prediction for a race
    When they request their own prediction for that race
    Then a 404 is returned, not an empty or null prediction
```

## LO-21 & LO-22 Backend: current user identity and personal prediction history

**Assignee: Ricky**

```gherkin
Feature: Current user identity

  Scenario: The app re-derives who's logged in after a cold start
    Given a user has a valid access token but the app has no cached profile
    When it requests the current user's identity
    Then their id, email, and displayName are returned

Feature: Personal prediction history

  Scenario: A user views their full prediction history
    Given a user has submitted predictions across multiple races
    When they request their prediction history
    Then every prediction is returned with its race, predicted order, actual order, and points earned

  Scenario: A not-yet-graded prediction shows as pending
    Given a user has submitted a prediction for a race that hasn't been graded yet
    When they request their prediction history
    Then that entry's actual order and points are null, not omitted or zero
```

## LO-23 Backend: race result endpoint

**Assignee: Ricky**

```gherkin
Feature: Race result endpoint

  Scenario: A graded race's result is fetched directly
    Given a race has been graded
    When its result is requested by raceId
    Then the actual finishing order is returned, independent of any specific user's prediction

  Scenario: A not-yet-graded race has no result
    Given a race has not been graded yet
    When its result is requested by raceId
    Then a 404 is returned, not an empty or null result
```

## LO-24 Backend: races-scored count on the leaderboard

**Assignee: Ricky**

_(implements user story 6)_

```gherkin
Feature: Races-scored count on the leaderboard

  Scenario: The leaderboard shows how many races each member has been scored on
    Given one or more races have been graded
    When the leaderboard endpoint is called
    Then each member's entry includes both their total points and the count of races they've been scored on

  Scenario: A member with no graded predictions shows zero races scored
    Given a group member has never had a prediction graded
    When the leaderboard endpoint is called
    Then their entry shows 0 total points and 0 races scored, not an omitted entry
```

## LO-25 Backend: one friend group per user

**Assignee: Ricky**

_(implements user story 8)_

```gherkin
Feature: One friend group per user

  Scenario: A user in a group cannot create another one
    Given a user is already in a friend group
    When they try to create a new group
    Then the request is rejected with a 409
    And no new group is created

  Scenario: A user in a group cannot join a different one
    Given a user is already in a friend group
    When they submit an invite code for a different group
    Then the request is rejected with a 409
    And their membership is unchanged

  Scenario: Re-joining your own group is harmless
    Given a user is already in a friend group
    When they submit that same group's invite code
    Then their group is returned and nothing changes

  Scenario: Concurrent requests cannot put a user in two groups
    Given a user is not in a group yet
    When several create or join requests for them arrive at the same time
    Then they end up in exactly one group
```

## LO-26 Mobile: login and register screens

**Assignee: Ricky**

_(implements user story 8)_

```gherkin
Feature: Login and register screens

  Scenario: A new user creates an account
    Given the user has no account yet
    When they register with a display name, email, and a password of at least 8 characters
    Then they are signed in
    And they continue to onboarding because they are not in a group yet

  Scenario: An existing user signs in
    Given the user has an account and is in a friend group
    When they sign in with their email and password
    Then they land on the Predict tab

  Scenario: Wrong credentials are rejected
    Given the user is on the Login screen
    When they sign in with a wrong password
    Then a clear error is shown
    And the email they entered is kept

  Scenario: An email that is already registered is rejected
    Given an account already exists for an email
    When someone registers with that email
    Then a clear error is shown instead of a generic failure

  Scenario: A saved session skips the Login screen
    Given the user signed in earlier and their session is still valid
    When they open the app
    Then they go straight to the tabs without seeing Login

  Scenario: An expired session returns to Login
    Given the user's session can no longer be refreshed
    When the app makes a request
    Then they are returned to the Login screen
    And no data from the previous session is shown
```

## LO-27 Backend: season driver list endpoint

**Assignee: Ricky**

_(implements user story 2)_

```gherkin
Feature: Season driver list endpoint

  Scenario: The current season's drivers are listed
    Given the current season's drivers are known to Jolpica-F1
    When the driver list is requested
    Then each driver is returned with the driver code used in predictions and their display name
    And the list is served from our own cache rather than calling Jolpica-F1 on every request

  Scenario: A prediction with an unknown driver is rejected
    Given a driver code is not in the current season's driver list
    When a prediction containing that code is submitted
    Then the request is rejected with a 400
    And no prediction is saved
```

## LO-28 Mobile: settings screen

**Assignee: Nikola**

_(implements user stories 4 and 8)_

```gherkin
Feature: Settings screen

  Scenario: The friend group can be shared from Settings
    Given the user is in a friend group
    When they open Settings
    Then the group's name and invite code are shown
    And the invite code can be copied or shared

  Scenario: Reminder status matches the notification permission
    Given the user has granted or denied notification permission
    When they open Settings
    Then lockout reminders are shown as on or off accordingly

  Scenario: The user can sign out
    Given the user is signed in
    When they sign out from Settings
    Then they are returned to the Login screen
    And no data from their session remains visible
```

## LO-29 Mobile: Race Detail results and personal score

**Assignee: Nikola**

_(extends the Race Detail screen with post-race results and personal scoring)_

```gherkin
Feature: Race Detail results and personal score

  Scenario: Post-race results and score are shown
    Given the race has been graded
    When the user opens Race Detail after lockout
    Then the actual top five are shown even if they did not predict
    And any submitted prediction shows exact-position matches and backend points
    And each group member's submitted top five and earned points are shown

```
