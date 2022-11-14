import database from "../../../db";

export function get(request: Request) {
  const users = database.getUsers();

  return `hello mate`;
}
