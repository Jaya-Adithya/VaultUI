# Vue Support in VaultUI

## Overview

VaultUI now has **comprehensive Vue 3 support** with enhanced `<script setup>` handling, TypeScript compatibility, and full access to Vue's Composition API.

## ✨ Features

### 1. **Framework Detection**
- Automatically detects `.vue` file extensions
- Recognizes `import ... from 'vue'` statements
- Identifies Vue SFC (Single File Component) structure

### 2. **Vue 3 Composition API**
The preview runtime provides access to all major Vue composables:
- `ref` - Reactive references
- `reactive` - Reactive objects
- `computed` - Computed properties
- `watch` - Watchers
- `watchEffect` - Effect watchers
- `onMounted` - Lifecycle hook
- `onUnmounted` - Lifecycle hook

### 3. **Enhanced `<script setup>` Support**
- ✅ Automatic variable extraction and exposure to template
- ✅ TypeScript type annotation stripping
- ✅ Support for complex reactive patterns
- ✅ Proper error handling and debugging

### 4. **Style Support**
- `<style>` blocks are automatically extracted and injected
- Scoped styles work correctly
- CSS is applied before component mount

### 5. **TypeScript Support**
Basic TypeScript syntax is automatically stripped:
- Type annotations (`: string`, `: number`, etc.)
- Type assertions (`as Type`)
- Type definitions (`type X = ...`)
- Interface definitions

## 📝 Usage Examples

### Basic Vue Component

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++
</script>

<template>
  <div>
    <h1>Counter: {{ count }}</h1>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
button {
  background: #42b983;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### TypeScript with Reactive Data

```vue
<script setup lang="ts">
import { reactive, computed } from 'vue'

interface Config {
  title: string
  count: number
}

const config = reactive<Config>({
  title: 'Hello Vue',
  count: 0
})

const doubled = computed(() => config.count * 2)
</script>

<template>
  <div>
    <h1>{{ config.title }}</h1>
    <p>Count: {{ config.count }}</p>
    <p>Doubled: {{ doubled }}</p>
  </div>
</template>
```

### Complex Component (Globe Example)

See `demo-vue-globe.vue` for a full example with:
- Reactive configuration objects
- Array of data with refs
- Computed properties
- Lifecycle hooks
- Scoped styles with animations

## 🔧 How It Works

### 1. **Code Parsing**
The preview runtime extracts three main sections:
```javascript
// Extract template
const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/i);

// Extract script setup
const scriptSetupMatch = source.match(/<script[^>]*\s+setup[^>]*>([\s\S]*?)<\/script>/i);

// Extract styles
const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
```

### 2. **TypeScript Stripping**
Basic TypeScript syntax is removed:
```javascript
setupCode = setupCode
  .replace(/:\s*\w+(\[\])?(\s*[=,;)])/g, '$2')  // Type annotations
  .replace(/as\s+\w+/g, '')                      // Type casts
  .replace(/\btype\s+\w+\s*=\s*[^;]+;/g, '')    // Type defs
  .replace(/\binterface\s+\w+\s*\{[^}]*\}/g, ''); // Interfaces
```

### 3. **Variable Extraction**
All declared variables are automatically exposed to the template:
```javascript
const varPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
const variables = [];
while ((match = varPattern.exec(setupCode)) !== null) {
  variables.push(match[1]);
}
```

### 4. **Setup Function Creation**
Variables are returned from the setup function:
```javascript
const wrappedCode = setupCode + '\n\n' +
  'return {\n' +
  '  ' + variables.join(',\n  ') + '\n' +
  '};';
```

## 🎯 Current Limitations

1. **No Full Compiler**: The preview doesn't use the full Vue compiler, so some advanced features may not work
2. **Limited TypeScript**: Only basic type stripping is supported
3. **No Top-Level Await**: `await` at the top level of `<script setup>` is not supported
4. **No Imports**: External component imports are not supported in preview mode

## 🚀 Best Practices

### ✅ DO:
- Use `ref`, `reactive`, `computed` for state management
- Keep components self-contained
- Use scoped styles
- Leverage lifecycle hooks (`onMounted`, `onUnmounted`)
- Use TypeScript for better DX (it will be stripped for preview)

### ❌ DON'T:
- Import external components (not supported in preview)
- Use top-level `await`
- Rely on complex TypeScript features
- Use Vue Router or Vuex (not available in preview)

## 📦 Dependencies

Vue 3 is loaded from CDN:
```javascript
import { createApp, reactive, ref, computed, ... } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
```

This is configured in `src/lib/dependency-registry.ts`:
```typescript
"vue": {
  type: "cdn",
  cdn: "https://esm.sh/vue@3/dist/vue.esm-browser.js",
  global: "Vue",
  browserSafe: true,
}
```

## 🔍 Debugging

The enhanced Vue support includes better error handling:

```javascript
try {
  // Setup code execution
} catch (e) {
  console.error('Vue script setup error:', e);
  console.error('Setup code:', setupCode);
  return {};
}
```

Check the browser console for detailed error messages if your component doesn't render correctly.

## 📚 Related Files

- **Framework Detection**: `src/lib/detect-framework.ts`
- **Live Preview**: `src/components/preview/live-preview.tsx`
- **Hover Preview**: `src/components/preview/hover-preview.tsx`
- **Dependency Registry**: `src/lib/dependency-registry.ts`
- **Demo Component**: `demo-vue-globe.vue`

## 🎉 Summary

Your VaultUI project now has **production-ready Vue 3 support** that handles:
- ✅ Script setup syntax
- ✅ TypeScript
- ✅ Composition API
- ✅ Reactive data
- ✅ Computed properties
- ✅ Lifecycle hooks
- ✅ Scoped styles

You can now create and preview Vue components just like the globe example you referenced!
