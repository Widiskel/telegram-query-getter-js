import fs from "fs";
import path from "path";
import { parse } from "querystring";

export class Helper {
  static sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  static getTelegramQuery(url, type) {
    try {
      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) {
        throw new Error("No query string found in the URL.");
      }

      const queryString = url.substring(hashIndex + 1);
      const decodedQueryString = queryString.split("&");
      const param = decodedQueryString[0].split("=")[1]; // Ensure correct extraction

      if (!param) {
        throw new Error("Param not found in the query string.");
      }

      if (type == "1") {
        return param;
      } else if (type == "2") {
        return this.decodeQueryString(param);
      } else {
        const newParam = this.decodeQueryString(param);
        return this.jsonToInitParam(newParam);
      }
    } catch (error) {
      console.error("Error in getTelegramQuery:", error.message);
      throw error;
    }
  }

  static jsonToInitParam(dataString) {
    try {
      const newData = parse(dataString);

      if (newData.user) {
        const userObject = JSON.parse(newData.user);
        newData.user = encodeURIComponent(JSON.stringify(userObject));
      }

      const resultArray = [];
      for (const [key, value] of Object.entries(newData)) {
        resultArray.push(`${key}=${value}`);
      }
      const result = resultArray.join("&");

      return result;
    } catch (error) {
      console.error("Error in jsonToInitParam:", error.message);
      throw error;
    }
  }

  static decodeQueryString(encodedString) {
    try {
      const decodedString = decodeURIComponent(encodedString);
      const paramsArray = decodedString.split("&");
      const paramsObject = {};

      paramsArray.forEach((param) => {
        const [key, value] = param.split("=");
        if (key === "user") {
          paramsObject[key] = JSON.parse(decodeURIComponent(value));
        } else {
          paramsObject[key] = value;
        }
      });

      const resultArray = [];
      for (const [key, value] of Object.entries(paramsObject)) {
        if (key === "user") {
          resultArray.push(`${key}=${JSON.stringify(value)}`);
        } else {
          resultArray.push(`${key}=${value}`);
        }
      }

      return resultArray.join("&");
    } catch (error) {
      console.error("Error in decodeQueryString:", error.message);
      throw error;
    }
  }

  static getSession(sessionName) {
    try {
      const files = fs.readdirSync(path.resolve(sessionName));
      const session = [];
      files.forEach((file) => {
        session.push(file);
      });
      return session;
    } catch (error) {
      console.error(`Error reading sessions directory: ${error.message}`);
      throw error;
    }
  }

  static resetSession(sessionName) {
    try {
      const files = fs.readdirSync(path.resolve(sessionName));
      console.log("Deleting Sessions...");
      files.forEach((file) => {
        fs.rm(
          `${path.join(path.resolve(sessionName), file)}`,
          { recursive: true },
          (err) => {
            if (err) throw err;
          }
        );
      });
      console.info("Sessions reset successfully");
    } catch (error) {
      console.error(`Error deleting session files: ${error.message}`);
      throw error;
    }
  }

  static createDir(dirName) {
    try {
      const dirPath = `sessions/${dirName}`;
      console.log(dirPath);
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) throw err;
      });
      return dirPath;
    } catch (error) {
      console.error(`Error creating directory: ${error.message}`);
      throw error;
    }
  }
}
