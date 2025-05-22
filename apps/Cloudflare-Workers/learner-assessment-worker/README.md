# Learner Assessment Worker

This Cloudflare Worker handles audio processing, transcription, and generation of robo teacher responses.

## Environment Variables

The following environment variables are required:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TRANSCRIBE_PROVIDER` | The transcription service provider to use | Yes | `huggingface` |
| `HF_URL` | The HuggingFace inference endpoint URL | Yes | `https://nhcmxrhlwlhdkrjm.us-east-1.aws.endpoints.huggingface.cloud` |
| `LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN` | Authentication token for HuggingFace API | **Yes** | None |

## Setting Up HuggingFace Token

The `LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN` is required for authentication with the HuggingFace inference API. To set it up:

1. Get your HuggingFace token from your account settings at [huggingface.co](https://huggingface.co/settings/tokens)

2. Set the token as a Wrangler secret:

```bash
# For development
wrangler secret put LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN --env development

# For production
wrangler secret put LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN --env production
```

## Troubleshooting

If you encounter a 401 Unauthorized error when using the transcription service, it's likely due to an invalid or missing HuggingFace token. Check the following:

1. Ensure `LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN` is set as a secret
2. Verify the token is correctly formatted and not expired
3. Check that the HF_URL is correct for your HuggingFace inference endpoint

## Debugging

You can view the worker logs with:

```bash
wrangler tail learner-assessment-worker
```

Look for log messages related to token validation and authentication issues.