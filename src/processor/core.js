import logger from "../utils/logger.js";
import { Helper } from "../utils/helper.js";
import { Api } from "telegram";
import { FloodWaitError } from "telegram/errors/RPCErrorList.js";

export class Core {
  /** @type {TelegramClient} */
  client;
  /** @type {string} */
  session;
  /** @type {EntityLike | Entity} */
  peer;
  /** @type {any} */
  bot;
  /** @type {any} */
  url;
  /** @type {boolean} */
  useDefaultQueryType;

  constructor(client, session, bot, url, useDefaultQueryType) {
    this.client = client;
    this.session = session;
    this.bot = bot;
    this.url = url;
    this.useDefaultQueryType = useDefaultQueryType;
  }

  async resolvePeer() {
    logger.info(`Session ${this.session} - Resolving Peer`);
    let attempts = 0;
    const maxAttempts = 5;

    while (this.peer == undefined && attempts < maxAttempts) {
      try {
        this.peer = await this.client.getEntity(this.bot);
        break;
      } catch (error) {
        if (error instanceof FloodWaitError) {
          const fls = error.seconds;
          logger.warn(`${this.client.session.serverAddress} | FloodWait ${error}`);
          logger.info(`${this.client.session.serverAddress} | Sleep ${fls}s`);
          await Helper.sleep((fls + 3) * 1000);
        } else if (error.message.includes('TIMEOUT')) {
          attempts++;
          logger.warn(`Timeout Error - Attempt ${attempts} of ${maxAttempts}`);
          if (attempts >= maxAttempts) {
            throw new Error('Maximum attempts reached for resolving peer');
          }
          await Helper.sleep(5000); // Wait before retrying
        } else {
          console.error(`Error resolving peer: ${error.message}`);
          throw error;
        }
      }
    }
  }

  async process() {
    try {
      logger.info(`Session ${this.session} - Processing`);
      this.user = await this.client.getMe();

      if (!this.bot || !this.url) {
        throw new Error("You need to set Bot Username and Bot Web Apps URL");
      }

      await this.resolvePeer();
      logger.info(`Session ${this.session} - Connecting to Webview`);
      
      const webView = await this.client.invoke(
        new Api.messages.RequestWebView({
          peer: this.peer,
          bot: this.peer,
          fromBotMenu: true,
          url: this.url, // Ensure the URL is fully qualified
          platform: "android",
        })
      );
      logger.info(`Session ${this.session} - Webview Connected`);

      const authUrl = webView.url;
      const tgData = Helper.getTelegramQuery(authUrl, this.useDefaultQueryType);
      
      return tgData; // Return query data for aggregation
    } catch (error) {
      console.error("Error during process execution:", error);
      logger.error(`Session ${this.session} Error - ${error.message}`);
      throw error;
    } finally {
      try {
        await this.client.disconnect();
        logger.info(`Session ${this.session} - Client disconnected`);
      } catch (disconnectError) {
        console.error("Error disconnecting client:", disconnectError);
        logger.error(`Session ${this.session} - Error disconnecting client: ${disconnectError}`);
      }
    }
  }
}
