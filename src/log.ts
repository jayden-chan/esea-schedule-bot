import * as moment from "moment-timezone";

export function log(message?: any, ...optionalParams: any[]) {
  console.log(
    `[${moment().format("MMM-DD hh:mm A")}]`,
    message,
    ...optionalParams
  );
}

export function error(message?: any, ...optionalParams: any[]) {
  console.error(
    `[${moment().format("MMM-DD hh:mm A")}]`,
    message,
    ...optionalParams
  );
}
