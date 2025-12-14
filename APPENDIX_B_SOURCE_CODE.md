# APPENDIX B: SOURCE CODE (Concise)

**ScanWizard: Product Locator**  
**Version:** 1.0.0  
**Date:** December 9, 2025

---

## Overview

ScanWizard helps users find products and nearby stores. This concise appendix highlights core modules, file paths, and key behaviors without full code listings. Refer to the source files for implementation details.

---

## Key Modules

- `src/screens/shared/scanner.tsx`: Barcode scanner; navigates to `ResultScreen` on match; supports flash, timeout, and Supabase lookup.
- `src/screens/shared/SearchScreen.tsx`: Text search with debounced suggestions; filters approved products; navigates to results with optional user location.
- `src/screens/components/Maps.tsx`: Map view; filters stores by radius; shows user location and markers; uses Haversine for distance.
- `src/context/AuthContext.tsx`: Session/profile management; role-based access; auth state listener; alert handling.
- `src/screens/auth/LoginScreen.tsx`: Email/password login via Supabase; error and loading states; navigation links.
- `src/screens/storeowner/MyStoresScreen.tsx`: Store owner dashboard; lists stores and approval status; create and details navigation.
- `src/screens/admin/AdminApprovalScreen.tsx`: Admin approvals; approve/reject stores; cached pending list; pull-to-refresh.

---

## Data & Config

- `src/lib/supabase.ts`: Supabase client with `AsyncStorage`; helpers for products, stores, assignments, and nearby RPC.
- `src/config/env.ts`: Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Expo config or environment; validates presence.

---

## Performance

- `src/utils/cacheUtils.ts`: Time-based cache with SHORT/MEDIUM/LONG/VERY_LONG durations; get/set/clear APIs and basic stats.

---

## How It Works

- Scan → barcode match → fetch product → `ResultScreen`.
- Search → suggestions (300ms debounce) → select product → load stores (verified only) → map or result view.
- Map → choose radius (1/3/5/10 km) → filter markers → view store distance.
- Auth → login → context loads profile/role → route guards via `userRole`.
- Admin/Owner → manage store lifecycle from creation to approval.

---

## Quick References

- Navigation targets: `ResultScreen`, `StoreDetails`, `CreateStore`.
- Store verification flags: `status`, `is_verified`, `approval_status`.
- Location: Expo Location (foreground permission; balanced accuracy).

---

## Summary

Core capabilities: scanning, search, maps with distance, authentication, store management, admin approvals, Supabase integration, and caching. See the listed files for full implementations.

---

**End of Appendix B**
