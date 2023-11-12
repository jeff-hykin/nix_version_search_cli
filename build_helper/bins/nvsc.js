import { createCommand } from "../main.bundle.js"

await (await createCommand({whichContext: "code"})).parse(Deno.args)