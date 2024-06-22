import input from "input"; // npm i input
import { Config } from "../config.js";
import { Core } from "./processor/core.js";
import { Helper } from "./utils/helper.js";
import logger from "./utils/logger.js";
import { TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions/StoreSession.js";

let storeSession;
let sessionName;

async function sessionCreation() {
  const sessionList = Helper.getSession("sessions");
  let ctx = "Your session List :\n \n";

  for (const sess of sessionList) {
    ctx += `${sessionList.indexOf(sess) + 1}. ${sess}\n`;
  }
  if (sessionList.length == 0) {
    ctx += "<empty> \n \nPlease enter Session Name :";
  } else {
    ctx +=
      "\n \nYou alreay have sessions, cancel(CTRL+C) or create new Session :";
  }

  const newSession = await input.text(ctx);
  sessionName = Helper.createDir(newSession);
}
async function sessionSelection() {
  const sessionList = Helper.getSession("sessions");
  let ctx = "Your session List :\n \n";

  for (const sess of sessionList) {
    ctx += `${sessionList.indexOf(sess) + 1}. ${sess}\n`;
  }

  ctx += "\n \nPlease select Session :";

  const newSession = await input.text(ctx);
  const selectedSession = sessionList[parseInt(newSession) - 1];

  if (selectedSession) {
    sessionName = "sessions/" + selectedSession;
    console.info(`Using sessions ${selectedSession}`);
  } else {
    console.error("Invalid choice. Please try again.");
    await sessionSelection();
  }
}

async function onBoarding() {
  const choice = await input.text(
    "Welcome to Telegram Query Getter \nBy : Widiskel \n \nLets getting started. \n1. Create Session. \n2. Reset Sessions \n3. Get Query \n \nInput your choice :"
  );
  if (choice == 1) {
    await sessionCreation();
  } else if (choice == 2) {
    Helper.resetSession(sessionName);
    await onBoarding();
  } else if (choice == 3) {
    if (Helper.getSession(sessionName)?.length == 0) {
      console.info("You don't have any sessions, please create first");
      await onBoarding();
    } else {
      await sessionSelection();
    }
  } else {
    console.error("Invalid input, Please try again");
    await onBoarding();
  }
}

(async () => {
  sessionName = "sessions";
  try {
    logger.info(`BOT STARTED`);
    await onBoarding();
    logger.info(`Using Session : ${sessionName}`);
    if (
      Config.TELEGRAM_APP_ID == undefined ||
      Config.TELEGRAM_APP_HASH == undefined
    ) {
      throw new Error(
        "Please configure your TELEGRAM_APP_ID and TELEGRAM_APP_HASH first"
      );
    }
    storeSession = new StoreSession(sessionName);
    const client = new TelegramClient(
      storeSession,
      Config.TELEGRAM_APP_ID,
      Config.TELEGRAM_APP_HASH,
      {
        connectionRetries: 5,
      }
    );

    await client.start({
      phoneNumber: async () =>
        await input.text("Enter your Telegram Phone Number ?"),
      password: async () => await input.text("Enter your Telegram Password?"),
      phoneCode: async () =>
        await input.text("Enter your Telegram Verification Code ?"),
      onError: (err) => console.log(err),
    });
    console.log("Connected.");
    logger.info(`Session ${sessionName} - Connected`);
    storeSession.save();

    new Core(client, sessionName).process();
  } catch (error) {
    console.log(error);
    logger.error(`Session ${sessionName} Error - ${error}`);
    logger.info(`BOT STOPPED`);
  }
})();
