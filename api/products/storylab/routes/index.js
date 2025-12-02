import express from 'express';
import projectsRouter from './projects.js';
import generationRouter from './generation.js';
import storyboardRouter from './storyboard.js';
import promptsRouter from './prompts.js';
import videosRouter from './videos.js';
import realPersonasRouter from './realPersonas.js';
import imageEditRouter from './imageEdit.js';

const router = express.Router();

// Mount StoryLab-specific routes
router.use('/projects', projectsRouter);
router.use('/generation', generationRouter);
router.use('/storyboard', storyboardRouter);
router.use('/prompts', promptsRouter);
router.use('/videos', videosRouter);
router.use('/realPersonas', realPersonasRouter);
router.use('/image-edit', imageEditRouter);

export default router;
