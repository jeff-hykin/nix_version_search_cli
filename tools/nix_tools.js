import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim, bold, clearAnsiStylesFrom } from "https://deno.land/x/quickr@0.6.56/main/console.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.56/main/run.js"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.5.1.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.56/main/file_system.js"
import * as yaml from "https://deno.land/std@0.168.0/encoding/yaml.ts"

import { selectOne } from "./input_tools.js"

export const jsStringToNixString = (string)=>{
    return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
}
export const listNixPackages =  async ()=>{
    const packageList = await run`nix profile list ${Stdout(returnAsString)}`
    return yaml.parse(
        clearAnsiStylesFrom(
            indent({string:packageList, by: "    "}).replace(/^    Index:/gm, "-\n    Index:")
        )
    )
}

let hasFlakesEnabledString
export const checkIfFlakesEnabled = async ({cacheFolder})=>{
    if (!hasFlakesEnabledString) {
        // 
        // flakes check
        // 
        const flakesCheckPath = `${cacheFolder}/has_flakes_enabled.check.json`
        hasFlakesEnabledString = FileSystem.sync.read(flakesCheckPath)
        if (hasFlakesEnabledString == null) {
            console.warn(`\n${cyan`❄️`} Checking if you use flakes...`)
            console.warn(dim`- (this will only run once)`)
            try {
                const result = await run`nix profile list ${Stdout(returnAsString)} ${Stderr(null)}`
                hasFlakesEnabledString = !!result.match(/^Flake attribute: /m)
            } catch (error) {
                hasFlakesEnabledString = false
            }
            if (hasFlakesEnabledString) {
                console.warn(`${dim`- Okay looks like you do use flakes!`} ${cyan`❄️`}`)
            } else {
                console.warn(`${dim`- Okay looks like you dont use flakes`} ${red`X`}`)
            }
            console.warn(`${dim`- Saving this preference to disk at:\n    `}${yellow(JSON.stringify(flakesCheckPath))}`)
            hasFlakesEnabledString = JSON.stringify(hasFlakesEnabledString)
            console.warn(`\n`)
            FileSystem.sync.write({
                data: hasFlakesEnabledString,
                path: flakesCheckPath,
            })
        }
    }
    return JSON.parse(hasFlakesEnabledString)
}

export const removeExistingPackage = async ({urlOrPath, storePath, packages})=>{
    packages = packages || await listNixPackages()
    try {
        const uninstallList = []
        for (const eachPackage of packages) {
            const storePaths = eachPackage["Store paths"].split(":").filter(each=>each.length > 0)
            const storePathMatches = storePaths.some(eachStorePath=>`${storePath}`.startsWith(eachStorePath))
            if (storePath && storePathMatches) {
                uninstallList.push(eachPackage)
            } else if (urlOrPath) {
                if (eachPackage["Original flake URL"] == urlOrPath) {
                    uninstallList.push(eachPackage)
                }
            }
        }
        for (const each of uninstallList) {
            if (each.Index!=null) {
                try {
                    await run`nix profile remove ${`${each.Index}`.trim()}`
                } catch (error) {
                }
            }
        }
    } catch (error) {
        console.warn(error)
    }
}

export async function install({hasFlakesEnabled, humanPackageSummary, urlOrPath, force}) {
    if (hasFlakesEnabled) {
        console.log(`Okay installing ${humanPackageSummary}`)
        let noProgressLoopDetection
        install: while (1) {
            let stderrOutput = ""
            const listener = {
                write(chunk) {
                    stderrOutput += (new TextDecoder()).decode(chunk)
                }
            }
            // try the install
            const installCommand = `nix profile install ${jsStringToNixString(urlOrPath)}`
            terminalSpinner = new TerminalSpinner()
            terminalSpinner.start(dim`- running: ${installCommand}`)
            var { success } = await run`nix profile install ${urlOrPath} ${Stderr(Deno.stderr, listener)}`
            terminalSpinner.stop()
            if (noProgressLoopDetection == stderrOutput) {
                console.error(red(stderrOutput))
                console.error(`\n - ❌ there was an issue installing ${humanPackageSummary}`)
                throw Error(`Sorry, it looks like I was unable to install the package`)
            }
            noProgressLoopDetection = stderrOutput
            const conflictMatch = stderrOutput.match(/error: An existing package already provides the following file:(?:\w|\W)+?(?<existing>\/nix\/store\/.+)(?:\w|\W)+?This is the conflicting file from the new package:(?:\w|\W)+?(?<newPackage>\/nix\/store\/.+)(?:\w|\W)+?To remove the existing package:(?:\w|\W)+?(?<removeExisting>nix profile remove.+)(?:\w|\W)+?To prioritise the new package:(?:\w|\W)+?(?<prioritiseNew>nix profile install.+)(?:\w|\W)+?To prioritise the existing package:(?:\w|\W)+?(?<prioritiseExisting>nix profile install.+)/)
            if (conflictMatch) {
                const { existing, newPackage, removeExisting, prioritiseNew, prioritiseExisting } = conflictMatch.groups
                const [ folders, name, ext ] = FileSystem.pathPieces(existing)
                const simpleName = cyan(folders.slice(4,).join("/"))+cyan("/")+green(name+ext)
                clearScreen()
                const packages = await listNixPackages()
                
                if (force) {
                    const urlOrPath = (removeExisting.slice(("nix profile remove ").length).match(/(.+?)#/)||"")[1]
                    if (removeExisting) {
                        await removeExistingPackage({urlOrPath, storePath: existing, packages})
                    }
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
                        throw Error(`cancel`)
                    } else if (choice == newHigherPriorityOption) {
                        await run(prioritiseNew.trim().split(/\s/g))
                    } else if (choice == installAsLowerOption) {
                        await run(prioritiseExisting.trim().split(/\s/g))
                    } else if (choice == uninstallOption) {
                        const urlOrPath = (removeExisting.slice(("nix profile remove ").length).match(/(.+?)#/)||"")[1]
                        if (removeExisting) {
                            await removeExistingPackage({urlOrPath, storePath: existing, packages})
                        }
                    }
                    continue install
                }
            } else if (!success) {
                console.error(red(stderrOutput))
                console.error(`\n - ❌ there was an issue installing ${humanPackageSummary}`)
                throw Error(`Sorry, it looks like I was unable to install the package`)
            } else {
                console.log(`\n - ✅ ${humanPackageSummary} should now be installed`)
            }
            break
        }
    } else {
        const installCommand = `nix-env -iA ${jsStringToNixString(versionInfo.attrPath)} -f ${jsStringToNixString(`https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`)}`
        console.log(dim`- running: ${installCommand}`)
        var {success} = await run`nix-env -iA ${versionInfo.attrPath} -f ${`https://github.com/NixOS/nixpkgs/archive/${versionInfo.hash}.tar.gz`}`
        if (success) {
            console.log(`\n - ✅ ${versionInfo.attrPath}@${versionInfo.version} should now be installed`)
        } else {
            console.error(`\n - ❌ there was an issue installing ${versionInfo.attrPath}@${versionInfo.version}`)
        }
    }
}