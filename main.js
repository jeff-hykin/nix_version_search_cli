import { TerminalSpinner, SpinnerTypes } from "https://deno.land/x/spinners@v1.1.2/mod.ts"
import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim, bold, clearAnsiStylesFrom } from "https://deno.land/x/quickr@0.6.58/main/console.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.57/main/run.js"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.5.1.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.57/main/file_system.js"
import * as yaml from "https://deno.land/std@0.168.0/encoding/yaml.ts"

import { version } from "./tools/version.js"
import { selectOne } from "./tools/input_tools.js"
import { search, determinateSystems } from "./tools/search_tools.js"
import { versionSort, versionToList, executeConversation } from "./tools/misc.js"

import { checkIfFlakesEnabled, jsStringToNixString, listNixPackages, removeExistingPackage, install } from "./tools/nix_tools.js"

const posixShellEscape = (string)=>"'"+string.replace(/'/g, `'"'"'`)+"'"
const clearScreen = ()=>console.log('\x1B[2J')

const cacheFolder = `${FileSystem.home}/.cache/nvs/`
const explainPath = `${cacheFolder}/prev_explain.json`
const saveExplain = (explainationConversation)=>{
    FileSystem.write({
        path: explainPath,
        data: JSON.stringify(explainationConversation)
    }).catch(console.error)
}

// TODO:
    // add a --uninstall
    // add a --issue flag for getting the URL to report a problem for a package
    // add support for detecting the binary outputs of a package

const command =new Command()
    .name("Nix Version Search")
    .version(version)
    .description(`Find/install exact versions of nix packages\n\nExamples:\n    nvs --install python@3\n    nvs python@3\n    nvs --repl python@3\n    nvs --shell python@3\n    nvs --json python@3\nMisc:\n    The cache folder for nvs is: ${JSON.stringify(cacheFolder)}`)
    .globalOption("--install", "Find then install a package")
    .globalOption("--explain", "Include beginner-friendly explanations with the output")
    .globalOption("--repl", "Show how to get the package in `nix repl`")
    .globalOption("--shell", "Show how to use the package with `nix-shell`/`nix develop`")
    .globalOption("--force", "Uninstall any packages that conflict with an install")
    .globalOption("--dry-install", "Show the nix command for installing into the system")
    .globalOption("--json", "Return json output of all search results (non-interactive)")
    .globalOption("--nvs-info", "have settings echo-ed back in yaml form")
    .arguments("[...args:string]")
    .action(async function (options, ...args) {
        args = args.concat(this.getLiteralArgs())
        if (args.length == 0) {
            if (options.explain) {
                const text = await FileSystem.read(`${cacheFolder}/prev_explain.json`)
                if (!text) {
                    console.error(`Sorry I don't see anything to explain :/`)
                } else {
                    executeConversation(JSON.parse(text))
                }
                return
            } else if (options.nvsInfo) {
                console.log(yaml.stringify({
                    info: {
                        version,
                        cacheFolder,
                        hasFlakesEnabled: await checkIfFlakesEnabled({cacheFolder}),
                    }
                }))
                return
            } else {
                return command.parse(["--help"].concat(Deno.args))
            }
        }
        const terminalSpinner = new TerminalSpinner({
            text: "fetching",
            color: "green",
            spinner: SpinnerTypes.dots, // check the file - see import
            indent: 0, // The level of indentation of the spinner in spaces
            cursor: false, // Whether or not to display a cursor when the spinner is active
            writer: Deno.stderr
        })
        terminalSpinner.start()
        // clear out the previous explain
        FileSystem.write({
            path: explainPath,
            data: ""
        }).catch(_=>0)

        // const commandWithExplainFlag = green`nvs `+yellow`--explain `+dim`${Deno.args.map(posixShellEscape).join(" ")}`
        const commandWithExplainFlag = green`nvs `+yellow`--explain `+dim`${Deno.args.map(posixShellEscape).join(" ")}`
        
        const hasFlakesEnabled = await checkIfFlakesEnabled({cacheFolder})

        // quick install http
        if ((args[0].startsWith("https://") || args[0].startsWith("./")) && options.install) {
            try {
                await install({
                    hasFlakesEnabled,
                    humanPackageSummary: `${args[0]}`,
                    urlOrPath: args[0],
                    force: options.force,
                })
            } catch (error) {
                if (error.message = `Sorry, it looks like I was unable to install the package`) {
                    Deno.exit(7)
                } else if (error.message == "cancel") {
                    Deno.exit(0)
                } else {
                    console.error(error)
                    Deno.exit(1)
                }
            }
            Deno.exit(0)
        }
        
        // normal version search
        var [ name, versionPrefix ] = args[0].split("@")
        versionPrefix = versionPrefix||""
        
        const results = await search(name, {cacheFolder})
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
        terminalSpinner.succeed("finished fetch")

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
                try {
                    await install({
                        hasFlakesEnabled,
                        humanPackageSummary,
                        urlOrPath: url,
                        force: options.force,
                    })
                } catch (error) {
                    if (error.message = `Sorry, it looks like I was unable to install the package`) {
                        Deno.exit(7)
                    } else {
                        Deno.exit(0)
                    }
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
            // repl output
            // 
            const asInlineNixValue = ({isRepl, explain, showTip=true})=>{
                const explainationConversation = [
                    {
                        text: [
                            `If you have a ${yellow`shell.nix`} or ${yellow`default.nix`} file it might look like:\n`,
                            dim`     { pkgs ? import <nixpkgs> {} }:`,
                            dim`     let`,
                            dim`       python = pkgs.python;`,
                            dim`     in`,
                            dim`       pkgs.mkShell {`,
                            dim`         buildInputs = [`,
                            dim`           python`,
                            dim`         ];`,
                            dim`         nativeBuildInputs = [`,
                            dim`         ];`,
                            dim`         shellHook = ''`,
                            dim`             # blah blah blah`,
                            dim`         '';`,
                            dim`       }`,
                            dim``,
                        ]
                    },
                    {
                        prompt: cyan`[press enter to continue]`,
                    },
                    {
                        text: [
                            ``,
                            `To make it work with version ${yellow(versionInfo.version)} of ${yellow(packageInfo.attrPath)}`,
                            `You would change it to be:\n`,
                            dim`     { pkgs ? import <nixpkgs> {} }:`,
                            dim`     let`,
                            dim`       python = pkgs.python;`,
                            green`        ${toCamelCase(packageName)} = (`,
                            green`         (import (builtins.fetchTarball {`,
                            green`            url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`,
                            green`         }) {}).${versionInfo.attrPath}`,
                            green`       );`,
                            dim`     in`,
                            dim`       pkgs.mkShell {`,
                            dim`         buildInputs = [`,
                            dim`           python`,
                            green`           ${toCamelCase(packageName)}`,
                            dim`         ];`,
                            dim`         nativeBuildInputs = [`,
                            dim`         ];`,
                            dim`         shellHook = ''`,
                            dim`             # blah blah blah`,
                            dim`         '';`,
                            dim`       }`,
                        ]
                    }
                ]
                if (!explain) {
                    saveExplain(explainationConversation)
                    console.log(`Here's what to include in your nix code:`)
                    console.log(``)
                    console.log(cyan`    ${toCamelCase(packageName)} = (`)
                    console.log(cyan`      (import (builtins.fetchTarball {`)
                    console.log(cyan`          url = "https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz";`)
                    console.log(cyan`      }) {}).${versionInfo.attrPath}`)
                    console.log(cyan`    )${isRepl?"":";"}`)
                    console.log(``)
                    if (showTip) {
                        console.log(dim`If you are not sure how to use this^\nRun the following: ${green`nvs `+yellow`--explain`}`)
                    }
                } else {
                    executeConversation(explainationConversation)
                }
            }
            if (options.repl) {
                didSomething = true
                asInlineNixValue({
                    isRepl: true,
                    explain: options.explain
                })
            }

            // 
            // default output
            // 
            if (!didSomething) {
                if (hasFlakesEnabled) {
                    const name = toCamelCase("nixpkgsWith_"+packageName)
                    const nonDefaultPackages = (versionInfo?.packageOutputs||[]).filter(each=>each!="default")
                    let [basePath, trailingName] = url.split("#")
                    const originalTrailingName = trailingName
                    if (!(trailingName && trailingName!="default")) {
                        trailingName = ""
                    } else {
                        // if its a non-normal name or keyword, escape it
                        if (!trailingName.match(/^[a-zA-Z0-9\-_]+$/)) {
                            trailingName = jsStringToNixString(trailingName)
                        }
                    }
                    const explainationConversation = [
                        { clearScreen: true, },
                        {
                            text: [
                                `There's 3 main ways to use a nix package`,
                                `1. install it (e.g. ${green`nvs --install ...`})`,
                                `2. use it as a value/variable inside nix code (e.g. ${green`nvs --repl ...`}) `,
                                `3. add the package as an input to a ${cyan`flake.nix`}`,
                                ``,
                                `I'm only showing #3 right now`,
                            ],
                        },
                        {
                            prompt: cyan`[press enter to continue]`
                        },
                        {
                            clearScreen: true,
                        },
                        {
                            text: [
                                `If you have a ${yellow`flake.nix`} file it might look like:\n`,
                                dim`   {`,
                                dim`     description = "something";`,
                                dim`     inputs = {`,
                                dim`       nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";`,
                                dim`     };`,
                                dim`     outputs = { self, nixpkgs, }:`,
                                dim`       let`,
                                dim`          somethingSomething = 10;`,
                                dim`       in`,
                                dim`         {`,
                                dim`         }`,
                                dim`   }`,
                                dim``,
                            ]
                        },
                        {
                            prompt: cyan`[press enter to continue]`,
                        },
                        {
                            text: [
                                ``,
                                `To make it work with ${humanPackageSummary}`,
                                `You would change it to be:\n`,
                                dim`   {`,
                                dim`     description = "something";`,
                                dim`     inputs = {`,
                                dim`       nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";`,
                                green`       ${name}.url = ${jsStringToNixString(basePath)};`,
                                dim`     };`,
                                dim`     outputs = { self, nixpkgs, `+green(name)+` }:`,
                                dim`       let`,
                                (
                                    trailingName
                                        ?
                                            green`          ${toCamelCase(originalTrailingName)} = ${name}.${trailingName};\n`
                                        :
                                            ""
                                ) + dim`          somethingSomething = 10;`,
                                ((nonDefaultPackages.length > 0)
                                    ?
                                        dim.cyan`          # Note: you may need to use one of the following to get what you want:\n` + 
                                        nonDefaultPackages.map(each=>dim.cyan`          #    ${name}.${each}`).join("\n")
                                    :
                                        ""
                                )+dim`       in`,
                                dim`         {`,
                                dim`         }`,
                                dim`   }`,
                                ``,
                                `Oh and one more thing!!!`,
                                ``,
                            ]
                        },
                        {
                            prompt: cyan`[press enter to continue]`,
                        },
                        { clearScreen: true },
                        {
                            text: [
                                `Some packages simply DO NOT WORK as flakes`,
                                dim`(some package versions existed before flakes did)`,
                                dim``,
                                dim`At the moment I can't tell which do and which don't`,
                                dim``,
                                `If a flake input doesnt work`,
                                `Run ${green`nvs --repl [your args]`} to get non-flake output`,
                                ``,
                                `Okay?`,
                            ]
                        },
                        {
                            prompt: cyan`[press enter to finish]`,
                        },
                        { clearScreen: true },
                        {
                            text: [
                                `Happy Nixing 👍`,
                                dim`start a conversation here if you're still confused:`,
                                dim`https://github.com/jeff-hykin/nix_version_search_cli/issues/new`,
                            ]
                        }
                    ]

                    if (!options.explain) {
                        saveExplain(explainationConversation)
                        console.log()
                        console.log(`Okay use the following to get ${humanPackageSummary}`)
                        console.log(``)
                        console.log(cyan`    ${name}.url = ${jsStringToNixString(basePath)}`)
                        if (trailingName) {
                            console.log(dim`    # access^ using: ${cyan.dim`${name}.${trailingName}`}`)
                        } 
                        if (nonDefaultPackages.length > 0) {
                            console.log(``)
                            console.log(dim`Note: you may need to use one of the following to get what you want:`)
                            console.log(nonDefaultPackages.map(each=>dim.lightRed`    ${name}.${each}`).join("\n"))
                        }
                        console.log(``)
                        console.log(dim`If you are not sure how to use this^ run:\n    ${green`nvs `+yellow.dim`--explain`}`)
                    } else {
                        executeConversation(explainationConversation)
                    }
                } else {
                    asInlineNixValue({
                        isRepl: false,
                        explain: options.explain,
                    })
                }
            }
            break
        }
    })

await command.parse(Deno.args)