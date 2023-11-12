import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"

import { selectOne } from "./input_tools.js"
import { search } from "./search_tools.js"

const posixShellEscape = (string)=>"'"+string.replace(/'/g, `'"'"'`)+"'"

const contextOptions = ["global", "lang", "shell"]
async function createCommand(whichContext) {
    if (!contextOptions.includes(whichContext)) {
        throw Error(`This is shouldn't be possible, createCommand() was called with ${JSON.stringify(whichContext)} which isn't one of the contextOptions ${contextOptions} `)
    }
    const command = await new Command()
        // Main command.
        .name("Nix Version Search")
        .version("0.1.0")
        .description(`Find exact versions of nix packages\n    Usage:\n    nvsg python@3    # find all python package versions that start with 3`)
          .arguments("<input:string> [output:string]")
        // .globalOption("-d, --debug", "Enable debug output.")
        .action(async (options, ...args) => {
            if (args.length == 0) {
                return command.parse(["--help"].concat(Deno.args))
            }

            var [ name, versionPrefix ] = args[0].split("@")
            versionPrefix = versionPrefix||""
            
            const results = await search(name)
            const packageInfo = await selectOne({
                message: "Which One (press enter immediately to select first, or start typing)",
                showList: true,
                showInfo: false,
                options: Object.fromEntries(results.map(
                    (value)=>([value.attrPath, value])
                )),
                optionDescriptions: results.map(each=>(each.Description||"").replace(/\n/g," ")),
            })
            if (!packageInfo) {
                console.log(`Hmm, I'm sorry I don't see any versions for that package :/`)
            }
            console.log(`Selected: ${packageInfo.attrPath}`)

            const versionOptions = (await packageInfo?.versionsPromise)||[]
            const version = await  selectOne({
                message: "Pick a version",
                showList: true,
                showInfo: false,
                options: versionOptions.map(each=>each.version),
            })
            if (!version) {
                throw Error(`Sorry I don't see that version`)
            }
            const versionInfo = versionOptions.filter(each=>each.version == version)[0]

            switch (whichContext) {
                case "env":
                    console.log(`Okay run this:`)
                    console.log(``)
                    console.log(`nix-env -iA ${posixShellEscape(versionInfo.attrPath)} -f https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                    console.log(``)
                    break;
                case "code":
                    console.log(``)
                    console.log(`pkg = (import (builtins.fetchTarball {`)
                    console.log(`    url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                    console.log(`}) {}).${versionInfo.attrPath};`)
                    console.log(``)
                    break;
                case "shell":
                    console.log(``)
                    console.log(``)
                    console.log(`nix-shell -p ${posixShellEscape(versionInfo.attrPath)} -I https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                    console.log(``)
                    break;
            
                default:
                    break;
            }
            
        })
    
    await command.parse(Deno.args)
}

await createCommand("code")

