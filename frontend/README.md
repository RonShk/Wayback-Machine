# Frontend - Wayback Machine Clone

A modern React-based web interface for the Wayback Machine clone. Built with React 19, TypeScript, Tailwind CSS, and Vite for a fast, responsive user experience.

## Architecture

The frontend follows a component-based architecture with React Router for navigation:

```
src/
├── components/           # Reusable UI components
├── pages/               # Page-level components  
├── assets/              # Static assets
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles with Tailwind
```

## Core Components

### App.tsx
**File**: `src/App.tsx`

The main application component that sets up routing and layout structure.

**Key Features**:
- React Router configuration
- Layout management with conditional navbar
- Route protection for archive viewer (full-screen)
- Responsive design with proper viewport handling

**Routing Structure**:
- `/` - Home page with archive creation form
- `/search` - Archive listing and management
- `/archive/:id` - Full-screen archive viewer

### Navbar Component
**File**: `src/components/Navbar.tsx`

Persistent navigation component for non-viewer pages.

**Features**:
- Brand identity with logo and name
- Active route highlighting
- Responsive design
- Sticky positioning
- Clean, minimal interface

## Pages

### HomePage
**File**: `src/pages/HomePage.tsx`

Landing page with website archiving functionality.

**Key Features**:
- **URL Input**: Large, prominent input field with validation
- **Real-time Validation**: URL format checking with visual feedback
- **Loading States**: Animated spinner during archive creation
- **Success/Error Handling**: Clear feedback with automatic navigation
- **Keyboard Support**: Enter key submission
- **Responsive Design**: Mobile-friendly layout

**State Management**:
- Form validation and error states
- Loading indicators
- Success messaging with redirection

**User Flow**:
1. User enters website URL
2. Client-side validation checks format
3. Submit request to backend API
4. Show loading state with progress
5. Display success/error message
6. Auto-redirect to archives page

### SearchPage
**File**: `src/pages/SearchPage.tsx`

Archive listing and management interface.

**Key Features**:
- **Archive Grid**: Responsive card layout for archive display
- **Real-time Updates**: Auto-refresh for processing archives
- **Status Indicators**: Visual status badges (processing, completed, failed)
- **Manual Refresh**: User-triggered data refresh
- **Empty States**: Helpful messaging when no archives exist
- **Archive Details**: Metadata display (pages, assets, dates, versions)

**Auto-refresh Logic**:
- Detects processing archives automatically
- Refreshes every 5 seconds when needed
- Visual indicator for auto-refresh status
- Background updates without disrupting UI

**Page Visibility Handling**:
- Refreshes when user returns to tab
- Refreshes when window regains focus
- Optimized for minimal data usage

**Archive Information Display**:
- Domain name and full URL
- Creation and completion timestamps
- Page and asset counts
- Version numbers
- Error messages for failed archives

### ArchiveViewer
**File**: `src/pages/ArchiveViewer.tsx`

Full-screen archive viewing experience.

**Key Features**:
- **Full-screen Layout**: No navbar for immersive viewing
- **Archive Status Handling**: Processing, completed, and failed states
- **Version Management**: View and switch between archive versions
- **Re-archiving**: Create new versions of existing archives
- **iframe Integration**: Secure sandboxed archive rendering
- **Progress Tracking**: Real-time status updates for processing archives

**Archive States**:
- **Processing**: Shows progress with auto-refresh
- **Completed**: Displays archive in iframe
- **Failed**: Shows error details with retry options

**Version History**:
- Modal interface for version selection
- Chronological version listing
- One-click version switching
- Current version highlighting

**Re-archiving Workflow**:
1. User clicks re-archive button
2. Creates new version via API
3. Shows success notification
4. Option to view new version immediately

## State Management

### Local Component State
Each component manages its own state using React hooks:

- `useState` for component data and UI state
- `useEffect` for lifecycle events and side effects
- `useNavigate` for programmatic navigation
- `useParams` for route parameters

### No Global State
The application uses a simple architecture without global state management:
- API calls made directly from components
- State is component-scoped and ephemeral
- Navigation state managed by React Router

## API Integration

### Backend Communication
All API calls use the native `fetch` API with proper error handling:

```typescript
// Archive creation
POST http://localhost:3001/api/archives/url
{
  "url": "https://example.com"
}

// Archive listing
GET http://localhost:3001/api/archives/list

// Archive status
GET http://localhost:3001/api/archives/status/{id}

// Re-archiving
POST http://localhost:3001/api/archives/rearchive
{
  "url": "https://example.com"
}

// Version history
GET http://localhost:3001/api/archives/versions?url={encoded_url}
```

### Error Handling Strategy
Comprehensive error handling across all API interactions:

1. **Network Errors**: Connection failures and timeouts
2. **HTTP Errors**: 4xx and 5xx status codes
3. **Validation Errors**: Invalid input data
4. **Loading States**: Prevent duplicate requests
5. **User Feedback**: Clear error messages

## Styling and Design

### Tailwind CSS
The application uses Tailwind CSS for styling:

- **Utility-first Approach**: Consistent spacing and colors
- **Responsive Design**: Mobile-first with breakpoint modifiers
- **Component Variants**: Conditional styling based on state
- **Custom Animations**: Loading spinners and transitions

### Design System
Consistent design patterns throughout:

**Colors**:
- Primary: Blue (600, 700) for actions
- Success: Green (50, 100, 600, 800) for success states
- Warning: Yellow (50, 100, 600, 800) for processing
- Error: Red (50, 100, 600, 800) for failures
- Neutral: Gray scale for text and backgrounds

**Typography**:
- Headlines: Bold, large text for page titles
- Body: Regular weight for content
- Metadata: Smaller, muted text for details

**Interactive Elements**:
- Hover states for all clickable elements
- Disabled states for unavailable actions
- Loading states with animated spinners
- Focus indicators for accessibility

### Responsive Behavior
Mobile-first responsive design:

- **Mobile**: Single column layouts, stacked elements
- **Tablet**: Grid layouts with 2 columns
- **Desktop**: Multi-column grids with 3+ columns
- **Navigation**: Collapsible on small screens

## User Experience Features

### Loading States
Comprehensive loading indicators:
- Skeleton screens for initial page loads
- Inline spinners for actions
- Progress indicators for long operations
- Disabled states during processing

### Auto-refresh Logic
Smart update system:
- Automatic detection of processing archives
- Configurable refresh intervals
- Visual indicators for auto-refresh status
- Manual refresh controls

### Error Recovery
Graceful error handling:
- Retry buttons for failed operations
- Clear error messaging
- Fallback content for missing data
- Navigation escape routes

### Accessibility
Built-in accessibility features:
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Performance Optimizations

### Efficient Rendering
- Conditional rendering based on state
- Minimal re-renders with proper key props
- Optimized useEffect dependencies
- Lazy loading for heavy components

### Network Optimization
- Debounced API calls where appropriate
- Background updates without loading states
- Cached data validation
- Minimal payload requests

### User Experience
- Optimistic UI updates
- Instant feedback for user actions
- Progressive enhancement
- Graceful degradation

## Development Workflow

### Development Server
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Organization
- One component per file
- Consistent naming conventions
- TypeScript interfaces for data structures
- Logical import grouping

### Error Boundaries
While not implemented in this version, the architecture supports:
- Component-level error boundaries
- Global error handling
- Error reporting and monitoring
- Graceful fallback UIs

The frontend provides a modern, responsive interface that makes web archiving accessible and user-friendly, with real-time updates and comprehensive error handling throughout the user journey.