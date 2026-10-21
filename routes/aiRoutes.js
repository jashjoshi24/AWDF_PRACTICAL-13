const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const aiRateLimiter = require('../middleware/rateLimiter');

// Initialize OpenAI client if key is configured
let openaiClient = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    try {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
        console.warn('OpenAI initialization note:', e.message);
    }
}

// Intelligent template generator for Graceful Degradation when external AI is offline/unconfigured
function generateFallbackTemplate(title) {
    const lower = title.toLowerCase();
    let priority = 'medium';
    let days = 3;
    let description = `Break down "${title}" into actionable subtasks, verify dependencies, and validate results before completion.`;

    if (lower.includes('bug') || lower.includes('fix') || lower.includes('error') || lower.includes('crash')) {
        priority = 'high';
        days = 1;
        description = `Investigate root cause of "${title}", reproduce issue locally, implement fix with regression tests, and verify in staging.`;
    } else if (lower.includes('docs') || lower.includes('readme') || lower.includes('note')) {
        priority = 'low';
        days = 5;
        description = `Review current documentation for "${title}", draft clear sections with examples, and publish updates.`;
    }

    return { description, priority, days };
}

// @route   POST /api/ai/generate-description
// @desc    Generate task description with graceful degradation & rate limiting
// @access  Public (API key securely kept on backend)
router.post('/generate-description', aiRateLimiter, async (req, res) => {
    const { title, testFailure } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Task title is required to generate description'
        });
    }

    const cleanTitle = title.trim();

    // Step 6 / Demo: Deliberate failure test toggle
    if (testFailure === true) {
        console.log('[AI Route] Simulating third-party API 401 Unauthorized failure...');
        return res.status(200).json({
            success: true,
            fallback: true,
            source: 'graceful-degradation-fallback',
            message: 'Third-party AI API failed (Simulated 401 / Timeout). Graceful degradation activated.',
            ...generateFallbackTemplate(cleanTitle)
        });
    }

    // Attempt OpenAI call if client configured
    if (openaiClient) {
        try {
            console.log(`[AI Route] Sending request to OpenAI API for: "${cleanTitle}"`);
            const completion = await openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful task management assistant. Write concise, actionable 1-2 sentence task descriptions.'
                    },
                    {
                        role: 'user',
                        content: `Write a short, professional task description for: ${cleanTitle}`
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            });

            const aiDescription = completion.choices[0]?.message?.content?.trim();
            const fallbackData = generateFallbackTemplate(cleanTitle);

            return res.status(200).json({
                success: true,
                fallback: false,
                source: 'openai-gpt-4o-mini',
                description: aiDescription,
                priority: fallbackData.priority,
                days: fallbackData.days,
                message: 'AI description generated successfully'
            });
        } catch (err) {
            console.error('[AI Error] OpenAI API call failed:', err.message);
            // Step 3 & 6: Graceful degradation catch block
            const fallbackData = generateFallbackTemplate(cleanTitle);
            return res.status(200).json({
                success: true,
                fallback: true,
                source: 'graceful-degradation-fallback',
                message: `AI service unavailable (${err.message}). Showing template suggestion.`,
                ...fallbackData
            });
        }
    }

    // Graceful fallback when no external API key is active
    const fallbackData = generateFallbackTemplate(cleanTitle);
    return res.status(200).json({
        success: true,
        fallback: true,
        source: 'graceful-degradation-fallback',
        message: 'AI API key not configured in .env. Serving template fallback without crashing application.',
        ...fallbackData
    });
});

module.exports = router;
