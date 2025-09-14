# JewGo - Kosher Restaurant Discovery Platform

JewGo is a production-ready platform for discovering and reviewing kosher restaurants, synagogues, and Jewish community resources. The platform serves the Jewish community by providing comprehensive listings with location-based search, reviews, ratings, and business information.

## Core Features

- **Restaurant Management**: Searchable kosher restaurant listings with reviews, ratings, hours, specials, and map integration
- **Synagogue Directory**: Community synagogue listings with contact information and services
- **Mikvah Listings**: Directory of mikvah facilities with scheduling and contact details
- **Shtel Marketplace**: Store and product management with Stripe payment integration
- **User Accounts**: Authentication, profiles, favorites, and review management
- **Admin Dashboard**: Role-based access control (4-tier RBAC), moderation tools, and audit logging

## Business Context

- **Production URL**: https://jewgo.app (frontend), https://api.jewgo.app (backend API)
- **Target Audience**: Jewish community members seeking kosher dining and religious services
- **Geographic Focus**: Location-based services with PostGIS spatial queries
- **Monetization**: Marketplace transactions via Stripe integration

## Key Differentiators

- PostGIS integration for accurate spatial queries and distance calculations
- Unified glassy Card design system across all listings
- Google Places API integration for enhanced business data
- Comprehensive admin system with 4-tier role-based access control
- TypeScript-first development with strict type checking