# Cross-Origin Isolation Best Practices

This document outlines the industrial best practices implemented in VaultUI for handling cross-origin isolation, which is required for WebContainer and SharedArrayBuffer features.

## What is Cross-Origin Isolation?

Cross-origin isolation is a browser security feature that enables powerful APIs like `SharedArrayBuffer` and `Atomics`. It requires two HTTP headers:

1. **Cross-Origin-Opener-Policy (COOP)**: `same-origin` - Isolates the browsing context
2. **Cross-Origin-Embedder-Policy (COEP)**: `require-corp` - Requires cross-origin resources to opt-in

When both headers are properly set, `window.crossOriginIsolated` becomes `true`.

## Why It's Needed

WebContainer (used for running Node.js in the browser) requires `SharedArrayBuffer`, which is only available when cross-origin isolation is enabled. Without it:
- WebContainer cannot boot
- Terminal features won't work
- Build/run commands will fail

## Implementation Best Practices

### 1. Reusable Hook (`useCrossOriginIsolation`)

**Location**: `src/lib/use-cross-origin-isolation.ts`

**Features**:
- Progressive checking with multiple attempts (headers may set asynchronously)
- Comprehensive diagnostics for debugging
- Clear error messages with actionable guidance
- Graceful handling of edge cases

**Usage**:
```typescript
import { useCrossOriginIsolation } from "@/lib/use-cross-origin-isolation";

function MyComponent() {
  const status = useCrossOriginIsolation();
  
  if (!status.isIsolated) {
    console.warn(status.error);
    console.info(status.diagnostics);
  }
}
```

### 2. Pre-Flight Validation

**Location**: `src/lib/use-webcontainer.ts`

WebContainer boot now checks for isolation **before** attempting to boot:

```typescript
const boot = useCallback(async () => {
  // Pre-flight check
  if (!isCrossOriginIsolated()) {
    throw new Error("WebContainer requires cross-origin isolation...");
  }
  // ... rest of boot logic
}, []);
```

**Benefits**:
- Fails fast with clear error messages
- Prevents cryptic browser errors
- Better user experience

### 3. Proxy Configuration

**Location**: `src/proxy.ts`

Headers are set consistently for routes that need isolation:

```typescript
if (pathname.startsWith('/component/') || pathname.startsWith('/tools/')) {
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff'); // Additional security
}
```

**Best Practices**:
- Set headers at the proxy level (not in individual routes)
- Use consistent header values
- Add security headers (X-Content-Type-Options) to prevent MIME sniffing

### 4. Diagnostic Utilities

**Location**: `src/lib/cross-origin-diagnostics.ts`

Provides tools for debugging isolation issues:

```typescript
import { printDiagnostics, getClientDiagnostics } from "@/lib/cross-origin-diagnostics";

// In browser console:
printDiagnostics();

// Programmatically:
const diagnostics = getClientDiagnostics();
```

### 5. UI Components

**Location**: `src/components/ui/isolation-status.tsx`

Reusable component for displaying isolation status:

```typescript
import { IsolationStatus } from "@/components/ui/isolation-status";

<IsolationStatus variant="badge" />
```

## Troubleshooting

### Issue: Isolation Missing in Development

**Solutions**:
1. Restart the dev server (headers may not apply on first load)
2. Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Check proxy is running: Verify `src/proxy.ts` is being executed
4. Check browser DevTools → Network → Response Headers

### Issue: Isolation Missing in Production

**Solutions**:
1. Ensure you're using HTTPS (isolation requires HTTPS in production)
2. Verify proxy is deployed and running
3. Check reverse proxy/CDN isn't stripping headers
4. Verify headers in production: Use browser DevTools to inspect response headers

### Issue: Headers Set But Still Not Isolated

**Possible Causes**:
1. **Mixed content**: Loading HTTP resources on HTTPS page
2. **Third-party scripts**: External scripts without CORP headers
3. **Images/assets**: Cross-origin images without CORP headers
4. **Iframe issues**: Embedded content blocking isolation

**Solutions**:
- Use `credentialless` COEP for preview frames (see `src/app/preview/frame/route.ts`)
- Ensure all external resources have CORP headers or use same-origin
- Check browser console for specific blocking resources

## Testing

### Manual Testing

1. Open browser DevTools → Console
2. Check `window.crossOriginIsolated` (should be `true`)
3. Check `typeof SharedArrayBuffer` (should be `function`)
4. Run diagnostic utility: `printDiagnostics()` in console

### Automated Testing

```typescript
// Example test
test('cross-origin isolation is enabled', () => {
  expect(window.crossOriginIsolated).toBe(true);
  expect(typeof SharedArrayBuffer).toBe('function');
});
```

## Configuration Checklist

- [ ] Proxy sets COOP/COEP headers for `/component/` and `/tools/` routes
- [ ] Preview routes use `credentialless` COEP (not `require-corp`)
- [ ] HTTPS is configured for production
- [ ] All external resources have CORP headers or are same-origin
- [ ] No mixed content (HTTP on HTTPS page)
- [ ] Browser DevTools shows headers in Network tab

## Additional Resources

- [MDN: Cross-Origin Isolation](https://developer.mozilla.org/en-US/docs/Web/API/cors)
- [WebContainer Documentation](https://webcontainers.io/)
- [COOP/COEP Explainer](https://github.com/whatwg/html/issues/5334)

## Support

If issues persist:
1. Run `printDiagnostics()` in browser console
2. Check proxy logs
3. Verify headers in Network tab
4. Review browser console for specific errors


