import input from "input"; // npm i input
import { Config } from "../config.js"; // Adjusted the path to the config.js file
import { Core } from "./processor/core.js";
import { Helper } from "./utils/helper.js";
import logger from "./utils/logger.js";
import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions/StoreSession.js";

let storeSession;
let sessionName;

async function sessionCreation() {
  const sessionList = Helper.getSession("sessions");
  let ctx = "Your session List:\n\n";

  for (const sess of sessionList) {
    ctx += `${sessionList.indexOf(sess) + 1}. ${sess}\n`;
  }
  if (sessionList.length === 0) {
    ctx += "<empty>\n\nPlease enter Session Name:";
  } else {
    ctx += "\n\nYou already have sessions, cancel(CTRL+C) or create new Session:";
  }

  const newSession = await input.text(ctx);
  sessionName = Helper.createDir(newSession);
}

async function sessionSelection() {
  const sessionList = Helper.getSession("sessions");
  if (sessionList.length === 0) {
    console.info("No sessions available. Please create a new session.");
    await sessionCreation();
    return;
  }

  let ctx = "Your session List:\n\n";
  for (const sess of sessionList) {
    ctx += `${sessionList.indexOf(sess) + 1}. ${sess}\n`;
  }

  ctx += "\n\nPlease select Session:";

  const newSession = await input.text(ctx);
  const selectedSession = sessionList[parseInt(newSession) - 1];

  if (selectedSession) {
    sessionName = `sessions/${selectedSession}`;
    console.info(`Using session ${selectedSession}`);
  } else {
    console.error("Invalid choice. Please try again.");
    await sessionSelection();
  }
}

async function onBoarding() {
  const choice = await input.text(
    "Welcome to Telegram Query Getter \nBy : Widiskel \n\nLet's get started.\n1. Create Session.\n2. Reset Sessions\n3. Get Query\n4. Process All Sessions\n\nInput your choice:"
  );
  if (choice == 1) {
    await sessionCreation();
    await onBoarding(); // Return to the welcome menu after creating a session
  } else if (choice == 2) {
    Helper.resetSession("sessions");
    await onBoarding(); // Return to the welcome menu after resetting sessions
  } else if (choice == 3) {
    if (Helper.getSession("sessions").length === 0) {
      console.info("You don't have any sessions, please create one first");
      await onBoarding(); // Return to the welcome menu if no sessions exist
    } else {
      await sessionSelection();
      await processSession(sessionName);
      await onBoarding(); // Return to the welcome menu after processing a single session
    }
  } else if (choice == 4) {
    const sessionList = Helper.getSession("sessions");
    if (sessionList.length === 0) {
      console.info("No sessions available to process.");
      await onBoarding(); // Return to the welcome menu if no sessions exist
    } else {
      for (const sess of sessionList) {
        sessionName = `sessions/${sess}`;
        await processSession(sessionName);
      }
      await postProcessingMenu(); // Prompt user after processing all sessions
    }
  } else {
    console.error("Invalid input, Please try again");
    await onBoarding(); // Return to the welcome menu for invalid input
  }
}

async function postProcessingMenu() {
  const choice = await input.text(
    "All sessions have been processed.\n\n1. Return to Welcome Menu\n2. Exit Program\n\nInput your choice:"
  );
  if (choice == 1) {
    await onBoarding(); // Return to the welcome menu
  } else if (choice == 2) {
    console.log("Exiting program...");
    logger.info("Program exited by user.");
    process.exit(0); // Exit the program
  } else {
    console.error("Invalid input, Please try again.");
    await postProcessingMenu(); // Prompt again if invalid input
  }
}

async function processSession(sessionPath) {
  let client; // Declare client variable here
  try {
    logger.info(`Processing session: ${sessionPath}`);

    // Ensure that API ID and Hash are configured in the config.js file
    if (!Config.TELEGRAM_APP_ID || !Config.TELEGRAM_APP_HASH) {
      throw new Error("Please configure your TELEGRAM_APP_ID and TELEGRAM_APP_HASH in the config.js file");
    }

    // Create session
    storeSession = new StoreSession(sessionPath);

    // Initialize Telegram client with the credentials from config.js
    client = new TelegramClient(
      storeSession,
      Number(Config.TELEGRAM_APP_ID), // Convert TELEGRAM_APP_ID to a number
      Config.TELEGRAM_APP_HASH,
      {
        connectionRetries: 10, // Increase retries
        connectionTimeout: 30, // Increase timeout (in seconds)
      }
    );

    // Start the Telegram client and request login details from the user
    await client.start({
      phoneNumber: async () =>
        await input.text("Enter your Telegram Phone Number: "),
      password: async () => await input.text("Enter your Telegram Password: "),
      phoneCode: async () =>
        await input.text("Enter the Telegram Verification Code you received: "),
      onError: (err) => console.log(err),
    });

    console.log("Connected.");
    logger.info(`Session ${sessionPath} - Connected`);
    storeSession.save(); // Save session

    // Start processing queries using the Core class
    await new Core(client, sessionPath).process();
  } catch (error) {
    console.error("Error processing session:", error);
    logger.error(`Session ${sessionPath} Error - ${error}`);
  } finally {
    if (client) {
      try {
        await client.disconnect(); // Ensure client disconnection
        console.log("Client disconnected.");
        logger.info(`Session ${sessionPath} - Client disconnected`);
      } catch (disconnectError) {
        console.error("Error disconnecting client:", disconnectError);
        logger.error(`Session ${sessionPath} - Error disconnecting client: ${disconnectError}`);
      }
    }
  }
}

(async () => {
  sessionName = "sessions";
  try {
    logger.info(`BOT STARTED`);
    await onBoarding();
  } catch (error) {
    console.error("Unhandled Error: ", error);
    logger.error(`Unhandled Error: ${error.message}`);
  }
})();
