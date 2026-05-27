import SibApiV3Sdk from "sib-api-v3-sdk";
import { env } from "./env.js";

/**
 * Brevo Transactional Email API client. Falls back to null when the API key
 * is missing so the app can still boot in development.
 */
export const brevoClient = env.brevoApiKey
  ? (() => {
      const client = SibApiV3Sdk.ApiClient.instance;
      client.authentications["api-key"].apiKey = env.brevoApiKey;
      return new SibApiV3Sdk.TransactionalEmailsApi();
    })()
  : null;

/** Default "from" address for all outgoing emails. */
export const emailFrom = env.emailFrom;
