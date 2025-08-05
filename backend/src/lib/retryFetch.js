/**
 * A utility function to retry API calls with exponential backoff
 * Especially helpful for handling rate limits
 * 
 * @param {Function} fetchFn - An async function that performs the fetch operation
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 5)
 * @param {number} options.initialDelay - Initial delay in ms before first retry (default: 1000)
 * @param {number} options.maxDelay - Maximum delay between retries in ms (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if retry should happen (default: retry on rate limit errors)
 * @param {Function} options.onRetry - Callback function called before each retry
 * @returns {Promise<Object>} - The successful response or throws after max retries
 */
export const retryFetch = async (fetchFn, options = {}) => {
  const {
    maxRetries = 30,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (err, response, data) => {
      // By default, retry on network errors or rate limit errors
      if (err) return true;
      
      // Rate limit status codes: 429 (Too Many Requests)
      if (response.status === 429) return true;
      
      // Check for rate limit in error message
      if (data?.error?.message?.toLowerCase().includes('rate limit')) return true;
      if (data?.error?.raw?.toLowerCase().includes('rate limit')) return true;
      
      return false;
    },
    onRetry = (attempt, delay, error) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms delay. Error: ${error?.message || JSON.stringify(error)}`);
    }
  } = options;

  let attempt = 0;
  let lastError = null;
  let lastResponse = null;
  let lastData = null;

  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.1), maxDelay);
        onRetry(attempt, delay, lastError || { message: `Status: ${lastResponse?.status}` });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetchFn();
      const data = await response.json();
      
      // If response is successful, return immediately
      if (response.ok) {
        return { response, data };
      }
      
      // Store response and data for later
      lastResponse = response;
      lastData = data;
      
      // Check if we should retry
      if (!shouldRetry(null, response, data)) {
        throw new Error(`Request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
    } catch (error) {
      lastError = error;
      
      // Only retry if shouldRetry returns true
      if (!shouldRetry(error, null, null)) {
        throw error;
      }
    }
    
    attempt++;
  }

  // If we've exhausted all retries
  throw new Error(`Failed after ${maxRetries} retries. Last error: ${lastError?.message || JSON.stringify(lastError)}`);
};
