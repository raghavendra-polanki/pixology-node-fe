import express from 'express';
import projectsRouter from './projects.js';
import generationRouter from './generation.js';
import teamsRouter from './teams.js';
import downloadRouter from './download.js';

const router = express.Router();

// Mount GameLab-specific routes
router.use('/projects', projectsRouter);
router.use('/generation', generationRouter);
router.use('/teams', teamsRouter);
router.use('/download', downloadRouter);

// TODO: Add other GameLab routes as needed
// router.use('/gallery', galleryRouter);
// etc.

export default router;
