# AI API Retry Implementation

This document explains the implementation of a robust retry mechanism for handling API rate limits and errors in the LynqIt Chat application.

## Problem

The AI API integration was experiencing issues with:
1. Rate limiting from the OpenRouter API
2. Error responses being shown to users instead of retrying
3. The model sometimes returning errors

## Solution

A comprehensive retry system has been implemented that:

1. Automatically retries API calls when rate limits are encountered
2. Uses exponential backoff to avoid overwhelming the API
3. Shows appropriate UI feedback during the retry process
4. Continues to retry until a successful response is received

## Implementation Details

### Backend Changes

1. **New Retry Utility (`lib/retryFetch.js`)**
   - Implements exponential backoff with jitter
   - Detects rate limit errors (HTTP 429 and specific error messages)
   - Configurable max retries, initial delay, and max delay
   - Custom retry conditions and retry callbacks

2. **AI Controller Enhancements**
   - Uses the retry utility for API calls
   - Shows a processing message during retries
   - Handles different error types appropriately
   - Tracks retry attempts in the background

### Frontend Changes

1. **AI Store Updates**
   - Handles temporary errors with auto-retry
   - Shows processing state to users during retries
   - Manages message state during retry cycles

2. **UI Enhancements**
   - Added visual indicators for processing/retry states
   - Different styling for temporary errors vs permanent errors
   - Progress indication for ongoing retries

## How It Works

1. When a user sends a message:
   - The frontend sends the request to the backend
   - The backend initiates the API call

2. If a rate limit is encountered:
   - The backend starts retrying with exponential backoff
   - A temporary response is sent to the frontend
   - The frontend displays a "processing/retrying" indicator

3. During retry attempts:
   - The backend continues trying with increasing delays
   - The frontend checks back periodically for the final response

4. Upon success:
   - The retry process stops
   - The final AI response is returned to the user
   - The temporary processing message is replaced with the actual response

## Configuration

The retry mechanism can be tuned by adjusting:
- `maxRetries`: Maximum number of retry attempts (default: 10)
- `initialDelay`: Initial delay before first retry in ms (default: 2000)
- `maxDelay`: Maximum delay between retries in ms (default: 45000)

## Error Handling

The system handles several types of errors:
1. Network errors - automatically retried
2. Rate limit errors (HTTP 429) - automatically retried
3. Rate limit messages in error responses - automatically retried
4. Other API errors - reported to the user after all retries fail

## Future Improvements

Potential enhancements to consider:
1. Server-sent events for real-time updates during long retry cycles
2. Fallback to alternative AI providers when one is consistently rate-limited
3. Batch processing of requests during high traffic periods
4. Queue management for multi-user environments
