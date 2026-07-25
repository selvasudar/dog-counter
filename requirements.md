# Stray Dog Reporting & Rabies Risk Mapping — Requirements

## 1. Overview

A lightweight Progressive Web App (PWA) that lets citizens report stray dog sightings with location, count, and behavior. Reports are aggregated into location-based clusters and shown on a public OpenStreetMap dashboard as a density/risk map. The goal is to give citizens visibility into stray dog hotspots and give local government (Animal Husbandry / Municipal ABC teams) a prioritized, evidence-based view of where sterilization and vaccination (ABC) efforts should go first — supporting Tamil Nadu's rabies elimination goals under the Animal Birth Control Rules 2023.

This is a pet/pitch project — built to demonstrate the concept to techKoodaram and Virudhunagar district officials. Keep the UI simple, fast, and self-explanatory. No login required for citizen reporting.

## 2. Goals

- Let any citizen report a stray dog sighting in under 15 seconds.
- Prevent duplicate/inflated counts through location + time-based clustering.
- Surface behavior signals (not just headcount) as the real risk indicator.
- Give government users a clean, actionable dashboard — not just a pretty map.
- Keep personal data (phone number) private and internal-only.

## 3. Non-Goals (for this version)

- No user accounts / authentication for citizens.
- No push notifications (can be phase 2).
- No integration with hospital/PEP bite-case data yet (phase 2 — see Section 9).
- No native mobile app — PWA only.

## 4. Users & Roles

| Role | Access |
|---|---|
| **Citizen (public)** | Submit a report. View public map (count + area only, no phone numbers, no personal data). |
| **Government / Admin** | View full dashboard including report details, phone number (if provided), timestamps, and status. Can update cluster status (Reported → Assigned → Action Taken → Resolved). |

No login for citizens. Simple password/PIN-gated admin view is sufficient for this pitch version (no need for full auth system).

## 5. Core User Flow (Citizen)

1. Open PWA (add-to-homescreen supported).
2. Tap "Report Stray Dogs."
3. App requests location permission → auto-fills latitude/longitude (with a manual pin-drop fallback on the map if GPS is denied/inaccurate).
4. Citizen enters:
   - Number of dogs seen (numeric input)
   - Behavior tag (single select, required)
   - Phone number (optional, for internal follow-up only)
5. Tap "Submit."
6. Confirmation screen: "Thanks — your report helps make [area] safer." Show the report pinned on a mini map for confirmation.

Total flow: 3 taps + 1 number field. No account, no long form.

## 6. Data Model

### `reports` table
| Field | Type | Notes |
|---|---|---|
| `id` | CHAR(36) (UUID string) or BIGINT AUTO_INCREMENT | Primary key — MySQL has no native UUID type, so generate a UUID string in the app layer or use an auto-increment integer |
| `latitude` | float | Required |
| `longitude` | float | Required |
| `dog_count` | integer | Required, min 1 |
| `behavior_tag` | enum | Required — one of: `calm`, `aggressive`, `sick_or_injured`, `puppies_present` |
| `phone_number` | string, nullable | Optional, internal-only, never exposed on public map |
| `created_at` | timestamp | Auto-set |
| `device_id` | string | Anonymous device/browser fingerprint or local UUID, used for rate-limiting |

### `clusters` (derived/materialized, not user-facing table)
Computed server-side (or via a scheduled job), not entered directly:
| Field | Type | Notes |
|---|---|---|
| `cluster_id` | CHAR(36) (UUID string) or BIGINT AUTO_INCREMENT | |
| `center_lat` / `center_lng` | float | Centroid of grouped reports |
| `report_count` | integer | Number of independent reports in this cluster |
| `total_dog_estimate` | integer | Max or median dog_count across grouped reports (avoid simple summing — see Section 7) |
| `dominant_behavior_tag` | enum | Highest-severity tag present in the cluster (severity order: sick_or_injured > aggressive > puppies_present > calm) |
| `last_reported_at` | timestamp | Most recent report timestamp in cluster |
| `status` | enum | `reported`, `assigned`, `action_taken`, `resolved` — admin-editable |

## 7. Clustering Logic (core innovation — implement carefully)

- **Radius:** Group reports within a **50-meter radius** of each other into a single cluster.
- **Time decay:** Only reports from the **last 14 days** count toward an active cluster. Older reports fade out of the active weight automatically (do not delete — keep for historical/analytics view).
- **De-duplication of count:** Do NOT simply sum `dog_count` across all reports in a cluster (this inflates numbers when multiple people report the same pack). Use the **median or max** `dog_count` of reports within the cluster as `total_dog_estimate`.
- **Confidence signal:** `report_count` (number of independent reports, ideally from different `device_id`s) in a cluster is the actual strength-of-signal metric — more independent confirmations = higher confidence, shown visually via marker opacity or a small "confirmed by N reports" badge.
- **Marker size/color logic** (must be explainable in one sentence): Marker size = `total_dog_estimate`. Marker color = `dominant_behavior_tag` severity (e.g., green = calm, yellow = puppies present, orange = aggressive, red = sick/injured).

## 8. Rate Limiting / Basic Spam Control

- Limit to **1 report per `device_id` per 50m cluster per 24 hours** to prevent spam/duplicate flooding from a single source.
- No CAPTCHA needed for pitch version, but leave a hook/TODO for it.

## 9. Dashboard (Government/Admin View)

- Full map view with all clusters, filterable by:
  - Behavior tag
  - Date range
  - Status (reported / assigned / action taken / resolved)
- Cluster detail panel (on marker click): report count, dog estimate, behavior breakdown, timestamps, phone numbers of reporters (if provided), and a status dropdown the admin can update.
- Simple list/table view as an alternative to the map (sortable by report count, most recent, most severe).
- **Phase 2 (not in this build, note only):** Cross-reference cluster locations against PHC-reported dog-bite case data to prioritize ABC team dispatch by actual bite proximity, not just sighting density.

## 10. Public Map View

- Same OpenStreetMap base, but:
  - No phone numbers, no device IDs, no individual report details — only cluster-level: approximate area, dog count estimate, and behavior severity color.
  - Purpose: public safety awareness ("be cautious in this area"), not a surveillance tool.
- Simple legend explaining marker color/size.

## 11. UI / Design Requirements

- **Style:** Simple, clean, minimal — optimized for quick use on low-end Android phones and rural users with variable data speeds.
- Large tap targets, minimal text entry, clear icons for behavior tags (not just text, to help with lower literacy/quick scanning).
- Works well on 360–400px width screens first (mobile-first), dashboard can scale up for desktop/admin use.
- Support "Add to Home Screen" PWA install prompt.
- Offline-friendly: if no network at submission time, queue the report locally and auto-submit when back online.
- Map library: use **Leaflet.js with OpenStreetMap tiles** (free, no API key/billing needed).

## 12. Tech Stack

- **Frontend:** Next.js (PWA-enabled via next-pwa or similar), Tailwind CSS
- **Backend/DB:** MySQL, accessed via Next.js API routes (or a lightweight ORM such as Prisma). No built-in Row Level Security like Supabase, so enforce access control at the API layer: a public insert-only endpoint for citizen reports (no read access to raw report/phone data), and a separate admin-only endpoint (PIN/session-gated, see Section 4) for full read/update access to reports and cluster status.
- **Maps:** Leaflet.js + OpenStreetMap tiles
- **Clustering:** Computed via a Next.js API route/scheduled job (e.g., a cron-triggered endpoint or a simple `node-cron` job alongside the app) that queries MySQL and re-materializes the `clusters` table, or client-side aggregation for the pitch version if simpler
- **Hosting:** Any Node-friendly host for the Next.js app (Vercel, or local/self-hosted) + a MySQL instance (local MySQL server, or a managed option like PlanetScale/Railway if not running locally)

## 13. Success Criteria for This Version (Pitch-Ready MVP)

- [ ] Citizen can submit a report in under 15 seconds with no login.
- [ ] Reports within 50m/14-day window correctly cluster instead of stacking as separate markers.
- [ ] Public map shows count + behavior severity only — no PII.
- [ ] Admin view shows full report detail and lets status be updated per cluster.
- [ ] Works cleanly on a mid-range Android phone over mobile data.
- [ ] The whole thing can be demoed live on a phone to an IAS officer in under 2 minutes.

## 14. Future Phases (Not in This Build)

- Cross-referencing with hospital PEP/bite-case data for true risk prioritization.
- IVR/missed-call reporting channel for citizens without smartphones.
- Push notifications for nearby residents when a new high-severity cluster is confirmed.
- Verified/field-confirmed flag once an ABC team physically visits a cluster.
