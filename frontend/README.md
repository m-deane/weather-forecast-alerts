# Scottish Mountain Weather - Frontend

Mobile-first Progressive Web App for Scottish mountain weather forecasts.

## Features

- **Location Search & Filtering**: Advanced search with filters for mountain type, difficulty, and elevation
- **Interactive Forecasts**: Detailed weather displays with hiking suitability scores
- **Location Comparison**: Side-by-side weather comparison for trip planning
- **Favorites & Recents**: Save frequently accessed locations
- **Offline Support**: Service worker for offline functionality
- **Responsive Design**: Optimized for mobile and desktop

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for server state management
- **Zustand** for client state management
- **React Router** for navigation
- **PWA** with service worker

## Development

### Prerequisites

- Node.js 18+
- Backend API running on port 8000

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # App layout with navigation
│   ├── WeatherCard.tsx # Weather display component
│   └── ...
├── pages/              # Route components
│   ├── HomePage.tsx    # Home page with favorites
│   ├── SearchPage.tsx  # Location search
│   ├── LocationPage.tsx # Detailed weather view
│   └── ...
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── api/                # API client
```

## Key Components

### WeatherCard
Displays current weather conditions with hiking suitability scoring.

### SearchPage
Advanced location search with filtering by area, type, difficulty, and elevation.

### LocationPage
Detailed weather forecast with 6-day outlook and period breakdown.

### LocationComparison
Side-by-side weather comparison for multiple locations.

## API Integration

The frontend connects to the FastAPI backend for:
- Location search and metadata
- Weather forecasts with hiking scores
- Area and classification data

## PWA Features

- **Offline Support**: Cached weather data available without connection
- **App Install**: Can be installed as a standalone app
- **Push Notifications**: Weather alerts (future feature)

## Deployment

### Production Build

```bash
npm run build
```

### Docker

The frontend is included in the main Docker Compose setup:

```bash
docker-compose up frontend
```

## Contributing

1. Follow the existing code style (Prettier + ESLint)
2. Use TypeScript for all new code
3. Write responsive, mobile-first CSS
4. Test on mobile devices
5. Follow accessibility best practices