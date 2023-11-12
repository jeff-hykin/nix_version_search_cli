import { createCommand } from "../main.bundle.js"

await (await createCommand({whichContext: "global"})).parse(Deno.args)