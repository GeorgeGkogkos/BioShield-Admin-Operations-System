# BioShield Admin Operations System

Independent BioShield admin operations application hosted in the DST Render workspace. Dedicated source code repository for public-demand discovery, lead qualification and compliant call-center handoff.

**Status: initial setup only.** The external BioShield Supabase database is not connected, Firecrawl/TinyFish are not configured for recurring operation, and no leads or telephone numbers are collected or exposed.

## First-stage goals

- Dedicated web interface for administrators, with filtered candidate, source, provider and execution views.
- Truthful empty states (unknown counts are not reported as zero).
- Server-side boundaries for future Supabase, Firecrawl and TinyFish integrations.
- Explicit human and legal approval before any sales outreach; a publicly accessible post is not consent to unsolicited contact.
- No dependencies on the private GeorgeGkogkos/DST codebase.

## Environment

The existing Render workspace is **My Workspace**. Target is the DST project; its project/environment assignment must be confirmed on Render because the service-creation connector cannot specify a project ID.

Linear project: https://linear.app/gkg/project/bioshield-admin-operations-system-79b033ffab9a (DST team, issues DST-265 through DST-270).

## Repository and security

This repository is currently PUBLIC. Never commit Supabase secrets, Firecrawl/TinyFish API keys, contacts, discovered personal information or customer data. All integrations will use server-side environment secrets and reviewed access controls. Production data endpoints remain disabled by default until proper administrator authentication and data policies are implemented.
