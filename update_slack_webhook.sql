-- Update Slack webhook for Bournemouth franchise
UPDATE franchise_crm_configs 
SET slack_webhook_url = 'https://hooks.slack.com/services/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',
    updated_at = NOW()
WHERE city = 'bournemouth';

-- Verify the update
SELECT city, slack_webhook_url, updated_at 
FROM franchise_crm_configs 
WHERE city = 'bournemouth';
