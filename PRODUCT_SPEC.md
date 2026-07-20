# UEBERMENSCH.AI Alpha Product Specification

## Product promise

UEBERMENSCH.AI turns a short daily reflection into one concrete next action and
uses the resulting behavior to produce an honest weekly review.

## Canonical domain

The product uses six equally visible pillars:

- Body: 8 categories
- Mind: 9 categories
- Spirit: 7 categories
- Relationships: 8 categories
- Vocation: 8 categories
- Lore: 6 categories

The supplied hierarchy totals 46 categories even though older collateral says
47. The implementation therefore uses 46 until a missing category is explicitly
defined. Older seven-pillar code maps Emotion into Mind/Spirit, Wealth into
Vocation, and Adventure into Lore.

## Alpha scope

The Alpha proves one loop:

`onboarding -> check-in -> directive -> completion -> weekly audit`

Included:

- email/password authentication
- explainable onboarding baseline
- two or three active focus pillars
- daily mood, energy, reflection, and leading metrics
- detailed, private tracking for all 46 categories and 189 defined metrics
- Social Community MVP with discoverable profiles, paginated posts, images, likes, comments, reports and private realtime messaging
- one persisted directive per day
- directive completion, skip, and feedback
- deterministic category score v2 (Performance 40% + Lifestyle 60%)
- persisted weekly audit with an AI-written explanation
- product analytics events and operational error logging

Deferred until retention is proven:

- leaderboards and community ranking
- population percentile claims
- autonomous long-term planning
- calendar, wearable, and financial integrations
- public Performance Score comparisons

## Score contract

Each pillar score is 0-100. The total UEBERMENSCH score is 0-600.

Category Score v2 combines Performance (40%) and Lifestyle (60%). Lifestyle uses:

- consistency: 35%
- progression: 30%
- breadth: 20%
- intensity: 15%

AI may explain scores but must never calculate or silently modify them.
Metric targets provide transparent target attainment, but are not presented as
population percentiles. BODY uses the documented category weights; other pillars
use neutral weights summing to 100 until researched weights are approved.

## Alpha success criteria

- A new user reaches a first directive without manual intervention.
- A completed check-in never exists without all of its submitted metric rows.
- Every score can be reproduced from stored inputs and a formula version.
- API routes reject unauthenticated or cross-user requests.
- The app and API pass typecheck, tests, and production builds.
- Alpha users return for the directive and weekly review, not only the UI.
