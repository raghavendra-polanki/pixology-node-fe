import express from 'express';
import projectsRouter from './projects.js';
import generationRouter from './generation.js';
import teamsRouter from './teams.js';
import downloadRouter from './download.js';
import promptsRouter from './prompts.js';
import imageEditRouter from './imageEdit.js';

const router = express.Router();

// Mount FlareLab-specific routes
router.use('/projects', projectsRouter);
router.use('/generation', generationRouter);
router.use('/teams', teamsRouter);
router.use('/download', downloadRouter);
router.use('/prompts', promptsRouter);
router.use('/image-edit', imageEditRouter);

export default router;
