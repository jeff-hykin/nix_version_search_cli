import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim, bold, clearAnsiStylesFrom } from "https://deno.land/x/quickr@0.6.56/main/console.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.56/main/run.js"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.5.1.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.56/main/file_system.js"
import * as yaml from "https://deno.land/std@0.168.0/encoding/yaml.ts"

import { selectOne } from "./tools/input_tools.js"
import { search, determinateSystems } from "./tools/search_tools.js"
import { versionSort, versionToList } from "./tools/misc.js"

const posixShellEscape = (string)=>"'"+string.replace(/'/g, `'"'"'`)+"'"
const clearScreen = ()=>console.log('\x1B[2J')
const escapeNixString = (string)=>{
    return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
}
const listNixPackages =  async ()=>{
    const packageList = await run`nix profile list ${Stdout(returnAsString)}`
    return yaml.parse(
        clearAnsiStylesFrom(
            indent({string:packageList, by: "    "}).replace(/^    Index:/gm, "-\n    Index:")
        )
    )
}

// 
// flakes check
// 
const cachePath = `${FileSystem.home}/.cache/nvs/has_flakes_enabled.check`
let hasFlakesEnabledString = FileSystem.sync.read(cachePath)
if (hasFlakesEnabledString == null) {
    console.log(`\nLet me check real quick if you have flakes enabled`)
    console.log(`(this will only run once)`)
    try {
        const result = await run`nix profile list ${Stdout(returnAsString)} ${Stderr(null)}`
        hasFlakesEnabledString = !!result.match(/^Flake attribute: /m)
    } catch (error) {
        hasFlakesEnabledString = false
    }
    hasFlakesEnabledString = JSON.stringify(hasFlakesEnabledString)
    console.log(`\n`)
    FileSystem.sync.write({
        data: hasFlakesEnabledString,
        path: cachePath,
    })
}
const hasFlakesEnabled = JSON.parse(hasFlakesEnabledString)

const command = await new Command()
    // Main command.
    .name("Nix Version Search")
    .version("1.0.0")
    .description(`Find/install exact versions of nix packages\n\nExamples:\n    nvs --install python@3\n    nvs python@3\n    nvs --shell python@3`)
    .globalOption("--install", "Install into the system")
    .globalOption("--dry-install", "Show the nix command for installing into the system")
    .globalOption("--shell", "Show the shell command info")
    .globalOption("--force", "Uninstall any packages that conflict with an install")
    .globalOption("--json", "Return json output of the results (force enables non-interactive)")
    .globalOption("--explain", "Include beginner-friendly explanations with the output")
    .arguments("[...args:string]")
    .action(async function (options, ...args) {
        args = args.concat(this.getLiteralArgs())
        if (args.length == 0) {
            return command.parse(["--help"].concat(Deno.args))
        }
        
        // quick install http
        if (args[0].startsWith("https://") && options.install) {
            if (hasFlakesEnabled) {
                var {success} = await run`nix profile install ${args[0]}`
                Deno.exit(success)
            } else {
                var {success} = await run`nix-env -i -f ${args[0]}`
                await run`nix profile install ${args[0]}`
                Deno.exit(success)
            }
        }
        
        // normal version search
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
        // json mode
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
                autocompleteOnSubmit: false,
                options: versionOptions.map(each=>each.version),
            })
            console.log(`Selected: ${version}\n`)
            const viableVersions = versionOptions.filter(each=>each.version.startsWith(version))
            if (viableVersions.length == 0) {
                throw Error(`Sorry I don't see that version`)
            }
            // 
            // pick the newest version that doesnt have a trailing string (e.g. "1.2.3" not "1.2.3beta")
            // 
            const pureVersions = viableVersions.filter(each=>each.version.match(/^[\.0-9]+$/))
            let versionInfo
            if (pureVersions.length != 0) {
                versionInfo = versionSort({array: pureVersions, elementToVersion: (each)=>each.version})[0]
            } else {
                versionInfo = versionSort({array: viableVersions, elementToVersion: (each)=>each.version})[0]
            }
            
            // clearScreen()
            let didSomething = false

            // setup common vars
            let humanPackageSummary
            let url
            let packageName
            if (hasFlakesEnabled) {
                if (packageInfo.project) {
                    packageName = packageInfo.project
                    humanPackageSummary = `${green(packageInfo.project)}${cyan`@${versionInfo.version}`}${dim` from `}${yellow(packageInfo.org)}`
                    url = `https://flakehub.com/f/${packageInfo.org}/${packageInfo.project}/${versionInfo.simplified_version}.tar.gz`
                } else {
                    packageName = packageInfo.attrPath
                    humanPackageSummary = `${green(packageInfo.attrPath)}${cyan`@${versionInfo.version}`}${dim` from `}${yellow("nixpkgs")}`
                    url = `https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz#${versionInfo.attrPath}`
                }
            }

            // 
            // install
            // 
            if (options.install) {
                didSomething = true
                if (hasFlakesEnabled) {
                    console.log(`Okay installing ${humanPackageSummary}`)
                    let noProgressLoopDetection
                    install: while (1) {
                        var stderrOutput = ""
                        var listener = {
                            async write(chunk) {
                                stderrOutput += (new TextDecoder()).decode(chunk)
                            }
                        }
                        // try the install
                        await run`nix profile install ${url} ${Stderr(Deno.stderr, listener)}`
                        if (noProgressLoopDetection == stderrOutput) {
                            console.error(`\nSorry, it looks like I was unable to install the package`)
                            Deno.exit(7)
                        }
                        noProgressLoopDetection = stderrOutput
                        const conflictMatch = stderrOutput.match(/error: An existing package already provides the following file:(?:\w|\W)+?(?<existing>\/nix\/store\/.+)(?:\w|\W)+?This is the conflicting file from the new package:(?:\w|\W)+?(?<newPackage>\/nix\/store\/.+)(?:\w|\W)+?To remove the existing package:(?:\w|\W)+?(?<removeExisting>nix profile remove.+)(?:\w|\W)+?To prioritise the new package:(?:\w|\W)+?(?<prioritiseNew>nix profile install.+)(?:\w|\W)+?To prioritise the existing package:(?:\w|\W)+?(?<prioritiseExisting>nix profile install.+)/)
                        if (conflictMatch) {
                            const { existing, newPackage, removeExisting, prioritiseNew, prioritiseExisting } = conflictMatch.groups
                            const [ folders, name, ext ] = FileSystem.pathPieces(existing)
                            const simpleName = cyan(folders.slice(4,).join("/"))+cyan("/")+green(name+ext)
                            clearScreen()
                            const packages = await listNixPackages()
                            const removeExistingPackage = async ()=>{
                                try {
                                    if (removeExisting) {
                                        const url = (removeExisting.slice(("nix profile remove ").length).match(/(.+?)#/)||"")[1]
                                        // "Store paths" is for the non-flake installs
                                        const uninstallList = packages.filter(each=>each["Original flake URL"] == url || each["Store paths"] == existing)
                                        for (const each of uninstallList) {
                                            if (each.Index!=null) {
                                                try {
                                                    await run`nix profile remove ${`${each.Index}`.trim()}`
                                                } catch (error) {
                                                }
                                            }
                                        }
                                    }
                                } catch (error) {
                                }
                            }

                            if (options.force) {
                                await removeExistingPackage()
                                continue install
                            } else {
                                console.log(bold`Looks like there was a conflict:`)
                                console.log(`    The install adds: ${simpleName}`)
                                console.log(`    Which already exists from:\n        ${yellow((removeExisting||"").trim().slice(("nix profile remove ").length)||existing)}`)
                                console.log(``)
                                const uninstallOption = "uninstall: remove the old package, install the one you just picked"
                                const newHigherPriorityOption = "higher: install the one you just picked with a higher priority"
                                const installAsLowerOption = "lower: install one you just picked, but have it be lower priority"
                                const choice = await selectOne({
                                    message: "Choose an action:",
                                    showList: true,
                                    showInfo: false,
                                    options: [
                                        uninstallOption,
                                        ...(prioritiseNew ? [newHigherPriorityOption] : []),
                                        installAsLowerOption,
                                        "cancel",
                                    ],
                                })
                                if (choice == "cancel") {
                                    Deno.exit(0)
                                    return
                                } else if (choice == newHigherPriorityOption) {
                                    await run(prioritiseNew.trim().split(/\s/g))
                                } else if (choice == installAsLowerOption) {
                                    await run(prioritiseExisting.trim().split(/\s/g))
                                } else if (choice == uninstallOption) {
                                    await removeExistingPackage()
                                }
                                continue install
                            }
                        } else {
                            console.log(`\n - ✅ ${humanPackageSummary} should now be installed`)
                        }
                        break
                    }
                    // TODO: enable this sanity checker of conflicting bins:
                    // const packages = await listNixPackages()
                    // const binSources = {}
                    // for (const each of packages) {
                    //     const name = each["Original flake URL"] || each.Index
                    //     binSources[name] = []
                    //     let storePaths = each["Store paths"]
                    //     if (storePaths) {
                    //         storePaths = storePaths.split(":")
                    //         for (const each of storePaths) {
                    //             binSources[name].push(
                    //                 FileSystem.listFilePathsIn(`${each}/bin/`)
                    //             )
                    //         }
                    //     }
                    // }
                    // const conflicts = {}
                    // for (const [key, value] of Object.entries(binSources)) {
                    //     const executables = await Promise.all(value)
                    //     const executableNames = executables.flat(2).map(each=>FileSystem.basename(each))
                    //     for (let each of executableNames) {
                    //         conflicts[each] = conflicts[each] || []
                    //         conflicts[each].push(key)
                    //     }
                    // }
                    // for (const [key, value] of Object.entries(conflicts)) {
                    //     if (value.length > 1) {
                    //         console.warn(`! looks like multiple packages supply the ${green(key)} executable:`,JSON.stringify(value,0,4))
                    //     }
                    // }
                } else {
                    await run`nix-env -iA ${versionInfo.attrPath} -f {https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz}`
                    console.log(`\n - ✅ ${versionInfo.attrPath}@${versionInfo.version} should now be installed`)
                }
            }

            if (options.dryInstall) {
                didSomething = true
                if (hasFlakesEnabled) {
                    console.log(`Okay run the following to get ${humanPackageSummary}`)
                    console.log(``)
                    console.log(cyan`nix profile install ${posixShellEscape(url)}`)
                    console.log(``)
                } else {
                    console.log(`Okay run the following to get version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                    console.log(``)
                    console.log(cyan`nix-env -iA ${posixShellEscape(versionInfo.attrPath)} -f https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                    console.log(``)
                }
            }
            
            // 
            // shell output
            // 
            if (options.shell) {
                didSomething = true
                if (hasFlakesEnabled) {
                    console.log(`Okay, run the following to a shell that has ${humanPackageSummary}`)
                    console.log(``)
                    console.log(cyan`nix develop ${posixShellEscape(url)}`)
                    console.log(``)
                } else {
                    console.log(`Okay, run the following to a shell that has version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`)
                    console.log(``)
                    console.log(cyan`nix-shell -p ${posixShellEscape(versionInfo.attrPath)} -I https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)
                    console.log(``)
                }
            }

            // 
            // default output
            // 
            if (!didSomething) {
                if (hasFlakesEnabled) {
                    const name = toCamelCase(packageName)
                    const nonDefaultPackages = (versionInfo?.packageOutputs||[]).filter(each=>each!="default")
                    if (!options.explain) {
                        console.log(`Okay use the following to get ${humanPackageSummary}`)
                        console.log(``)
                        console.log(cyan`    ${name}.url = ${escapeNixString(url)}`)
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
                        console.log(`To make it work with ${humanPackageSummary}`)
                        console.log(`You would change it to be:\n`)
                        console.log(dim`   {`)
                        console.log(dim`     description = "something";`)
                        console.log(dim`     inputs = {`)
                        console.log(dim`       nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";`)
                        console.log(green`       ${name}.url = ${escapeNixString(url)};`)
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
            }
            break
        }
    })

await command.parse(Deno.args)