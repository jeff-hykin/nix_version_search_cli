#!/usr/bin/env -S deno run --allow-all
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
import { deepCopy, deepCopySymbol, allKeyDescriptions, deepSortObject, shallowSortObject, isGeneratorType,isAsyncIterable, isSyncIterable, isTechnicallyIterable, isSyncIterableObjectOrContainer, allKeys } from "https://deno.land/x/good@1.5.1.0/value.js"
import { run, Out, Stdout, Stderr, returnAsString } from "https://deno.land/x/quickr@0.6.54/main/run.js"

// import { Parser, parserFromWasm } from "https://deno.land/x/deno_tree_sitter@0.1.3.0/main.js"
// import html from "https://github.com/jeff-hykin/common_tree_sitter_languages/raw/4d8a6d34d7f6263ff570f333cdcf5ded6be89e3d/main/html.js"

const versionToList = version=>`${version}`.split(".").map(each=>each.split(/(?<=\d)(?=\D)/)).flat(1).map(each=>each.match(/^\d+$/)?each-0:each)


export const rikudoeSage = {
    async searchBasePackage(query) {
        try {
            // FIXME: "history.nix-packages.com" uses a frontend caching method (not a bad idea)
            // but also doesn't render it, so it can't be scraped from the html
            // so for now, just don't get any package names from here
            return []
            
            // const url = `https://history.nix-packages.com/search?search=${encodeURIComponent(query)}`
            // const htmlResult = await fetch(url).then(result=>result.text())
            // var document = new DOMParser().parseFromString(
            //     htmlResult,
            //     "text/html",
            // )
            // const list = document.querySelector(".search-results ul")
            // if (!list) {
            //     throw Error(`Looks like https://history.nix-packages.com has updated, meaning this CLI tool needs to be updated (issue finding base names $("ul"))` )
            // }
            // const searchResults = [...list.querySelectorAll("a")]
            // return searchResults.map(each=>{
            //     const dataDiv = each.querySelector("div")
            //     const output = {
            //         attrPath: each.innerText,
            //     }
            //     return output
            // })
            
        } catch (error) {
            throw Error(`Unable to connect to history.nix-packages.com:\n    ${error}`)
        }
    },
    async getVersionsFor(attrPath) {
        const url = `https://api.history.nix-packages.com/packages/${encodeURIComponent(attrPath)}`
        const results = await fetch(url).then(result=>result.json())
        return results.map(({name,revision,version})=>({version, hash:revision, attrPath: name}))
    },
}

export const devbox = {
    async searchBasePackage(query) {
        try {
            const url = `https://www.nixhub.io/search?q=${encodeURIComponent(query)}`
            const htmlResult = await fetch(url).then(result=>result.text())
            var document = new DOMParser().parseFromString(
                htmlResult,
                "text/html",
            )
            const list = document.querySelector("ul")
            if (!list) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding base names $("ul"))` )
            }
            const searchResults = [...list.querySelectorAll("li")]
            return searchResults.map(each=>{
                const dataDiv = each.querySelector("div")
                const output = {
                    attrPath: each.querySelector("h3").innerText,
                }
                if (dataDiv) {
                    let key
                    for (const each of [...dataDiv.children]) {
                        if (each.tagName == "DT") {
                            key = each.innerText.trim()
                        }
                        if (key && each.tagName == "DD") {
                            output[key] = each.innerText
                        }
                    }
                }
                return output
            })
        } catch (error) {
            throw Error(`Unable to connect to nixhub.io, ${error}`)
        }
    },
    async getVersionsFor(attrPath) {
        const url = `https://www.nixhub.io/packages/${encodeURIComponent(attrPath)}`
        const htmlResult = await fetch(url).then(result=>result.text())
        const document = new DOMParser().parseFromString(
            htmlResult,
            "text/html",
        )
        const list = document.querySelector("main ul")
        if (!list) {
            throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding list $("main ul"))` )
        }
        const versionElements = [...list.querySelectorAll("li")]
        const versionResults = []
        const prefixForVersionString = "Version "
        for (const eachVersion of versionElements) {
            const divs = [...eachVersion.querySelectorAll("div")]
            const versionStringDiv = divs.filter(each=>each.innerText.startsWith(prefixForVersionString))
            if (!versionStringDiv) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding version string div)` )
            }
            const version = versionStringDiv[0].innerText.slice(prefixForVersionString.length,)
            const referenceInfoOuterDiv = divs.filter(each=>[...each.children].some(subChild=>subChild.innerText.match(/Nixpkgs Reference/)))[0]
            if (!referenceInfoOuterDiv) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue finding version info within list element)` )
            }
            const referenceInfoInnerDiv = [...referenceInfoOuterDiv.querySelectorAll("div")].filter(each=>each.innerText.match("#"))[0]
            if (!referenceInfoInnerDiv) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue extracting inner referece hash div)` )
            }
            const hashAndAttrName = referenceInfoInnerDiv.innerText.replace(/^\s*Nixpkgs Reference\s*/,"").split(/ *# */) 
            if (!(hashAndAttrName.length == 2)) {
                throw Error(`Looks like www.nixhub.io has updated, meaning this CLI tool needs to be updated (issue extracting referece hash from referece hash div)` )
            }
            versionResults.push({
                version,
                hash: hashAndAttrName[0],
                attrPath: hashAndAttrName[1],
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
        const htmlResult = await fetch(url).then(result=>result.text())
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
export async function search(query) {
    let basePackages = []
    for (const [name, sourceTools] of Object.entries(sources)) {
        try {
            basePackages = basePackages.concat(await sourceTools.searchBasePackage(query))
        } catch (error) {
            console.warn(`Failed getting packages from one of the sources (${name}):\n    ${error}\n`)
        }
    }
    for (const value of basePackages) {
        value.versionsPromise = new Promise(async (resolve, reject)=>{
            let versions = []
            for (const [name, sourceTools] of Object.entries(sources)) {
                try {
                    versions = versions.concat(await sourceTools.getVersionsFor(value.attrPath))
                } catch (error) {
                    console.warn(`Failed getting version info from one of the sources (${name}):\n    ${error}\n`)
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
            versions.sort(
                (a, b) => {
                    for (const [numberForA, numberForB ] of zip(versionToList(a.version), versionToList(b.version))) {
                        if (numberForA != numberForB) {
                            if (typeof numberForB == "number" && typeof numberForB == "number") {
                                return numberForB - numberForA
                            } else {
                                return `${numberForB}`.localeCompare(numberForA)
                            }
                        }
                    }
                    return 0
                }
            )
            resolve(versions)
        })
    }

    return basePackages
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
        const versionInfo = await fetch(`${url}/releases`).then(result=>result.json())
        
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
            const info = await run`nix flake show --json --all-systems ${`https://api.flakehub.com/f/${org}/${project}/${version}.tar.gz`} ${Stdout(returnAsString)}`
            return [...new Set(Object.values(JSON.parse(info).packages).map(each=>Object.keys(each)).flat(1))]
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