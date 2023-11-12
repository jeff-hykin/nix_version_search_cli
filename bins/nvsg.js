import { createCommand } from "../main.js"

await (await createCommand({whichContext: "global"})).parse(Deno.args)