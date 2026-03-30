/**
 * ============================================================================
 * INTEGRATION TOOL PATTERN — Reference Example
 * ============================================================================
 *
 * This file is a DOCUMENTED PATTERN, not a usable tool. It shows how to build
 * tools that depend on external services or SDKs the user must configure.
 *
 * Key principles:
 *
 * 1. CREDENTIAL CHECK FIRST
 *    Before doing any work, check that the required credentials or config
 *    exist (env vars, config files, etc.). If they're missing, return a
 *    structured "not_configured" response — never throw.
 *
 * 2. GRACEFUL DEGRADATION
 *    The agent can relay the not_configured message to the user, explaining
 *    what needs to be set up. The agent stays functional; only the specific
 *    tool is unavailable.
 *
 * 3. CLEAR INTEGRATION POINT
 *    Mark the exact spot where the user adds their SDK call with a comment
 *    block: `// --- Integration point: add SDK call here ---`
 *    This makes it immediately obvious what needs to be implemented.
 *
 * 4. TYPED RETURN SHAPE
 *    Always define what the tool returns on success, so the agent knows the
 *    data structure it will receive. Use `as const` on status literals for
 *    type narrowing.
 *
 * 5. ERROR HANDLING
 *    Wrap the integration call in try/catch. Return structured error objects
 *    instead of throwing, so the agent can reason about failures.
 *
 * Below is a complete example using a fictional "weather API" to keep it
 * generic. Copy this pattern and adapt it for your real integration.
 * ============================================================================
 */

import { tool } from "ai";
import { z } from "zod";

/**
 * Example integration tool: get current weather for a location.
 *
 * This demonstrates the pattern — replace the weather API with your
 * actual external service (AWS SDK, Stripe, database client, etc.).
 */
export const getWeather = tool({
  description:
    "Get the current weather for a location. Requires a weather API key to be configured.",
  inputSchema: z.object({
    location: z
      .string()
      .describe('City name or coordinates, e.g. "San Francisco" or "37.7749,-122.4194"'),
    units: z
      .enum(["celsius", "fahrenheit"])
      .optional()
      .describe("Temperature units (defaults to celsius)"),
  }),
  execute: async ({ location, units = "celsius" }) => {
    // =========================================================================
    // Step 1: Credential check
    //
    // Check that all required credentials / config exist BEFORE doing any work.
    // Return a structured response if anything is missing — never throw.
    // =========================================================================
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return {
        status: "not_configured" as const,
        message:
          "Weather API key not found. Set the WEATHER_API_KEY environment variable.",
        setup:
          "Sign up at https://example.com/weather-api, copy your API key, and add WEATHER_API_KEY=your-key to your .env file.",
      };
    }

    // =========================================================================
    // Step 2: Input validation (beyond what Zod handles)
    //
    // Add any business-logic validation here — things Zod can't express,
    // like checking that a location string isn't empty after trimming.
    // =========================================================================
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      return {
        status: "error" as const,
        message: "Location cannot be empty.",
      };
    }

    // =========================================================================
    // Step 3: Integration point
    //
    // This is where the actual SDK / API call goes. The placeholder below
    // shows the expected return shape. Replace it with real implementation.
    // =========================================================================
    try {
      // --- Integration point: add SDK call here ---
      //
      // Example of what the real implementation would look like:
      //
      //   const response = await fetch(
      //     `https://api.example.com/weather?location=${encodeURIComponent(trimmedLocation)}&units=${units}`,
      //     { headers: { "Authorization": `Bearer ${apiKey}` } }
      //   );
      //
      //   if (!response.ok) {
      //     return {
      //       status: "error" as const,
      //       message: `Weather API returned ${response.status}: ${await response.text()}`,
      //     };
      //   }
      //
      //   const data = await response.json();
      //
      //   return {
      //     status: "ok" as const,
      //     location: data.location,
      //     temperature: data.temperature,
      //     units,
      //     conditions: data.conditions,
      //     humidity: data.humidity,
      //     windSpeed: data.windSpeed,
      //   };
      //
      // --- End integration point ---

      // Placeholder return — remove this when you add the real SDK call above.
      // This shows the agent what shape to expect from a successful response.
      return {
        status: "not_implemented" as const,
        message:
          "Weather API integration point — replace the placeholder in this tool with your actual API call.",
        expectedReturnShape: {
          status: "ok",
          location: "San Francisco",
          temperature: 18,
          units: "celsius",
          conditions: "partly cloudy",
          humidity: 65,
          windSpeed: 12,
        },
      };
    } catch (err) {
      // =====================================================================
      // Step 4: Error handling
      //
      // Catch SDK / network errors and return structured error objects.
      // The agent can tell the user what went wrong without crashing.
      // =====================================================================
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      return {
        status: "error" as const,
        message: `Weather API call failed: ${message}`,
      };
    }
  },
});
