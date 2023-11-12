import { createCommand } from "../main.js"

await (await createCommand({whichContext: "code"})).parse(Deno.args)