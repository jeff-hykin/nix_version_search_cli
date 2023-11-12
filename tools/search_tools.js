#!/usr/bin/env -S deno run --allow-all
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"
import { deepCopy, deepCopySymbol, allKeyDescriptions, deepSortObject, shallowSortObject, isGeneratorType,isAsyncIterable, isSyncIterable, isTechnicallyIterable, isSyncIterableObjectOrContainer, allKeys } from "https://deno.land/x/good@1.5.1.0/value.js"

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
        // versions were already retrieved in the first call
        return []
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