# TELEGRAM QUERY GETTER (NODE JS)

Telegram web apps query getter, to get query data provided by telegram when authenticating to Telegram Web Apps.

## Prerequisite

- Git
- Node JS

## What you need to use this ?

- TELEGRAM_APP_ID & TELEGRAM_APP_HASH Get it from [Here](https://my.telegram.org/auth?to=apps)
- Telegram Bot Username & Telegram Web Apps Url (Or you can use provided list)

## Setup & Configure

1. clone project repo
2. run `npm install`
3. run `cp config_tmp.js config.js`
   To configure the app, open `src/config.ts` and add your telegram app id and hash there
4. to start the app run `npm run start`

## Note

you can see `bot_url_list.js` for the example of bot username and url.
