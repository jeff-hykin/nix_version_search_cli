import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
// import { FileSystem } from "https://deno.land/x/quickr@0.6.51/main/file_system.js"
import { Console, red, lightRed, yellow, green, cyan, dim, bold, clearAnsiStylesFrom } from "https://deno.land/x/quickr@0.6.56/main/console.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.56/main/run.js"
import { capitalize, indent, toCamelCase, digitsToEnglishArray, toPascalCase, toKebabCase, toSnakeCase, toScreamingtoKebabCase, toScreamingtoSnakeCase, toRepresentation, toString, regex, findAll, iterativelyFindAll, escapeRegexMatch, escapeRegexReplace, extractFirst, isValidIdentifier, removeCommonPrefix, didYouMean } from "https://deno.land/x/good@1.5.1.0/string.js"
import { FileSystem } from "https://deno.land/x/quickr@0.6.56/main/file_system.js"
import * as yaml from "https://deno.land/std@0.168.0/encoding/yaml.ts"

function nameToIndicies(name, packageInfo) {
    const packages = packageInfo.elements.map((each,index)=>[each,index])
    let attrNameIndicies = packages.filter(([each, index])=>each?.attrPath&&each.attrPath.endsWith(`.${name}`)).map(([each,index])=>index)
    if (attrNameIndicies.length == 0) {
        const indices = []
        packages.reverse()
        for (const [each,index] of packages) {
            if (each?.storePaths) {
                const commonName = each.storePaths.map(each=>each.slice(storePathBaseLength,)).sort((a,b)=>a.length-b.length)[0]
                if (commonName == name) {
                    attrNameIndicies.push(index)
                }
            }
        }
    }
    return attrNameIndicies
}

const storePathBaseLength = ("/nix/store/9i7rbbhxi1nnqibla22s785svlngcnvw-").length

async function remove(name) {
    let deletedSomething = false 
    while (true) {
        const text = await run`nix profile list --json ${Stdout(returnAsString)}`
        var packageInfo = JSON.parse(text)
        const indices = nameToIndicies("nvs",packageInfo)
        if (indices.length ==  0){
            break
        }
        for (const each of nameToIndicies("nvs",packageInfo)) {
            console.log(`running: nix profile remove ${each}`)
            await run`nix profile remove ${`${each}`}`
            deletedSomething = true
        }
    }
    if (!deletedSomething) {
        const packages = packageInfo.elements.map((each,index)=>[each,index])
        packages.reverse()
        next_package: for (const [each,index] of packages) {
            if (each?.storePaths) {
                const commonName = each.storePaths.map(each=>each.slice(storePathBaseLength,)).sort((a,b)=>a.length-b.length)[0]
                let attrName = `${each?.attrName}`.split(".").slice(2,).join(".")
                if (attrName == "default") {
                    attrName = null
                } else if (attrName.startsWith("default.")) {
                    attrName = attrName.slice(("default.").length,)
                }
                let packageName = ""
                if (attrName && commonName) {
                    packageName = `${attrName} (aka ${commonName})`
                } else {
                    packageName = attrName || commonName
                }
                for (const eachPath of each?.storePaths) {
                    for (const eachBinPath of await FileSystem.listFilePathsIn(`${eachPath}/bin`)) {
                        if (FileSystem.basename(eachBinPath) == name) { 
                            console.log(`This package ${yellow(packageName)} contains ${green(name)} as an executable`)
                            if (await Console.askFor.yesNo(`Do you want to remove the package?`)) {
                                await run`nix profile remove ${index}`
                            }
                            continue next_package
                        }
                    }
                }
            }
        }
    }
}

await remove(Deno.args[0])

// const packageInfo = JSON.parse({
//     "elements": [
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/8xzlyndbxcvazdsbg0iadq0xbw55rvyn-python3.10-hydra-check-1.3.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/gjpn24490s7isxi5k1j0qfl3xk06lb48-tree-2.1.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/6xz3p1g46b8maslmqbws7dz0mb9xl9rn-nano-7.2"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/3j13fydymk9xpw0k8rihxhicqj4v22c2-zsh-5.9"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/2kiyqzz2rd2q0nial9jbb8mi0ybpcxss-git-subrepo-0.4.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/zxcacldqm83vcidj2hkq3bvxl5b5sj3x-dua-2.20.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/95l2z80kcbrvlbsvbs964y9iwl36zg4r-exa-0.10.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/fx5l0wlkmfpbflw3jja0pjs8dcji5rih-ungit-1.5.24"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/38wf8xjlv4bn7245445xs4fxs6rlvnvf-cachix-1.6.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/ayh7g27mz9r8dhr3jzk9j7qxbl6rkghk-npm-10.1.0"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/vgmnbka10hs7rm9k8jw7gkx7ls8hsjq8-esbuild-0.19.5"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qwvf64hkj1bldkm3cdl3anda0j7dka8j-python3.11-black-23.9.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/24ajznyylhxh7gcbhc2a6ccfn9wlz8xx-tealdeer-1.6.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/211vjr5mv6bgcwwvhq5jc4lr8nwywiq5-wakapi-2.8.2"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qyby4f90rmax54dx9dd0hd1b1gxk9sdn-fd-8.7.1"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/gl6iw4wyczib1m266fdx87lpsj9w3xj1-coreutils-9.0"
//             ]
//         },
//         {
//             "active": true,
//             "priority": 4,
//             "storePaths": [
//                 "/nix/store/ayh7g27mz9r8dhr3jzk9j7qxbl6rkghk-npm-10.1.0"
//             ]
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.1.0.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.1.0.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.default",
//             "originalUrl": "https://flakehub.com/f/snowfallorg/cowsay/1.2.1.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/wlg4irk8cd9mlin9nakrlgwvvias0a4q-cowsay"
//             ],
//             "url": "https://api.flakehub.com/f/pinned/snowfallorg/cowsay/1.2.1/018bb6b5-1cdb-7a8c-a6b9-1fbb37b1bbc2/source.tar.gz?narHash=sha256-TtP0nZMaiRXqnALMcK7a085yvnh2deTs4RV29yRmS24%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.deno",
//             "originalUrl": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/l940dh07v9ns1h666d3hrb4am75yhym3-deno-1.37.2"
//             ],
//             "url": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz?narHash=sha256-URLqkHhlS/zH7lMr50nc4Eb06leBa3r48ZloxQTd96A%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.xplr",
//             "originalUrl": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/p114qjgxrc59qpg8c5lwyv846nxg78y5-xplr-0.21.3"
//             ],
//             "url": "https://github.com/NixOS/nixpkgs/archive/6d9c572be2b199be0456845a61d7e4b3e3ac6280.tar.gz?narHash=sha256-URLqkHhlS/zH7lMr50nc4Eb06leBa3r48ZloxQTd96A%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.bottom",
//             "originalUrl": "path:/nix/store/1dklh99pdzxcxmrxz3i63rb3pa832yik-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/xkmrqzyvdypm1k5yp5vzmhq3kaq955ya-bottom-0.9.6"
//             ],
//             "url": "path:/nix/store/1dklh99pdzxcxmrxz3i63rb3pa832yik-source?lastModified=0&narHash=sha256-kEmpezCR/FpITc6yMbAh4WrOCiT2zg5pSjnKrq51h5Y%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.ripgrep",
//             "originalUrl": "path:/nix/store/dp1dqbqn1a95976yzrpc1ph6880kwr2g-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/qgjyy47yz3klh9y7psj721xxciadv57w-ripgrep-14.0.3"
//             ],
//             "url": "path:/nix/store/dp1dqbqn1a95976yzrpc1ph6880kwr2g-source?lastModified=0&narHash=sha256-7LK019%2BY9khM18WjIt4ISK2yd1P5z%2BCXJq0ts%2BE13UA%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "legacyPackages.aarch64-darwin.sd",
//             "originalUrl": "path:/nix/store/7g8wbm1z6948x0qma4hzkkb9a3xys76w-source",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/29xrgg1hdx9f6yyyd3b8b7501al6z1k0-sd-1.0.0"
//             ],
//             "url": "path:/nix/store/7g8wbm1z6948x0qma4hzkkb9a3xys76w-source?lastModified=0&narHash=sha256-ugr1QyzzwNk505ICE4VMQzonHQ9QS5W33xF2FXzFQ00%3D"
//         },
//         {
//             "active": true,
//             "attrPath": "packages.aarch64-darwin.nvs",
//             "originalUrl": "https://github.com/jeff-hykin/nix_version_search_cli/archive/8a57c4bed8a90bed03c57575b7d81d969c886664.tar.gz",
//             "outputs": null,
//             "priority": 5,
//             "storePaths": [
//                 "/nix/store/swsav18chnc2lf6b66lwn0hwhhl44ka1-nvs"
//             ],
//             "url": "https://github.com/jeff-hykin/nix_version_search_cli/archive/8a57c4bed8a90bed03c57575b7d81d969c886664.tar.gz?narHash=sha256-0CJA2cTaTWo4SwR1WyltI63imwFLAEsd50DTz6vJdsk%3D"
//         }
//     ],
//     "version": 2
// })