#!/usr/bin/env -S deno run --allow-all
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.7.1.1/array.js"
import { deepCopy, deepCopySymbol, allKeyDescriptions, deepSortObject, shallowSortObject, isGeneratorType,isAsyncIterable, isSyncIterable, isTechnicallyIterable, isSyncIterableObjectOrContainer, allKeys } from "https://deno.land/x/good@1.7.1.1/value.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.7.4/main/run.js"
import { FileSystem } from "https://deno.land/x/quickr@0.7.4/main/file_system.js"
import DateTime from "https://deno.land/x/good@1.7.1.1/date.js"

// import { Parser, parserFromWasm } from "https://deno.land/x/deno_tree_sitter@0.1.3.0/main.js"
// import html from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/4d8a6d34d7f6263ff570f333cdcf5ded6be89e3d/main/html.js"

import { versionToList, versionSort } from "./misc.js"
import names from "../names.js"

const refreshCacheEvery = 1 // days

export const rikudoeSage = {
    async searchBasePackage(query, {cacheFolder}) {
        try {
            const nameCachePath = `${cacheFolder}/rikudoeSage.allPackages.cache.js`
            const mostRecentCheckPath = `${cacheFolder}/lastChecked.json`
            const [nameCacheInfo, recentCheckInfo ] = await Promise.all([
                FileSystem.info(nameCachePath),
                FileSystem.info(mostRecentCheckPath),
            ])
            
            const fetchData = ()=>{
                // dont await because it doesn't matter
                return fetch("https://api.history.nix-packages.com/packages", {
                    "credentials": "omit",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-site"
                    },
                    "referrer": "https://history.nix-packages.com/",
                    "method": "GET",
                    "mode": "cors"
                }).catch(_=>0).then(result=>result.json().catch(_=>0)).then(listOfPackageNames=>listOfPackageNames)
            }

            let output = []
            if (!nameCacheInfo.isFile) {
                if (names.has(query)) {
                    output = [ { attrPath: query } ]
                }
            } else {
                let names
                try {
                    names = (await import(`data:text/javascript;base64,${btoa(await Deno.readTextFile(nameCachePath))}`)).default
                } catch (error) {
                }
                if (!names) {
                    names = await fetchData().then(listOfPackageNames=>{
                        FileSystem.write({
                            path: nameCachePath,
                            data: "export default new Set("+JSON.stringify(listOfPackageNames)+")",
                        }).catch(_=>0)
                        return new Set(listOfPackageNames)
                    })
                }
                if (names.has(query)) {
                    output = [ { attrPath: query } ]
                }
            }
            
            if (recentCheckInfo.isFile) {
                let lastCheckedUnixTime
                try {
                    lastCheckedUnixTime = JSON.parse(await FileSystem.read(mostRecentCheckPath))
                } catch (error) {
                    // e.g. dont fetch data again
                    return output
                }
                const lastCheckedTime = new DateTime(lastCheckedUnixTime)
                const oneDayAgo = (new DateTime()).add({days: -refreshCacheEvery})
                const lastFetchWasWithin24Hours = oneDayAgo.unix < lastCheckedTime
                if (lastFetchWasWithin24Hours) {
                    // e.g. dont fetch data again
                    return output
                }
            }
            const now =(new DateTime())
            FileSystem.write({
                data: JSON.stringify(now.unix),
                path: recentCheckInfo.path,
            }).catch(_=>0)
            // dont await because it doesn't matter
            fetchData().then(listOfPackageNames=>{
                FileSystem.write({
                    path: nameCachePath,
                    data: "export default new Set("+JSON.stringify(listOfPackageNames)+")",
                }).catch(_=>0)
            })

            return output
        } catch (error) {
            console.error(error)
            throw Error(`Unable to connect to history.nix-packages.com:\n    ${error}`)
        }
    },
    async getVersionsFor(attrPath) {
        const url = `https://api.history.nix-packages.com/packages/${encodeURIComponent(attrPath)}`
        let results
        try {
            results = await fetch(url).then(result=>result.json())
        } catch (error) {
            return []
        }
        return results.map(({name,revision,version})=>{
            // console.debug(`revision is:`,revision)
            // console.debug(`name is:`,name)
            return ({version: version, hash:revision, attrPath: name})
        })
    },
}

export const devbox = {
    async searchBasePackage(query) {
        try {
            var url = `https://www.nixhub.io/search?q=${encodeURIComponent(query)}&_data=routes%2F_nixhub.search` // `https://www.nixhub.io/search?q=${encodeURIComponent(query)}`
            try {
                var response = await fetch(url).then(result=>result.json())
            } catch (error) {
                // try one more time, sometimes nixhub.io just has issues
                if (`${error}`.match(/^fetchingSyntaxError: Unexpected end of JSON input/)) {
                    var response = await fetch(url).then(result=>result.text())
                    if (globalThis.debugMode) {
                        console.debug(`response is:`,response)
                    }
                    var response = JSON.parse(response)
                }
            }
            var packages = response?.results||[]
            
            // var document = new DOMParser().parseFromString(
            //     htmlResult,
            //     "text/html",
            // )
            // var list = document.querySelector("ul") || document.querySelector("ol")
            // if (!list) {
            //     throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding base names $("ul"))` )
            // }
            // var searchResults = [...list.querySelectorAll("li")]
            // searchResults.map(each=>each.querySelector("h3").innerText)
            return packages.map(each=>{
                // const hexAndNameString = each.querySelector(".inline-flex").innerText
                return {
                    attrPath: each?.name,
                    description: each?.summary,
                    // hash: hexAndNameString.split(/#/)[0],
                    // version: each.querySelector("h3").innerText.replace(/^Version/i,""),
                }
            })
        } catch (error) {
            if (globalThis.debugMode) {
                console.error(error)
            }
            throw Error(`Unable to connect to nixhub.io, ${error}`, error)
        }
    },
    async getVersionsFor(attrPath) {
        const url = `https://www.nixhub.io/packages/${encodeURIComponent(attrPath)}`
        let htmlResult
        try {
            htmlResult = await fetch(url).then(result=>result.text())
        } catch (error) {
            return []
        }
        const document = new DOMParser().parseFromString(
            htmlResult,
            "text/html",
        )
        if (document.body.innerText.match(/^application error/i)) {
            return []
        }
        const list = document.querySelector("main ol")
        if (!list) {
            throw Error(`Looks like www.nixhub.io has updated, ${url} meaning this CLI tool needs to be updated (issue finding list $("main ol"))` )
        }
        const versionElements = [...list.querySelectorAll("li")]
        const versionResults = []
        const prefixForVersionString = /^version/
        for (const eachVersion of versionElements) {
            const divs = [...eachVersion.querySelectorAll("div")]
            const h3s = [...eachVersion.querySelectorAll("h3")]
            const versionStringDiv = h3s.filter(each=>each.innerText.toLowerCase().match(prefixForVersionString))
            if (versionStringDiv.length == 0) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding version string div)` )
            }
            const version = versionStringDiv[0]?.innerText.replace(prefixForVersionString, "")
            const referenceInfoOuterDiv = divs.filter(each=>[...each.children].some(subChild=>subChild.innerText.match(/Nixpkgs Reference/)))[0]
            if (!referenceInfoOuterDiv) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding version info within list element)` )
            }
            const hashAndAttrName = referenceInfoOuterDiv.querySelector("p").innerText.replace(/^\s*Nixpkgs Reference\s*/,"").split(/ *# */).map(each=>each.trim())
            if (!(hashAndAttrName.length == 2)) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue extracting referece hash from referece hash div)` )
            }
            // console.debug(`hashAndAttrName[0] is:`,hashAndAttrName[0])
            // console.debug(`hashAndAttrName[1] is:`,hashAndAttrName[1])
            versionResults.push({
                version: version.replace(/^Version/i, ""),
                hash: hashAndAttrName[0],
                attrPath: hashAndAttrName[1].replace(/, .*$/,""),
            })
        }
        return versionResults
    }
}

export const lazamar = {
    searchBasePackage(query) {
        return []
        // return Object.values(dataPerAttributePath)
    },
    async getVersionsFor(attrPath) {
        let query = attrPath.split(".").slice(-1)[0]
        const url = `https://lazamar.co.uk/nix-versions/?channel=nixpkgs-unstable&package=${encodeURIComponent(query)}`
        let htmlResult
        try {
            htmlResult = await fetch(url).then(result=>result.text())
        } catch (error) {
            return []
        }
        const document = new DOMParser().parseFromString(
            htmlResult,
            "text/html",
        )
        const table = document.querySelector(".pure-table-bordered.pure-table tbody")
        const dataPerAttributePath = {}
        for (let each of [...table.children]) {
            let [ packageNameNode, versionNode, revisionNode, dateNode ] = [...each.children]
            const anchor = revisionNode.querySelector("a")
            const params = new URLSearchParams(anchor.getAttribute("href"))
            const attrPath = params.get("keyName")
            if (attrPath) {
                dataPerAttributePath[attrPath] = dataPerAttributePath[attrPath]||{ attrPath, versions:[] }
                // console.debug(`params.get("revision") is:`,params.get("revision"))
                // console.debug(`attrPath is:`,attrPath)
                dataPerAttributePath[attrPath].versions.push({
                    version: params.get("version"),
                    hash: params.get("revision"),
                    attrPath,
                    date: dateNode.innerText,
                })
            }
        }
        return dataPerAttributePath[attrPath]?.versions||[]
    }
}

const sources = {
    "lazamar.co.uk": lazamar,
    "history.nix-packages.com":rikudoeSage,
    "nixhub.io": devbox,
}
export async function search(query, { cacheFolder }) {
    let basePackages = []
    for (const [name, sourceTools] of Object.entries(sources)) {
        try {
            const newResults = await sourceTools.searchBasePackage(query, {cacheFolder})
            basePackages = basePackages.concat(newResults)
        } catch (error) {
            console.warn(`\nFailed getting packages from one of the sources (${name}):\n    ${error}\n`)
            if (globalThis.debugMode) {
                console.error(error.stack)
            }
        }
    }
    basePackages = basePackages.filter(each=>each)
    let warned = false
    for (const value of basePackages) {
        value.versionsPromise = new Promise(async (resolve, reject)=>{
            let versions = []
            for (const [name, sourceTools] of Object.entries(sources)) {
                try {
                    versions = versions.concat(await sourceTools.getVersionsFor(value.attrPath))
                } catch (error) {
                    if (!warned) {
                        warned = true
                        console.warn(`Failed getting version info from one of the sources (${name}):\n    ${error}\n`)
                        // console.debug(`error.stack is:`,error.stack)
                    }
                    resolve(null)
                }
            }
            const alreadySeen = new Set()
            versions = versions.filter(each=>{
                if (alreadySeen.has(each.version)) {
                    return false
                }
                alreadySeen.add(each.version)
                return true
            })
            versions = versionSort({array: versions, elementToVersion: (each)=>each.version})
            resolve(versions)
        })
    }

    for (const each of basePackages) {
        for (const [key, value] of Object.entries(each)) {
            each[key.toLowerCase()] = value
        }
    }

    // 
    // remove version-in-attr-name duplicates based on short-description equality
    // 
    const names = {}
    for (const each of basePackages) {
        if (each.description && each.attrPath) {
            if (each.attrPath.split(".").length == 1) {
                names[each.attrPath] = each
            }
        }
    }
    const outputList = []
    for (const each of basePackages) {
        const wasNotExactMatch = each.attrPath != query
        if (wasNotExactMatch && each.description && each.attrPath) {
            // only worry about base name for now, in future we could do this for sub-packages as well (ex: pythonPackages.opencv3)
            if (each.attrPath.split(".").length == 1) {
                const attrName = each.attrPath
                if (attrName.match(/\d+$/)) {
                    const simplifiedName = attrName.replace(/\d+$/,"")
                    // then its almost certainly the same package, e.g. skip it
                    if (names[simplifiedName] && (names[simplifiedName].description == each.description)) {
                        continue
                    }
                }
            }
        }
        outputList.push(each)
    }
    
    return outputList
}

export const determinateSystems = {
    async searchBasePackage(query) {
        const output = await fetch("https://b4lflfxxy4-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.20.0)%3B%20Browser%3B%20instantsearch.js%20(4.58.0)%3B%20react%20(18.2.0)%3B%20react-instantsearch%20(7.2.0)%3B%20react-instantsearch-core%20(7.2.0)%3B%20JS%20Helper%20(3.14.2)", {
            "credentials": "omit",
            "headers": {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
                "Accept": "*/*",
                "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
                "x-algolia-api-key": "1673b56771c2f826310f4bdf25a43c42",
                "x-algolia-application-id": "B4LFLFXXY4",
                "content-type": "application/x-www-form-urlencoded",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "cross-site"
            },
            "referrer": "https://flakehub.com/",
            "body": `{\"requests\":[{\"indexName\":\"flakes\",\"params\":\"clickAnalytics=true&facets=%5B%5D&highlightPostTag=__%2Fais-highlight__&highlightPreTag=__ais-highlight__&hitsPerPage=100&query=${JSON.stringify(encodeURIComponent(query)).slice(1,-1)}l&tagFilters=\"}]}`,
            "method": "POST",
            "mode": "cors"
        }).then(result=>result.json())
        return output.results[0]?.hits||[]
    },
    async getVersionsFor(flakePackage) {
        const { org, project, description, labels } = flakePackage
        const url = `https://flakehub.com/f/${org}/${project}`
        let versionInfo
        try {
            versionInfo = await fetch(`${url}/releases`).then(result=>result.json())
        } catch (error) {
            return []
        }
        
        // outputInfo
        // {
        //     "created_at": "2023-09-01T22:44:00.805639Z",
        //     "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //     "download_url": "https://api.flakehub.com/f/mrcjkb/haskell-tools.nvim/3.0.0.tar.gz",
        //     "labels": [
        //         "telescope",
        //         "neovim",
        //         "vim",
        //         "dap",
        //         "plugin",
        //         "neovim-plugin",
        //         "lua",
        //         "repl",
        //         "fast-tags",
        //         "nvim",
        //         "language-server",
        //         "lsp-client",
        //         "haskell",
        //         "debug-adapter-protocol",
        //         "language-server-protocol",
        //         "hoogle",
        //         "lsp",
        //         "tagfunc"
        //     ],
        //     "mirrored": false,
        //     "org": "mrcjkb",
        //     "outputs": {
        //         "checks": {
        //             "doc": "The `checks` flake output contains derivations that will be built by `nix flake check`.\n",
        //             "name": "checks",
        //             "outputs": [
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-no-hls"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-no-telescope"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-no-telescope-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-no-telescope-with-hoogle"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-test-no-telescope-with-hoogle-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "pre-commit-check"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "type-check-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-darwin",
        //                                 "type-check-stable"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         }
        //                     ],
        //                     "platform": "aarch64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-no-hls"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-no-telescope"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-no-telescope-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-no-telescope-with-hoogle"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-test-no-telescope-with-hoogle-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "pre-commit-check"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "type-check-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "aarch64-linux",
        //                                 "type-check-stable"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         }
        //                     ],
        //                     "platform": "aarch64-linux"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-no-hls"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-no-telescope"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-no-telescope-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-no-telescope-with-hoogle"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-test-no-telescope-with-hoogle-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "pre-commit-check"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "type-check-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-darwin",
        //                                 "type-check-stable"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         }
        //                     ],
        //                     "platform": "x86_64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-no-hls"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-no-telescope"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-no-telescope-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-no-telescope-with-hoogle"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-test-no-telescope-with-hoogle-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "pre-commit-check"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "type-check-nightly"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "checks",
        //                                 "x86_64-linux",
        //                                 "type-check-stable"
        //                             ],
        //                             "short_description": "",
        //                             "what": "CI test"
        //                         }
        //                     ],
        //                     "platform": "x86_64-linux"
        //                 }
        //             ]
        //         },
        //         "devShells": {
        //             "doc": "The `devShells` flake output contains derivations that provide a build environment for `nix develop`.\n",
        //             "name": "devShells",
        //             "outputs": [
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "aarch64-darwin",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         }
        //                     ],
        //                     "platform": "aarch64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "aarch64-linux",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "aarch64-linux",
        //                                 "haskell-tools"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         }
        //                     ],
        //                     "platform": "aarch64-linux"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "x86_64-darwin",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         }
        //                     ],
        //                     "platform": "x86_64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "x86_64-linux",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "devShells",
        //                                 "x86_64-linux",
        //                                 "haskell-tools"
        //                             ],
        //                             "short_description": "",
        //                             "what": "development environment"
        //                         }
        //                     ],
        //                     "platform": "x86_64-linux"
        //                 }
        //             ]
        //         },
        //         "overlays": {
        //             "doc": "The `overlays` flake output defines \"overlays\" that can be plugged into Nixpkgs.\nOverlays add additional packages or modify or replace existing packages.\n",
        //             "name": "overlays",
        //             "outputs": [
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 null
        //                             ],
        //                             "path": [
        //                                 "overlays",
        //                                 "default"
        //                             ],
        //                             "short_description": null,
        //                             "what": "Nixpkgs overlay"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 null
        //                             ],
        //                             "path": [
        //                                 "overlays",
        //                                 "haskell-tooling-overlay"
        //                             ],
        //                             "short_description": null,
        //                             "what": "Nixpkgs overlay"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 null
        //                             ],
        //                             "path": [
        //                                 "overlays",
        //                                 "test-overlay"
        //                             ],
        //                             "short_description": null,
        //                             "what": "Nixpkgs overlay"
        //                         }
        //                     ],
        //                     "platform": null
        //                 }
        //             ]
        //         },
        //         "packages": {
        //             "doc": "The `packages` flake output contains packages that can be added to a shell using `nix shell`.\n",
        //             "name": "packages",
        //             "outputs": [
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-darwin",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-darwin",
        //                                 "docgen"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-darwin",
        //                                 "haskell-tools-nvim"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         }
        //                     ],
        //                     "platform": "aarch64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-linux",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-linux",
        //                                 "docgen"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "aarch64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "aarch64-linux",
        //                                 "haskell-tools-nvim"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         }
        //                     ],
        //                     "platform": "aarch64-linux"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-darwin",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-darwin",
        //                                 "docgen"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-darwin"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-darwin",
        //                                 "haskell-tools-nvim"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         }
        //                     ],
        //                     "platform": "x86_64-darwin"
        //                 },
        //                 {
        //                     "outputs": [
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-linux",
        //                                 "default"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-linux",
        //                                 "docgen"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         },
        //                         {
        //                             "doc": null,
        //                             "for_systems": [
        //                                 "x86_64-linux"
        //                             ],
        //                             "path": [
        //                                 "packages",
        //                                 "x86_64-linux",
        //                                 "haskell-tools-nvim"
        //                             ],
        //                             "short_description": "",
        //                             "what": "package"
        //                         }
        //                     ],
        //                     "platform": "x86_64-linux"
        //                 }
        //             ]
        //         }
        //     },
        //     "pretty_download_url": "https://flakehub.com/f/mrcjkb/haskell-tools.nvim/3.0.0.tar.gz",
        //     "project": "haskell-tools.nvim",
        //     "readme": 
        //     "revision": "a9d4290ff95c65bad11b5117109d8ca19fa6b370",
        //     "simplified_version": "3.0.0",
        //     "source_github_owner_repo_pair": "mrcjkb/haskell-tools.nvim",
        //     "source_subdirectory": null,
        //     "spdx_identifier": "GPL-2.0",
        //     "version": "3.0.0",
        //     "visibility": "public"
        // }
        
        // versionInfo
        // [
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "a9d4290ff95c65bad11b5117109d8ca19fa6b370",
        //         "simplified_version": "3.0.0",
        //         "version": "3.0.0",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 532,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-10-28T21:25:47.015794Z",
        //         "index": 1,
        //         "total": 6
        //     },
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "92e097c6832405fb64e4c44a7ce8bebe7836cae6",
        //         "simplified_version": "2.4.0",
        //         "version": "2.4.0",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 518,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-10-13T01:16:13.015415Z",
        //         "index": 2,
        //         "total": 6
        //     },
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "b19df600da8ef5fb4fb280815415ebd2a4228f0f",
        //         "simplified_version": "2.3.0",
        //         "version": "2.3.0",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 506,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-09-20T15:54:42.090013Z",
        //         "index": 3,
        //         "total": 6
        //     },
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "1eee0b595621931579a68a1731eb820b8177c2f0",
        //         "simplified_version": "2.1.0",
        //         "version": "2.1.0",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 494,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-09-10T17:49:52.221368Z",
        //         "index": 4,
        //         "total": 6
        //     },
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "fd7c33cc3e893a12c1d90aca9ff7ede7d01f003d",
        //         "simplified_version": "2.0.2",
        //         "version": "2.0.2",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 479,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-09-02T21:37:08.375354Z",
        //         "index": 5,
        //         "total": 6
        //     },
        //     {
        //         "description": "haskell-tools.nvim - supercharge your haskell experience in neovim",
        //         "revision": "85bcc3129f892cf0cb02432f1bae68fd4216844c",
        //         "simplified_version": "2.0.1",
        //         "version": "2.0.1",
        //         "visibility": "public",
        //         "readme":
        //         "commit_count": 475,
        //         "mirrored": false,
        //         "yanked_at": null,
        //         "updated_at": "2023-11-08T18:44:23.937246Z",
        //         "published_at": "2023-09-01T22:44:01.531396Z",
        //         "index": 6,
        //         "total": 6
        //     }
        // ]
        
        const extractOutputs = async (version)=>{
            try {
                const info = await run`nix flake show --json --all-systems ${`https://api.flakehub.com/f/${org}/${project}/${version}.tar.gz`} ${Stdout(returnAsString)} ${Stderr(null)}`
                return [...new Set(Object.values(JSON.parse(info).packages).map(each=>Object.keys(each)).flat(1))]
            } catch (error) {
                return []
            }
        } 

        await Promise.all(
            versionInfo.map(
                each=>
                    extractOutputs(each.simplified_version).then(
                        (result)=>{
                            each.packageOutputs = result
                        }
                    )
            )
        )
        
        return versionInfo
    },
    async search(query) {
        const results = await this.searchBasePackage(query)
        for (const each of results) {
            each.versionsPromise = this.getVersionsFor(each)
        }
        return results
    },
}