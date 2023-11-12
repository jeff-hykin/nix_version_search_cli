import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, yellow, green, cyan } from "https://deno.land/x/quickr@0.6.51/main/console.js"

import { selectOne } from "./tools/input_tools.js"
import { search } from "./tools/search_tools.js"

const posixShellEscape = (string)=>"'"+string.replace(/'/g, `'"'"'`)+"'"

const contextOptions = ["global", "code", "repl"]
export async function createCommand({whichContext}) {
    if (!contextOptions.includes(whichContext)) {
        throw Error(`This is shouldn't be possible, createCommand() was called with ${JSON.stringify(whichContext)} which isn't one of the contextOptions ${contextOptions} `)
    }
    const command = await new Command()
        // Main command.
        .name("Nix Version Search")
        .version("0.1.0")
        .description(`Find exact versions of nix packages\n\nExamples:\n    nvsc python@3\n    nvsg python@3\n    nvsr python@3`)
        .arguments("<input:string>")
        .globalOption("-e, --explain", "Include beginner-friendly explanations with the output")
        .globalOption("--json", "Return json output of the results (force enables non-interactive)")
        .action(async (options, ...args) => {
            if (args.length == 0) {
                return command.parse(["--help"].concat(Deno.args))
            }

            var [ name, versionPrefix ] = args[0].split("@")
            versionPrefix = versionPrefix||""
            
            const results = await search(name)

            // 
            // non-interactive mode
            // 
            if (options.json) {
                await Promise.all(
                    Object.values(results).map(
                        eachPackage=>eachPackage.versionsPromise.then((versions)=>{
                            eachPackage.versions = (eachPackage.versions||[]).concat(
                                versions.filter(each=>each.version.startsWith(versionPrefix))
                            )
                            delete eachPackage.versionsPromise
                            return eachPackage
                        })
                    )
                )
                console.log(JSON.stringify(results))
                return
            }
            
            // 
            // interactive mode
            // 
            const choiceOptions = {}
            for (const each of results) {
                let oldVersionsPromise = choiceOptions[each.attrPath]?.versionsPromise
                choiceOptions[each.attrPath] = {...choiceOptions[each.attrPath], ...each, }
                if (oldVersionsPromise) {
                    choiceOptions[each.attrPath].versionsPromise = new Promise(async (resolve, reject) => {
                        try {
                            resolve(
                                ((await oldVersionsPromise)||[]).concat(await each.versionsPromise)
                            )
                        } catch (error) {
                            reject(error)
                        }
                    })
                }
            }
            for (const [key, value] of Object.entries(choiceOptions)) {
                value.versionsPromise.then(versions=>{
                    if (versions.filter(each=>each.version.startsWith(versionPrefix)).length == 0) {
                        delete choiceOptions[key]
                    }
                })
            }
            while (1) {
                const optionDescriptions = Object.values(choiceOptions).map(each=>(each.Description||"").replace(/\n/g," "))
                const packageInfo = await selectOne({
                    message: "Which Package [type OR press enter OR use arrow keys]",
                    showList: true,
                    showInfo: false,
                    options: choiceOptions,
                    optionDescriptions,
                })
                if (!packageInfo) {
                    console.log(red`Sorry, I checked just now`)
                    console.log(red`it looks like that package doesn't have any versions matching ${JSON.stringify(versionPrefix)}\n`)
                    continue
                }
                const versionOptions = ((await packageInfo?.versionsPromise)||[]).filter(each=>each.version.startsWith(versionPrefix))
                if (versionOptions.length == 0) {
                    console.log(red`Sorry, I checked just now`)
                    console.log(red`it looks like ${cyan(packageInfo.attrPath)} doesn't have any versions matching ${JSON.stringify(versionPrefix)}\n`)
                    delete choiceOptions[packageInfo.attrPath]
                    continue
                }
                const version = await selectOne({
                    message: "Pick a version",
                    showList: true,
                    showInfo: false,
                    options: versionOptions.map(each=>each.version),
                })
                console.log(`Selected: ${version}\n`)

                if (!version) {
                    throw Error(`Sorry I don't see that version`)
                }
                const versionInfo = versionOptions.filter(each=>each.version == version)[0]

                switch (whichContext) {
                    case "global":
                        console.log(`Okay run the following to get version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                        console.log(``)
                        console.log(cyan`nix-env -iA ${posixShellEscape(versionInfo.attrPath)} -f https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                        console.log(``)
                        break;
                    case "code":
                        if (!options.explain) {
                            console.log(`Here's what to include in your nix code:`)
                            console.log(``)
                            console.log(cyan`    yourVarName = (`)
                            console.log(cyan`      (import (builtins.fetchTarball {`)
                            console.log(cyan`          url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                            console.log(cyan`      }) {}).${versionInfo.attrPath}`)
                            console.log(cyan`    );`)
                            console.log(``)
                            console.log(`Run again with ${yellow`--explain`} if you're not sure how to use this^`)
                        } else {
                            console.log(`If you have a ${yellow`shell.nix`} or ${yellow`default.nix`} file it might look like:`)
                            console.log(`     { pkgs ? import <nixpkgs> {} }:`)
                            console.log(`     let`)
                            console.log(`       python = pkgs.python;`)
                            console.log(`     in`)
                            console.log(`       pkgs.mkShell {`)
                            console.log(`         buildInputs = [`)
                            console.log(`           python`)
                            console.log(`         ];`)
                            console.log(`         nativeBuildInputs = [`)
                            console.log(`         ];`)
                            console.log(`         shellHook = ''`)
                            console.log(`             # blah blah blah`)
                            console.log(`         '';`)
                            console.log(`       }`)
                            console.log(``)
                            console.log(`To make it work with version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                            console.log(`You would change it to be:`)
                            console.log(`     { pkgs ? import <nixpkgs> {} }:`)
                            console.log(`     let`)
                            console.log(`       python = pkgs.python;`)
                            console.log(green`       YOUR_THING = (`)
                            console.log(green`         (import (builtins.fetchTarball {`)
                            console.log(green`            url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                            console.log(green`         }) {}).${versionInfo.attrPath}`)
                            console.log(green`       );`)
                            console.log(`     in`)
                            console.log(`       pkgs.mkShell {`)
                            console.log(`         buildInputs = [`)
                            console.log(`           python`)
                            console.log(green`           YOUR_THING`)
                            console.log(`         ];`)
                            console.log(`         nativeBuildInputs = [`)
                            console.log(`         ];`)
                            console.log(`         shellHook = ''`)
                            console.log(`             # blah blah blah`)
                            console.log(`         '';`)
                            console.log(`       }`)
                        }
                        break;
                    case "repl":
                        console.log(`Okay run the following to a shell that has version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                        console.log(``)
                        console.log(`nix-shell -p ${posixShellEscape(versionInfo.attrPath)} -I https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                        console.log(``)
                        break;
                
                    default:
                        break;
                }
                break
            }
        })
    
    return command
}