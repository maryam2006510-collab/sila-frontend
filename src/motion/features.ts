// src/motion/features.ts
// Motion features, loaded lazily after first paint (07-motion §6: LazyMotion in the app).
// domMax is required because the segmented indicator uses shared layout (`layoutId`).
import { domMax } from 'motion/react';

export default domMax;
