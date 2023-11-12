import { createCommand } from "../main.js"

await (await createCommand({whichContext: "repl"})).parse(Deno.args)