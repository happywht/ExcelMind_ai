
import { Router } from 'express';
import { aiService } from '../services/aiService';
import { logger } from '@/utils/logger';

const router = Router();

// POST /api/ai/process
router.post('/process', async (req, res) => {
    try {
        const { rule, context } = req.body;

        if (!rule || !context) {
            return res.status(400).json({ error: 'Missing rule or context' });
        }

        const start = Date.now();
        const result = await aiService.processMappingRule(rule, context);
        const duration = Date.now() - start;

        logger.debug(`AI Rule processed in ${duration}ms. Rule: "${rule.slice(0, 30)}..."`);

        res.json({ result, duration });
    } catch (error: any) {
        logger.error('Error in /api/ai/process:', error);
        res.status(500).json({
            error: error.message || 'Internal AI Processing Error',
            details: error.toString()
        });
    }
});

export default router;
