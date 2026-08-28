# Raksha Bandhan Interactive Surprise — v2 + Private Access

A mobile-first cinematic Raksha Bandhan experience with five photos, smooth transitions, and a private four-digit access gate.

## Frontend

- HTML5, CSS3, vanilla JavaScript
- Five independently configurable photo slots
- Smooth cinematic transitions
- Responsive aspect-ratio handling
- Touch-first navigation
- `prefers-reduced-motion` support
- Final scene vertically and horizontally centered with mobile-safe viewport sizing

## Private photo flow

The public frontend does **not** contain personal photographs or PINs.

On load:

1. The visitor enters a four-digit code.
2. The frontend calls the Supabase Edge Function `raksha-photo-access`.
3. The function validates the PIN, availability window, and rate limit.
4. The function returns five temporary signed URLs for the matching private photo set.
5. The frontend replaces the five placeholders with those URLs and starts the existing cinematic experience.

Supabase project: `raksha-bandhan-surprise`
Private bucket: `raksha-photos`

## Photo paths

Upload exactly these files into the private bucket:

```text
experience-a/photo-01.jpg
experience-a/photo-02.jpg
experience-a/photo-03.jpg
experience-a/photo-04.jpg
experience-a/photo-05.jpg

experience-b/photo-01.jpg
experience-b/photo-02.jpg
experience-b/photo-03.jpg
experience-b/photo-04.jpg
experience-b/photo-05.jpg
```

PNG, JPEG, and WebP are supported. Keep each file under the bucket's configured 10 MB limit.

## Local testing

Serve the project over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Security notes

- The Storage bucket is private.
- The frontend only contains a Supabase publishable key.
- No service-role/secret key is shipped to the browser.
- The Edge Function performs custom four-digit PIN verification and rate limiting.
- Private photos are delivered through temporary signed URLs.
- The availability window is enforced server-side.
- Screenshots or copies made after a legitimate viewer receives an image cannot be prevented by a website; the design protects the stored originals from public repository exposure.

## Not included in the public repository

Never commit:

- Real personal photographs
- Supabase service-role keys
- Supabase secret keys
- Plaintext PINs
