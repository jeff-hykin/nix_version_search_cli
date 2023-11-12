import { createCommand } from "../main.bundle.js"

await (await createCommand({whichContext: "repl"})).parse(Deno.args)