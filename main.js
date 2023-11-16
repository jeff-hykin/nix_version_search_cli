import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim } from "https://deno.land/x/quickr@0.6.55/main/console.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.55/main/run.js"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.5.1.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.55/main/file_system.js"

import { selectOne } from "./tools/input_tools.js"
import { search, determinateSystems } from "./tools/search_tools.js"

const posixShellEscape = (string)=>"'"+string.replace(/'/g, `'"'"'`)+"'"

// 
// flakes check
// 
const cachePath = `${FileSystem.home}/.cache/nvs/has_flakes_enabled.check`
let hasFlakesEnabledString = FileSystem.sync.read(cachePath)
if (hasFlakesEnabledString == null) {
    console.log(`\nLet me check real quick if you have flakes enabled`)
    console.log(`(this will only run once)`)
    var {success} = await run`nix flake show --all-systems ${"https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz"} ${Out(null)}`
    console.log(`\n`)
    hasFlakesEnabledString = `${success}`
    FileSystem.sync.write({
        data: hasFlakesEnabledString,
        path: cachePath,
    })
}
const hasFlakesEnabled = JSON.parse(hasFlakesEnabledString)


const contextOptions = ["global", "code", "repl"]
export async function createCommand({whichContext}) {
    if (!contextOptions.includes(whichContext)) {
        throw Error(`This is shouldn't be possible, createCommand() was called with ${JSON.stringify(whichContext)} which isn't one of the contextOptions ${contextOptions} `)
    }
    const command = await new Command()
        // Main command.
        .name("Nix Version Search")
        .version("0.2.0")
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
            let flakeResults = []
            if (hasFlakesEnabled) {
                flakeResults = await determinateSystems.search(name)
            }
            
            const choiceOptions = {}
            for (const each of flakeResults) {
                choiceOptions[each.project+` ❄️ ${each.org}`] = each
            }
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
            // once a package-versions resolves, remove self from list if no versions match the version prefix
            for (const [key, value] of Object.entries(choiceOptions)) {
                value.versionsPromise.then(versions=>{
                    if (versions.filter(each=>each.version.startsWith(versionPrefix)).length == 0) {
                        delete choiceOptions[key]
                    }
                })
            }
            // 
            // non-interactive mode
            // 
            if (options.json) {
                await Promise.all(
                    Object.values(choiceOptions).map(
                        eachPackage=>eachPackage.versionsPromise.then((versions)=>{
                            eachPackage.versions = (eachPackage.versions||[]).concat(
                                versions.filter(each=>each.version.startsWith(versionPrefix))
                            )
                            delete eachPackage.versionsPromise
                            return eachPackage
                        })
                    )
                )
                console.log(JSON.stringify(choiceOptions))
                return
            }

            // 
            // interactive mode
            // 
            while (1) {
                const optionDescriptions = Object.values(choiceOptions).map(each=>(each.Description||each.description||"").replace(/\n/g," "))
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
                
                console.log('\x1B[2J')
                switch (whichContext) {
                    case "global":
                        if (hasFlakesEnabled && packageInfo.project) {
                            console.log(`Okay run the following to get version ${yellow(versionInfo.version)} of ${yellow(packageInfo.project)}`)
                            console.log(``)
                            console.log(cyan`nix profile install ${posixShellEscape(`https://flakehub.com/f/${packageInfo.org}/${packageInfo.project}/${packageInfo.simplified_version}.tar.gz`)}`)
                            console.log(``)
                        } else {
                            console.log(`Okay run the following to get version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                            console.log(``)
                            console.log(cyan`nix-env -iA ${posixShellEscape(versionInfo.attrPath)} -f https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                            console.log(``)
                        }
                        break;
                    case "code":
                        if (hasFlakesEnabled && packageInfo.project) {
                            const name = toCamelCase(packageInfo.project)
                            const nonDefaultPackages = versionInfo.packageOutputs.filter(each=>each!="default")
                            if (!options.explain) {
                                console.log(`Okay use the following to get version ${yellow(versionInfo.version)} of ${yellow(packageInfo.project)}`)
                                console.log(``)
                                console.log(cyan`    ${name}.url = "https://flakehub.com/f/${packageInfo.org}/${packageInfo.project}/${packageInfo.simplified_version}.tar.gz"`)
                                if (nonDefaultPackages.length > 0) {
                                    console.log(``)
                                    console.log(dim`Note: you may need to use one of the following to get what you want:`)
                                    console.log(nonDefaultPackages.map(each=>dim.lightRed`    ${name}.${each}`).join("\n"))
                                }
                                console.log(``)
                                console.log(dim`Run again with ${yellow`--explain`} if you're not sure how to use this^`)
                            } else {
                                console.log(`If you have a ${yellow`flake.nix`} file it might look like:\n`)
                                console.log(dim`   {`)
                                console.log(dim`     description = "something";`)
                                console.log(dim`     inputs = {`)
                                console.log(dim`       nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";`)
                                console.log(dim`     };`)
                                console.log(dim`     outputs = { self, nixpkgs, }:`)
                                console.log(dim`       let`)
                                console.log(dim`          somethingSomething = 10;`)
                                console.log(dim`       in`)
                                console.log(dim`         {`)
                                console.log(dim`         }`)
                                console.log(dim`   }`)
                                console.log(dim``)
                                prompt(cyan`[press enter to continue]`)
                                console.log(``)
                                console.log(`To make it work with version ${yellow(versionInfo.version)} of ${yellow(packageInfo.project)}`)
                                console.log(`You would change it to be:\n`)
                                console.log(dim`   {`)
                                console.log(dim`     description = "something";`)
                                console.log(dim`     inputs = {`)
                                console.log(dim`       nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";`)
                                console.log(green`       ${name}.url = "https://flakehub.com/f/${packageInfo.org}/${packageInfo.project}/${packageInfo.simplified_version}.tar.gz";`)
                                console.log(dim`     };`)
                                console.log(`     outputs = { self, nixpkgs, ${green(name)} }:`)
                                console.log(dim`       let`)
                                console.log(dim`          somethingSomething = 10;`)
                                if (nonDefaultPackages.length > 0) {
                                    console.log(dim.cyan`          # Note: you may need to use one of the following to get what you want:`)
                                    console.log(nonDefaultPackages.map(each=>dim.cyan`          #    ${name}.${each}`).join("\n"))
                                }
                                console.log(dim`       in`)
                                console.log(dim`         {`)
                                console.log(dim`         }`)
                                console.log(dim`   }`)
                                console.log(``)
                            }
                        } else {
                            if (!options.explain) {
                                console.log(`Here's what to include in your nix code:`)
                                console.log(``)
                                console.log(cyan`    yourVarName = (`)
                                console.log(cyan`      (import (builtins.fetchTarball {`)
                                console.log(cyan`          url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                                console.log(cyan`      }) {}).${versionInfo.attrPath}`)
                                console.log(cyan`    );`)
                                console.log(``)
                                console.log(dim`Run again with ${yellow`--explain`} if you're not sure how to use this^`)
                            } else {
                                console.log(`If you have a ${yellow`shell.nix`} or ${yellow`default.nix`} file it might look like:\n`)
                                console.log(dim`     { pkgs ? import <nixpkgs> {} }:`)
                                console.log(dim`     let`)
                                console.log(dim`       python = pkgs.python;`)
                                console.log(dim`     in`)
                                console.log(dim`       pkgs.mkShell {`)
                                console.log(dim`         buildInputs = [`)
                                console.log(dim`           python`)
                                console.log(dim`         ];`)
                                console.log(dim`         nativeBuildInputs = [`)
                                console.log(dim`         ];`)
                                console.log(dim`         shellHook = ''`)
                                console.log(dim`             # blah blah blah`)
                                console.log(dim`         '';`)
                                console.log(dim`       }`)
                                console.log(dim``)
                                prompt(cyan`[press enter to continue]`)
                                console.log(``)
                                console.log(`To make it work with version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                                console.log(`You would change it to be:\n`)
                                console.log(dim`     { pkgs ? import <nixpkgs> {} }:`)
                                console.log(dim`     let`)
                                console.log(dim`       python = pkgs.python;`)
                                console.log(green`       YOUR_THING = (`)
                                console.log(green`         (import (builtins.fetchTarball {`)
                                console.log(green`            url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                                console.log(green`         }) {}).${versionInfo.attrPath}`)
                                console.log(green`       );`)
                                console.log(dim`     in`)
                                console.log(dim`       pkgs.mkShell {`)
                                console.log(dim`         buildInputs = [`)
                                console.log(dim`           python`)
                                console.log(green`           YOUR_THING`)
                                console.log(dim`         ];`)
                                console.log(dim`         nativeBuildInputs = [`)
                                console.log(dim`         ];`)
                                console.log(dim`         shellHook = ''`)
                                console.log(dim`             # blah blah blah`)
                                console.log(dim`         '';`)
                                console.log(dim`       }`)
                            }
                        }
                        break;
                    case "repl":
                        if (hasFlakesEnabled && packageInfo.project) {
                            console.log(`Okay, run the following to a shell that has version ${yellow(versionInfo.version)} of ${yellow(packageInfo.project)}`)
                            console.log(``)
                            console.log(cyan`nix develop ${posixShellEscape(`https://flakehub.com/f/${packageInfo.org}/${packageInfo.project}/${packageInfo.simplified_version}.tar.gz`)}`)
                            console.log(``)
                        } else {
                            console.log(`Okay, run the following to a shell that has version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                            console.log(``)
                            console.log(cyan`nix-shell -p ${posixShellEscape(versionInfo.attrPath)} -I https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                            console.log(``)
                        }
                        break;
                
                    default:
                        break;
                }
                break
            }
        })
    
    return command
}