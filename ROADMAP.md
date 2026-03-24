# Future Features & Extension Guide

This document outlines possible enhancements and how to implement them.

## Feature Ideas (Priority Order)

### High Priority (v1.5)

#### 1. Delete Functionality
**Files to modify:**
- `app/api/songs/delete/route.ts` (new)
- `app/api/versions/delete/route.ts` (new)
- `app/api/threads/delete/route.ts` (new)
- `app/api/comments/delete/route.ts` (new)
- UI components to add delete buttons

**Implementation:**
```typescript
// Example: Delete song
export async function POST(req: NextRequest) {
  const { songId } = await req.json();
  const { error } = await supabaseServer
    .from('songs')
    .delete()
    .eq('id', songId);
  return NextResponse.json({ success: !error });
}
```

#### 2. Edit Comments
**Files to modify:**
- `app/api/comments/update/route.ts` (new)
- Version page to show edit button on own comments

**Implementation:**
```typescript
// Update comment
const { error } = await supabaseServer
  .from('comments')
  .update({ body: newBody })
  .eq('id', commentId)
  .eq('author', currentUser); // Only edit own comments
```

#### 3. Pin Important Comments
**Files to modify:**
- Add `pinned` boolean to `comment_threads` table
- `app/api/threads/pin/route.ts` (new)
- UI to show pinned comments first

#### 4. User Typing Indicators
**Files to modify:**
- Add real-time subscription to Supabase
- Add `typing_indicator` table
- Subscribe to changes in version page

```typescript
// Real-time subscription
supabase
  .channel('typing')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'typing_indicator' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

### Medium Priority (v2.0)

#### 5. User Accounts (Optional)
**Breaking change** - requires significant refactoring

**Instead of hardcoded Coris/Al:**
- Use Supabase Auth (email + password or OAuth)
- Add `users` table with email, name, etc.
- Link comments/creations to `user_id` instead of text name
- UI for user management

#### 6. Timeline / Activity Feed
**Files to modify:**
- `app/activity/page.tsx` (new)
- Query comments, versions created in last 24h
- Display chronologically

#### 7. Audio Waveform Markup
**Files to modify:**
- Add drawing tools to WaveSurfer
- Mark regions for different sections
- Save regions to database

**Example using WaveSurfer:**
```typescript
// Add region
wavesurfer.addRegion({
  start: 0,
  end: 5,
  content: 'Intro',
  color: 'rgba(0, 0, 0, 0.1)'
});
```

#### 8. Version Comparison
**Files to modify:**
- `app/songs/[id]/compare/page.tsx` (new)
- Side-by-side waveforms
- Highlight differences in comments

#### 9. Collaboration Invites
**Files to modify:**
- `invites` table (new)
- `app/api/invites/create/route.ts` (new)
- Email invite links
- Accept/decline flow

### Lower Priority (v3.0+)

#### 10. Multi-track Audio
- Merge multiple tracks
- Separate mixing levels
- Requires audio processing library (e.g., Web Audio API)

#### 11. Export/Render
- Export song with comments as HTML document
- Export as PDF with waveform and comment timeline
- Export audio with embedded metadata

#### 12. Slack Integration
- Notify Slack instead of email
- Create Slack thread for each comment thread
- Bidirectional syncing

#### 13. Mobile App
- React Native version
- Push notifications
- Offline support

#### 14. Video Support
- Play video alongside audio
- Comment on specific video timestamp
- Useful for music videos or song visuals

---

## Implementation Guides

### Adding a New Database Table

1. **Design table in SUPABASE_SCHEMA.sql**
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON new_table FOR ALL USING (true);
```

2. **Update Supabase**
- In SQL Editor, create table
- Verify in Data Studio

3. **Update app code**
```typescript
// In lib/supabase.ts or API route
const { data } = await supabase
  .from('new_table')
  .select('*');
```

### Adding a New API Route

1. **Create file**: `app/api/[resource]/[action]/route.ts`

2. **Structure**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { param1, param2 } = await req.json();
    
    // Validate
    if (!param1) {
      return NextResponse.json(
        { error: 'Missing param1' },
        { status: 400 }
      );
    }
    
    // Execute
    const { data, error } = await supabaseServer
      .from('table')
      .insert([{ param1, param2 }])
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
```

3. **Call from client**:
```typescript
const response = await fetch('/api/resource/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ param1: 'value' })
});
const data = await response.json();
```

### Adding a New Page

1. **Create**: `app/new-feature/page.tsx`

2. **Structure**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { getAuth, getIdentity } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import styles from './feature.module.css';

export default function FeaturePage() {
  const router = useRouter();
  const identity = getIdentity();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuth() || !identity) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1>Feature Title</h1>
      {/* Content here */}
    </div>
  );
}
```

3. **Create styles**: `app/new-feature/feature.module.css`

4. **Add to nav** (if needed): Update dashboard or menu

### Adding a Real-time Feature

Using Supabase subscriptions:

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('room1')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      },
      (payload) => {
        console.log('New comment:', payload.new);
        // Update UI
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

### Adding Authentication

**Option 1: Keep current system** (recommended for now)
- Only Coris and Al
- No new users

**Option 2: Add email/password auth**
```typescript
// Using Supabase Auth
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});
```

**Option 3: Add OAuth (Google, GitHub)**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: location.origin }
});
```

### Styling New Components

**Color Palette** (consistent with v1):
```css
:root {
  --color-bg: #ffffff;
  --color-text: #000000;
  --color-border: #000000;
  --color-secondary: #666666;
  --color-tertiary: #999999;
  --color-error: #cc0000;
  --color-hover: #f0f0f0;
}
```

**Typography**:
- Font: Helvetica, Arial, sans-serif
- No decorative fonts
- Size: 14px for body, 16-32px for headings

**Layout**:
- Max-width: 900-1200px
- Padding: 20-40px
- No shadows
- Simple 1px borders

---

## Testing New Features

### Unit Tests (with Jest)

```typescript
// example.test.ts
import { formatTimestamp } from '@/lib/auth';

describe('formatTimestamp', () => {
  it('formats seconds to m:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(65)).toBe('1:05');
    expect(formatTimestamp(3661)).toBe('61:01');
  });
});
```

### E2E Tests (with Cypress)

```typescript
// cypress/e2e/comment.cy.ts
describe('Comments', () => {
  it('creates a comment', () => {
    cy.visit('http://localhost:3000');
    cy.get('input[type="password"]').type('further_forever');
    cy.get('button').contains('Enter').click();
    cy.get('button').contains('Coris').click();
    // ... continue flow
  });
});
```

---

## Performance Considerations

### Pagination (for large datasets)

```typescript
// Load 50 songs per page
const PAGE_SIZE = 50;

const { data, error } = await supabase
  .from('songs')
  .select('*')
  .range(0, PAGE_SIZE - 1);
```

### Caching

```typescript
// Cache song data for 1 minute
const CACHE_KEY = `songs_${userId}`;
const cached = sessionStorage.getItem(CACHE_KEY);
const cacheAge = Date.now() - JSON.parse(cached || '{}').timestamp;

if (cached && cacheAge < 60000) {
  return JSON.parse(cached).data;
}
```

### Lazy Loading

```typescript
// Load waveform only when needed
const [showWaveform, setShowWaveform] = useState(false);

useEffect(() => {
  if (!showWaveform) return;
  loadWaveform();
}, [showWaveform]);
```

---

## Security Considerations

### Input Validation

```typescript
// Always validate on server
if (!title || title.length > 255) {
  throw new Error('Invalid title');
}
if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  throw new Error('Invalid email');
}
```

### SQL Injection Prevention

```typescript
// ✅ Good - parameterized queries
const { data } = await supabase
  .from('songs')
  .select('*')
  .eq('id', userId); // Parameterized

// ❌ Bad - string interpolation
const { data } = await supabase
  .from('songs')
  .select(`* where id = '${userId}'`); // NEVER DO THIS
```

### CORS

```typescript
// Supabase handles CORS automatically
// If self-hosting, configure:
const corsOptions = {
  origin: ['https://yourdomain.com'],
  credentials: true
};
```

---

## Monitoring & Analytics

### Basic Analytics

```typescript
// Track feature usage
const trackEvent = (event: string, properties?: object) => {
  console.log('Event:', event, properties);
  // Could send to analytics service
};

// Usage
trackEvent('comment_created', { versionId, timestamp });
```

### Error Tracking

```typescript
// Send errors to service like Sentry
Sentry.captureException(error);
```

### Performance Monitoring

```typescript
// Measure load times
const start = performance.now();
await loadSongs();
const duration = performance.now() - start;
console.log(`Loaded songs in ${duration}ms`);
```

---

## Deployment Considerations

### Database Migrations

For Supabase:
```sql
-- Create new table
ALTER TABLE table_name ADD COLUMN new_column TEXT;

-- Add constraint
ALTER TABLE table_name ALTER COLUMN new_column SET NOT NULL;
```

### Backwards Compatibility

- Always make migrations backwards compatible
- Don't remove columns in production
- Hide UI features before code removal

### Blue-Green Deployment

```bash
# Vercel handles this automatically
# Deploy new version, Vercel switches traffic when ready
# If issue, can rollback immediately
```

---

## Documentation Updates

When adding features:
1. Update `README.md` with new feature
2. Add API docs to `PROJECT_OVERVIEW.md`
3. Update `TESTING.md` with test scenarios
4. Add setup instructions to `DEPLOYMENT.md`

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature

# Create Pull Request on GitHub
# Ask for review
# Merge after approval
```

---

## Getting Community Help

- GitHub Issues for bugs
- GitHub Discussions for features
- Stack Overflow for technical questions
- Supabase Discord for database help

---

**Remember:** Start simple, test thoroughly, document well, and deploy confidently!
