import express from 'express';
import projectsRouter from './projects.js';

const router = express.Router();

// Mount FlairLab-specific routes
router.use('/projects', projectsRouter);

// TODO: Add other FlairLab routes as needed
// router.use('/generation', generationRouter);
// router.use('/gallery', galleryRouter);
// etc.

export default router;
