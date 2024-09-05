import input from "input"; // npm i input
import { Config } from "../config.js"; // Adjusted the path to the config.js file
import { Core } from "./processor/core.js";
import { Helper } from "./utils/helper.js";
import logger from "./utils/logger.js";
import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions/StoreSession.js";
import { botUrlList } from "./utils/bot_url_list.js"; // Import botUrlList

let sessionName;

async function sessionCreation() {
  const sessionList = Helper.getSession("sessions");
  let ctx = "Your session List:\n\n";

  for (const sess of sessionList) {
    ctx += `${sessionList.indexOf(sess) + 1}. ${sess}\n`;
  }
  ctx += sessionList.length === 0
    ? "<empty>\n\nPlease enter Session Name:"
    : "\n\nYou already have sessions, cancel(CTRL+C) or create new Session:";

  const newSession = await input.text(ctx);
  sessionName = Helper.createDir(newSession);

  // Create a new Telegram Client for session
  const client = new TelegramClient(
    new StoreSession(sessionName),
    Number(Config.TELEGRAM_APP_ID),
    Config.TELEGRAM_APP_HASH,
    {
      connectionRetries: 10,
      connectionTimeout: 30,
    }
  );

  // Start the login process
  try {
    await client.start({
      phoneNumber: async () => await input.text("Enter your Telegram Phone Number: "),
      password: async () => await input.text("Enter your Telegram Password: "),
      phoneCode: async () => await input.text("Enter the Telegram Verification Code you received: "),
      onError: (err) => console.log(err),
    });

    console.log("Session created and logged in successfully.");
    logger.info(`Session ${newSession} - Created and connected`);

  } catch (error) {
    console.error(`Error creating session ${newSession}:`, error);
    logger.error(`Session ${newSession} Error - ${error.message}`);
  } finally {
    try {
      await client.disconnect();
      console.log("Client disconnected.");
      logger.info(`Session ${newSession} - Client disconnected`);
    } catch (disconnectError) {
      console.error("Error disconnecting client:", disconnectError);
      logger.error(`Session ${newSession} - Error disconnecting client: ${disconnectError}`);
    }
  }

  // Return to the welcome menu after session creation
  await onBoarding();
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
  switch (parseInt(choice)) {
    case 1:
      await sessionCreation();
      await onBoarding(); // Return to the welcome menu after creating a session
      break;
    case 2:
      Helper.resetSession("sessions");
      await onBoarding(); // Return to the welcome menu after resetting sessions
      break;
    case 3:
      if (Helper.getSession("sessions").length === 0) {
        console.info("You don't have any sessions, please create one first");
        await onBoarding(); // Return to the welcome menu if no sessions exist
      } else {
        await sessionSelection();
        await processSingleSession(sessionName); // Process a single session
        await onBoarding(); // Return to the welcome menu after processing a single session
      }
      break;
    case 4:
      await processAllSessions(); // Process all sessions
      await postProcessingMenu(); // Prompt user after processing all sessions
      break;
    default:
      console.error("Invalid input, Please try again");
      await onBoarding(); // Return to the welcome menu for invalid input
      break;
  }
}

async function processSingleSession(session) {
  const sessionList = Helper.getSession("sessions");
  if (sessionList.length === 0) {
    console.info("No sessions available to process.");
    return;
  }

  const chosenBot = await selectBot();
  const url = chosenBot.url;
  const useDefaultQueryType = await selectQueryResultType();

  const client = new TelegramClient(
    new StoreSession(session),
    Number(Config.TELEGRAM_APP_ID),
    Config.TELEGRAM_APP_HASH,
    {
      connectionRetries: 10,        // Number of retry attempts
      connectionTimeout: 60 * 1000, // Set timeout to 60 seconds (60000 ms)
    }
  );

  try {
    await client.start({
      phoneNumber: async () => await input.text("Enter your Telegram Phone Number: "),
      password: async () => await input.text("Enter your Telegram Password: "),
      phoneCode: async () => await input.text("Enter the Telegram Verification Code you received: "),
      onError: (err) => console.log(err),
    });

    console.log("Connected.");
    logger.info(`Session ${session} - Connected`);
    const core = new Core(client, session, chosenBot.bot, url, useDefaultQueryType);
    const queryData = await core.process();
    console.log(`Query Data for session ${session}: ${queryData}`);
  } catch (error) {
    console.error(`Error processing session ${session}:`, error);
    logger.error(`Session ${session} Error - ${error.message}`);
  } finally {
    try {
      await client.disconnect();
      console.log("Client disconnected.");
      logger.info(`Session ${session} - Client disconnected`);
    } catch (disconnectError) {
      console.error("Error disconnecting client:", disconnectError);
      logger.error(`Session ${session} - Error disconnecting client: ${disconnectError}`);
    }
  }
}

async function processAllSessions() {
  const sessionList = Helper.getSession("sessions");
  if (sessionList.length === 0) {
    console.info("No sessions available to process.");
    return;
  }

  const chosenBot = await selectBot();
  const url = chosenBot.url;
  const useDefaultQueryType = await selectQueryResultType();

  const queryResults = [];

  for (const sess of sessionList) {
    const sessionName = `sessions/${sess}`;
    const client = new TelegramClient(
      new StoreSession(sessionName),
      Number(Config.TELEGRAM_APP_ID),
      Config.TELEGRAM_APP_HASH,
      {
        connectionRetries: 10,        // Number of retry attempts
        connectionTimeout: 60 * 1000, // Set timeout to 60 seconds (60000 ms)
      }
    );

    try {
      await client.start({
        phoneNumber: async () => await input.text("Enter your Telegram Phone Number: "),
        password: async () => await input.text("Enter your Telegram Password: "),
        phoneCode: async () => await input.text("Enter the Telegram Verification Code you received: "),
        onError: (err) => console.log(err),
      });

      console.log("Connected.");
      logger.info(`Session ${sessionName} - Connected`);
      const core = new Core(client, sessionName, chosenBot.bot, url, useDefaultQueryType);
      const queryData = await core.process();
      queryResults.push(queryData);
    } catch (error) {
      console.error(`Error processing session ${sess}:`, error);
      logger.error(`Session ${sessionName} Error - ${error.message}`);
    } finally {
      try {
        await client.disconnect();
        console.log("Client disconnected.");
        logger.info(`Session ${sessionName} - Client disconnected`);
      } catch (disconnectError) {
        console.error("Error disconnecting client:", disconnectError);
        logger.error(`Session ${sessionName} - Error disconnecting client: ${disconnectError}`);
      }
    }
  }

  // Display all collected queries after processing all sessions
  console.log("\nAggregated Queries from All Sessions:\n");
  queryResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result}`);
  });
}

async function selectBot() {
  // Show bot list
  let botOptions = "Bot List:\n";
  botUrlList.forEach((item, index) => {
    botOptions += `${index + 1}. ${item.bot}\n`;
  });

  const botChoiceIndex = parseInt(await input.text(`${botOptions}\nEnter bot number to connect:`)) - 1;
  const chosenBot = botUrlList[botChoiceIndex];
  if (!chosenBot) {
    console.error("Invalid bot choice.");
    throw new Error("Invalid bot choice.");
  }
  return chosenBot;
}

async function selectQueryResultType() {
  return await input.text(
    "Select Query Result Type ?\n \n1. URI Component \n2. JSON String\n3. Init Params (DEFAULT)\n \nPlease select result type :"
  );
}

async function postProcessingMenu() {
  const choice = await input.text(
    "All sessions have been processed.\n\n1. Return to Welcome Menu\n2. Exit Program\n\nInput your choice:"
  );
  switch (parseInt(choice)) {
    case 1:
      await onBoarding(); // Return to the welcome menu
      break;
    case 2:
      console.log("Exiting program...");
      logger.info("Program exited by user.");
      process.exit(0); // Exit the program
      break;
    default:
      console.error("Invalid input, Please try again.");
      await postProcessingMenu(); // Prompt again if invalid input
      break;
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
