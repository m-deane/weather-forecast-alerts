# Analysis: Items 1, 2, and 10 -- External Integrations and Photography

## Executive Summary

These three items share a common thread: enriching the mountain forecast pages with contextual data that goes beyond raw weather numbers. Item 1 (Walk Highlands) connects weather to walking routes. Item 2 (Fotovue) connects weather to photography location guides. Item 10 (Location Photos) gives visual context to the mountains being forecast. Together they transform the LocationPage from a weather-only dashboard into a comprehensive trip-planning tool.

---

## Item 1: Walk Highlands Walking Route Integration

### Problem Statement

**What's missing**: The app shows weather forecasts for individual Scottish mountains but provides zero context about how to actually reach those summits. A hiker viewing the forecast for Beinn Eighe sees temperature, wind, and hiking scores, but has no information about available walking routes, their length, difficulty grade, estimated duration, or starting points.

**Why it matters**: Walk Highlands (walkhighlands.co.uk) is the de facto standard reference for Scottish hillwalking routes. Nearly every Scottish hillwalker uses it for route planning. The current app requires users to manually cross-reference between this weather app and Walk Highlands in a separate browser tab. This fragmented workflow means:
- Users cannot assess whether a route's length and exposure are compatible with the forecast window (e.g., a 10-hour route is dangerous if conditions deteriorate after 6 hours)
- There is no connection between route difficulty grades and weather severity
- The hiking suitability score (1-10) has no route context -- a score of 6 might be acceptable for a 2-hour walk but dangerous for an 8-hour ridge traverse

**Primary use case link**: "Help hikers and mountaineers make safety-informed decisions" requires understanding the route, not just the summit weather. A 4-hour route through sheltered glens is fundamentally different from an 8-hour exposed ridge traverse in the same weather.

### Plan

**Data source**: Walk Highlands (walkhighlands.co.uk) has structured route pages with:
- Route name, description, and difficulty grade (1-5 stars)
- Distance (km), ascent (m), estimated time
- Starting point coordinates and grid references
- Route categories (e.g., "Munros", "Corbetts", "Short walks")

**Architecture approach**: Static data mapping rather than runtime scraping.
- Create a manual JSON mapping file (`data/walkhighlands_routes.json`) that maps each mountain in `config.yaml` to its Walk Highlands route URL(s) and key metadata
- Serve this data through the backend API alongside existing location data
- Display route information on the LocationPage as a new section
- Do NOT scrape Walk Highlands at runtime -- this would be fragile, slow, and ethically questionable. Instead, curate the mapping manually and update periodically

**Key design decisions**:
1. One mountain can have multiple routes (e.g., Beinn Eighe has at least 3 WH routes)
2. Store only the URL and essential metadata (name, distance, ascent, time, grade) -- link out to Walk Highlands for full details
3. Add a "Route Weather Compatibility" indicator that combines hiking score + route duration to flag risky combinations

### Implementation Plan

**New files**:
- `data/walkhighlands_routes.json` -- Static mapping of mountain IDs to Walk Highlands route data
- `frontend/src/components/WalkHighlandsRoutes.tsx` -- New component for LocationPage

**Modified files**:

1. **`data/walkhighlands_routes.json`** (NEW):
```json
{
  "torridon-beinn-eighe": {
    "routes": [
      {
        "name": "Beinn Eighe from Kinlochewe",
        "url": "https://www.walkhighlands.co.uk/torridon/beinn-eighe.shtml",
        "distance_km": 15.5,
        "ascent_m": 1050,
        "estimated_hours": 7,
        "grade": 5,
        "category": "Munros"
      }
    ]
  }
}
```

2. **`backend/simple_api.py`**:
   - Add a `GET /api/v1/locations/{location_id}/routes` endpoint that reads from the JSON file
   - Add `walkhighlands_url` field to the location response (optional, for direct linking)

3. **`frontend/src/types/weather.ts`**:
   - Add `WalkHighlandsRoute` interface: `{ name, url, distance_km, ascent_m, estimated_hours, grade, category }`
   - Extend `Location` interface with optional `walkhighlands_routes?: WalkHighlandsRoute[]`

4. **`frontend/src/components/WalkHighlandsRoutes.tsx`** (NEW):
   - Renders a card with route list for the current mountain
   - Shows distance, ascent, estimated time, difficulty grade
   - Links out to Walk Highlands for full details
   - Includes a "Route Weather Compatibility" indicator:
     - Green: hiking score >= 7 AND route duration < remaining daylight hours
     - Amber: hiking score 5-7 OR route is long relative to good weather window
     - Red: hiking score < 5 OR route duration exceeds safe weather window

5. **`frontend/src/pages/LocationPage.tsx`**:
   - Add `<WalkHighlandsRoutes locationId={locationId} />` section after the Photography Conditions section (line ~258)
   - Lazy-load the component to avoid increasing the main bundle

6. **`frontend/src/api/client.ts`**:
   - Add `getRoutes(locationId: string)` API call

**Effort estimate**: Small-medium. The static data file is the main manual work (curating ~60 mountain-to-route mappings). The code changes are straightforward.

**Risks**:
- Walk Highlands URLs may change over time (mitigated by periodic validation, similar to `check_urls.py`)
- Route data becomes stale (mitigated by including a `last_verified` date in the JSON)

---

## Item 2: Fotovue Photography Location Guide Integration

### Problem Statement

**What's missing**: The app has a substantial photography conditions system (`PhotographyConditions.tsx`, `PhotographyDashboard.tsx`, `photography.ts` utility with ~300 lines of scoring logic) that assesses weather suitability for photography (landscape, golden hour, night sky, moody/drama categories). However, it provides zero location-specific photography guidance. A photographer visiting the Beinn Eighe page knows if conditions are "good for golden hour" but has no information about:
- What specific viewpoints or compositions are possible from that location
- Which direction to face for best light at different times of day
- Whether the mountain is known for specific photographic subjects (reflections, ridgelines, lochs, etc.)
- What other photographers have identified as key shots from that location

**Why it matters**: Fotovue publishes dedicated Scottish landscape photography location guides (their "Photographing Scotland" series). These guides contain expert-curated viewpoint information, optimal shooting conditions, and composition suggestions for specific Scottish mountain locations. Without this context, the photography scoring system operates in a vacuum -- it tells you "golden hour is excellent" but not "face west from the ridge for the best golden hour light across Loch Torridon."

**Primary use case link**: While the primary use case focuses on hikers, the app already has significant photography infrastructure. Enriching it with location-specific guidance makes the photography feature genuinely useful rather than generic.

### Plan

**Data source considerations**: Fotovue guides are commercial publications. Unlike Walk Highlands (which is a free public website), Fotovue content is copyrighted and sold as guidebooks/PDFs. This means:
- We CANNOT scrape or reproduce Fotovue content
- We CAN link to Fotovue product pages for relevant guides
- We CAN create our own curated photography viewpoint data inspired by publicly available knowledge (photography forums, Flickr geotagged photos, OS maps)

**Architecture approach**: Two-layer system:
1. **Static curated photography metadata** -- A manually maintained JSON file with viewpoint descriptions, optimal conditions, and compass bearings for each mountain
2. **Fotovue guide links** -- Simple URL references to relevant Fotovue guide pages where users can purchase full guides

**Key design decisions**:
1. Do not reproduce any copyrighted Fotovue content -- only link to their commercial pages
2. Create our own original photography metadata using publicly available geographic knowledge
3. Integrate with the existing `PhotographyDashboard.tsx` rather than creating a parallel system
4. Photography viewpoints are static data (they don't change with weather), so they complement the dynamic photography conditions scoring

### Implementation Plan

**New files**:
- `data/photography_viewpoints.json` -- Curated viewpoint data per mountain
- `frontend/src/components/PhotographyViewpoints.tsx` -- New component

**Modified files**:

1. **`data/photography_viewpoints.json`** (NEW):
```json
{
  "torridon-beinn-eighe": {
    "photography_notes": "Triple Buttress visible from the north; Loch Coire Mhic Fhearchair is a classic foreground",
    "key_viewpoints": [
      {
        "name": "Loch Coire Mhic Fhearchair",
        "description": "Classic reflection shot with Triple Buttress backdrop",
        "optimal_light": "morning",
        "compass_bearing": 180,
        "subjects": ["reflection", "rock formation", "mountain landscape"]
      }
    ],
    "best_seasons": ["autumn", "winter"],
    "fotovue_guide_url": "https://www.fotovue.com/product/photographing-scotland-volume-1/",
    "fotovue_guide_name": "Photographing Scotland Vol 1: The Highlands"
  }
}
```

2. **`backend/simple_api.py`**:
   - Add a `GET /api/v1/locations/{location_id}/photography` endpoint
   - Or extend the existing weather response to include `photography_metadata` field

3. **`frontend/src/types/weather.ts`**:
   - Add `PhotographyViewpoint` interface: `{ name, description, optimal_light, compass_bearing, subjects }`
   - Add `PhotographyLocationMeta` interface: `{ photography_notes, key_viewpoints, best_seasons, fotovue_guide_url, fotovue_guide_name }`

4. **`frontend/src/components/PhotographyViewpoints.tsx`** (NEW):
   - Renders viewpoint cards with compass bearing indicator
   - Shows "optimal light" aligned with current/forecast weather conditions
   - Links to Fotovue guide with "Get the full photography guide" CTA
   - Highlights viewpoints where current conditions match the optimal conditions

5. **`frontend/src/components/PhotographyDashboard.tsx`**:
   - Add a 5th section tab: "Viewpoints" alongside existing Overview, Opportunities, Best Times, Atmospheric
   - This section renders `PhotographyViewpoints` with the location's static photography data
   - Cross-reference: if the current conditions match a viewpoint's optimal light direction, highlight it

6. **`frontend/src/api/client.ts`**:
   - Add `getPhotographyMeta(locationId: string)` API call

**Effort estimate**: Medium. Creating quality photography viewpoint data for ~60 mountains requires domain knowledge. The code integration is moderate since it extends existing photography infrastructure.

**Risks**:
- Photography viewpoint quality depends on manual curation effort
- Fotovue may not have guides for all mountain areas in the app (their coverage focuses on popular photography areas)
- Compass bearing calculations need to account for the user's position, not just a static bearing

---

## Item 10: Mountain Forecast Page Photos

### Problem Statement

**What's missing**: The LocationPage (`frontend/src/pages/LocationPage.tsx`, ~925 lines) displays comprehensive weather data, map, charts, photography conditions, alerts, and daily forecasts -- but shows zero visual images of the actual mountain. A user viewing the forecast for "Sgurr nan Gillean" sees numbers and maps but has no visual reference for what the mountain looks like, what the terrain is like, or what views to expect.

**Why it matters**: Visual context is critical for trip planning:
- Hikers unfamiliar with a mountain need to understand its character (rocky ridge vs grassy slopes, exposed vs sheltered)
- Photography-focused users need to see example images to understand composition possibilities
- Seasonal photos (summer vs winter) help users calibrate expectations for current conditions
- Photos showing the mountain in different weather conditions help users understand what "hiking score 6" actually looks like on that specific mountain

**Primary use case link**: "Help hikers make safety-informed decisions" -- seeing a photo of an icy ridge alongside a freezing level of 400m is more impactful than the number alone. Visual context makes weather data actionable.

### Plan

**Image source options** (in order of feasibility):

1. **Wikimedia Commons** (recommended first phase):
   - Free, openly licensed images (CC-BY, CC-BY-SA, public domain)
   - Most Scottish Munros have multiple high-quality images
   - API available for querying images by geographic coordinates or category
   - Requires attribution display but no licensing cost

2. **Flickr API** (recommended second phase):
   - Extensive geotagged photography of Scottish mountains
   - API allows searching by coordinates and tags
   - CC-licensed photos available with proper attribution
   - Dynamic -- shows recent/seasonal photos

3. **User-uploaded photos** (future phase):
   - Requires authentication system (not currently built)
   - Content moderation needed
   - Best long-term solution but highest implementation cost

**Architecture approach (Phase 1 -- Wikimedia Commons)**:
- Create a static JSON mapping of mountain IDs to Wikimedia Commons image metadata
- Curate 2-4 representative images per mountain (different angles/seasons)
- Display as a small gallery/carousel on the LocationPage
- All images include proper CC attribution

**Key design decisions**:
1. Start with static curated images rather than dynamic API calls (simpler, more reliable, curated quality)
2. Show 2-4 images maximum per mountain (enough for context without overwhelming)
3. Include proper attribution for all CC-licensed images
4. Images should show the mountain from different angles/seasons/conditions
5. Keep images small/thumbnails with click-to-enlarge to avoid page load impact

### Implementation Plan

**New files**:
- `data/mountain_photos.json` -- Curated photo metadata per mountain
- `frontend/src/components/MountainPhotoGallery.tsx` -- New gallery component

**Modified files**:

1. **`data/mountain_photos.json`** (NEW):
```json
{
  "torridon-beinn-eighe": {
    "photos": [
      {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/...",
        "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/.../300px-...",
        "alt": "Beinn Eighe from Kinlochewe, showing the white quartzite ridge",
        "attribution": "Photo by [Author], CC BY-SA 4.0, via Wikimedia Commons",
        "attribution_url": "https://commons.wikimedia.org/wiki/File:...",
        "season": "summer",
        "tags": ["ridge", "quartzite", "clear conditions"]
      }
    ]
  }
}
```

2. **`backend/simple_api.py`**:
   - Add a `GET /api/v1/locations/{location_id}/photos` endpoint that reads from the JSON file
   - Returns photo metadata array (URLs, attribution, tags)

3. **`frontend/src/types/weather.ts`**:
   - Add `MountainPhoto` interface: `{ url, thumbnail_url, alt, attribution, attribution_url, season, tags }`

4. **`frontend/src/components/MountainPhotoGallery.tsx`** (NEW):
   - Horizontal scrollable thumbnail gallery (mobile-friendly)
   - Click/tap to open full-size image in a modal/lightbox
   - Attribution displayed below each image
   - Season tags displayed as small badges
   - Graceful fallback when no photos are available (shows a placeholder with mountain silhouette)
   - Lazy-load images for performance

5. **`frontend/src/pages/LocationPage.tsx`**:
   - Add `<MountainPhotoGallery locationId={locationId} />` section immediately after the header (line ~161), before the map
   - This gives immediate visual context before the user scrolls into data
   - Alternatively, place it after the mini map section (line ~214) as a "Mountain Gallery" section

6. **`frontend/src/api/client.ts`**:
   - Add `getPhotos(locationId: string)` API call

**Performance considerations**:
- Thumbnail images should be ~300px wide (small download)
- Lazy-load the gallery component and individual images
- Use `loading="lazy"` on `<img>` tags
- Consider using WebP format with JPEG fallback
- Total gallery should add less than 200KB to initial page load

**Effort estimate**: Medium. Curating 2-4 quality images per mountain for ~60 mountains takes time (120-240 images to find, verify licensing, and catalog). The code implementation is straightforward.

**Risks**:
- Wikimedia Commons image quality varies significantly
- Some mountains may have very few or no suitable images
- Image licensing must be verified carefully -- incorrect attribution is a legal risk
- External image URLs may break over time (mitigated by using stable Wikimedia thumbnail URLs)

---

## Cross-Item Dependencies and Synergies

### Shared Infrastructure

All three items follow the same pattern:
1. **Static JSON data file** in a new `data/` directory
2. **Simple API endpoint** to serve that data
3. **New frontend component** rendered on LocationPage
4. **Type definitions** added to `weather.ts`

This suggests creating the `data/` directory structure and API pattern once, then reusing it for all three items.

### Recommended Implementation Order

1. **Item 10 (Photos)** first -- lowest complexity, highest visual impact, establishes the `data/` directory pattern
2. **Item 1 (Walk Highlands)** second -- directly serves the primary hiking use case, builds on the data pattern
3. **Item 2 (Fotovue)** third -- extends existing photography infrastructure, requires most domain knowledge

### Shared `data/` Directory Structure

```
data/
  mountain_photos.json      (Item 10)
  walkhighlands_routes.json (Item 1)
  photography_viewpoints.json (Item 2)
```

### LocationPage Section Order (proposed)

After implementing all three items, the LocationPage would show:
1. Header (existing)
2. **Mountain Photo Gallery** (Item 10 -- NEW)
3. Mini Location Map (existing)
4. Weather Trend (existing)
5. Current Conditions (existing)
6. Daylight + Cloud Inversion grid (existing)
7. Photography Conditions (existing, enhanced with viewpoints from Item 2)
8. **Walking Routes** (Item 1 -- NEW)
9. Weather Alerts (existing)
10. 6-Day Forecast (existing)
11. Customizable Dashboard (existing, photography tab enhanced with Item 2)
12. Today's Detailed Forecast (existing)

---

## CLAUDE.md Connection

All three items directly support the primary use case: "Help hikers and mountaineers make safety-informed decisions about Scottish mountain conditions."

- **Item 1 (Walk Highlands)**: Connects weather data to actual routes -- a hiker can assess whether the weather window is long enough for their intended route
- **Item 2 (Fotovue)**: Enriches the existing photography feature from generic conditions scoring to location-specific guidance -- a photographer knows exactly where to stand and which direction to face
- **Item 10 (Photos)**: Provides visual context that makes weather data tangible -- seeing what the mountain looks like helps calibrate risk perception

The shared approach (static curated data + simple API + frontend component) aligns with the CLAUDE.md principle: "Everything is about simplicity. Avoid massive or complex changes."
