# Lights Out Backlog

Each ticket below has a Gherkin scenario and an assignee. Ricky is handling the backend and home lab deployment, plus the Leaderboard and Join Group screens since those build directly on the endpoints he wrote. Nikola is building the rest of the mobile app. Either of us can pick up any ticket if the other is stuck.

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

_(implements user story 11)_

```gherkin
Feature: Friend groups and lightweight auth

  Scenario: A user can create a friend group
    Given a logged-in user has no group yet
    When they create a group
    Then an invite code is generated for that group

  Scenario: A user can join a group via invite code
    Given a user has received a valid invite code
    When they submit it in Settings
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

_(implements user stories 2, 3, 4)_

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

_(implements user story 6, core scoring logic, primary unit test target)_

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

_(implements user story 7)_

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

## LO-8 Mobile: Expo app shell, navigation, and state wiring

**Assignee: Nikola**

```gherkin
Feature: Mobile application shell

  Scenario: The mobile app is initialized
    Given the project uses Expo for the mobile app
    When the app shell is created inside apps/mobile
    Then the application can start locally via Expo Go and an emulator

  Scenario: Navigation structure is in place
    Given the shell exists
    When an engineer inspects the navigation
    Then Predict, Leaderboard, History, and Settings are reachable as tabs
    And Race Detail is reachable as a stack screen from Predict

  Scenario: State libraries are wired
    Given the app needs both local UI state and server data
    When the store and query client are set up
    Then Zustand manages local/UI state
    And TanStack Query manages all server data with caching
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

_(implements user stories 2, 3)_

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

_(implements user story 4)_

```gherkin
Feature: Friend submission status

  Scenario: Submission status is visible before lockout
    Given the prediction window is open
    When the user views Race Detail
    Then each group member's submitted/not-submitted status is shown
    And no member's actual picks are shown before lockout
```

## LO-12 Mobile: lockout reminder notification

**Assignee: Nikola**

_(implements user story 5, required native feature)_

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
    Then a local notification is delivered on both Android and iOS

  Scenario: The app remains usable without notification permission
    Given the user denied notification permission
    When they use the Predict screen
    Then the in-app countdown is still visible and predictions can still be submitted
```

## LO-13 Mobile: leaderboard screen

**Assignee: Ricky** _(builds the screen consuming the leaderboard endpoint he owns from LO-7, end-to-end ownership of one feature slice, and real mobile-app work toward even distribution)_

_(implements user story 7)_

```gherkin
Feature: Leaderboard screen

  Scenario: Group standings are displayed
    Given the leaderboard endpoint returns ranked members
    When the Leaderboard screen is opened
    Then members are shown ranked by total season points
```

## LO-14 Mobile: personal history screen

**Assignee: Nikola**

_(implements user story 8)_

```gherkin
Feature: Personal prediction history

  Scenario: Past predictions are listed with results
    Given the user has predictions from past races
    When the History screen is opened
    Then each past race shows the user's prediction, the actual result, and points earned
```

## LO-15 Mobile: offline caching and graceful degradation

**Assignee: Ricky & Nikola (joint)**

_(implements user stories 9, 10)_

```gherkin
Feature: Offline behavior

  Scenario: Cached data remains browsable offline
    Given the app has previously loaded data while online
    When the device loses connectivity
    Then the calendar, history, and last-synced leaderboard remain viewable
    And a "last updated" indicator is shown instead of a blank or broken screen

  Scenario: Submitting offline fails gracefully
    Given the device has no network connection
    When the user attempts to submit a prediction
    Then a clear message asks them to reconnect before lockout
    And their in-progress draft is preserved locally, not lost
```

## LO-16 Mobile: join friend group UI

**Assignee: Ricky** _(builds the screen consuming the invite-code endpoint he owns from LO-4, same end-to-end rationale as LO-13)_

_(implements user story 11)_

```gherkin
Feature: Join friend group

  Scenario: A user joins via invite code
    Given the user has a valid invite code
    When they enter it in Settings
    Then they are added to the group
    And the group's leaderboard becomes visible to them
```

## LO-17 Testing and minimum coverage

**Assignee: Ricky (backend scoring tests) & Nikola (mobile component test)**

```gherkin
Feature: Automated tests for Lights Out

  Scenario: The scoring algorithm is thoroughly unit tested
    Given the grading logic in LO-6 is implemented
    When the test suite is reviewed
    Then exact-match, partial-match, and no-match scoring cases are all covered

  Scenario: A mobile component has test coverage
    Given the leaderboard or prediction-card component is implemented
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
