// src/api.ts

// This file now acts as a "barrel" file, re-exporting all API functions
// from the modularized files inside the `/api` directory.
// This allows components to keep their existing import paths (`from '../api'`)
// without needing any changes after the refactor.

export * from './api/auth';
export * from './api/user';
export * from './api/intelligence';
export * from './api/livestream';
export * from './api/competitiveness';
export * from './api/documentProcessing';
export * from './api/deepInsight';
