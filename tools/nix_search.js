let channelPrefixCache, channelCache

/**
 * @example
 * ```js
 * let result = await searchNixpkgs("kaitai", { localStorageKey: "nixpkgs-search-cache:"+Math.random() })
 * console.debug(`result is:`,result)
 * // result is: {
 * //   took: 75,
 * //   timed_out: false,
 * //   _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
 * //   hits: {
 * //     total: { value: 3, relation: "eq" },
 * //     max_score: null,
 * //     hits: [
 * //       {
 * //         _index: "nixos-43-25.05-d179d77c139e0a3f5c416477f7747e9d6b7ec315",
 * //         _type: "_doc",
 * //         _id: "BZhKL5kBwGFDkYUDsDGk",
 * //         _score: 58.903957,
 * //         _source: {
 * //           type: "package",
 * //           package_attr_name: "kaitai-struct-compiler",
 * //           package_attr_set: "No package set",
 * //           package_pname: "kaitai-struct-compiler",
 * //           package_pversion: "0.10",
 * //           package_platforms: [Array],
 * //           package_outputs: [Array],
 * //           package_default_output: "out",
 * //           package_programs: [Array],
 * //           package_license: [Array],
 * //           package_license_set: [Array],
 * //           package_maintainers: [Array],
 * //           package_maintainers_set: [Array],
 * //           package_teams: [],
 * //           package_teams_set: [],
 * //           package_description: "Compiler to generate binary data parsers in C++ / C# / Go / Java / JavaScript / Lua / Perl / PHP / Python / Ruby ",
 * //           package_longDescription: null,
 * //           package_hydra: null,
 * //           package_system: "x86_64-linux",
 * //           package_homepage: [Array],
 * //           package_position: "pkgs/by-name/ka/kaitai-struct-compiler/package.nix:29"
 * //         },
 * //         sort: [ 58.903957, "kaitai-struct-compiler", "0.10" ],
 * //         matched_queries: [ "multi_match_kaitai", "filter_packages" ]
 * //       },
 * //       {
 * //         _index: "nixos-43-25.05-d179d77c139e0a3f5c416477f7747e9d6b7ec315",
 * //         _type: "_doc",
 * //         _id: "E5hLL5kBwGFDkYUDK8DX",
 * //         _score: 15.069404,
 * //         _source: {
 * //           type: "package",
 * //           package_attr_name: "python313Packages.kaitaistruct",
 * //           package_attr_set: "python313Packages",
 * //           package_pname: "python3.13-kaitaistruct",
 * //           package_pversion: "0.10",
 * //           package_platforms: [Array],
 * //           package_outputs: [Array],
 * //           package_default_output: "out",
 * //           package_programs: [],
 * //           package_license: [Array],
 * //           package_license_set: [Array],
 * //           package_maintainers: [],
 * //           package_maintainers_set: [],
 * //           package_teams: [],
 * //           package_teams_set: [],
 * //           package_description: "Kaitai Struct: runtime library for Python",
 * //           package_longDescription: null,
 * //           package_hydra: null,
 * //           package_system: "x86_64-linux",
 * //           package_homepage: [Array],
 * //           package_position: "pkgs/development/python-modules/kaitaistruct/default.nix:49"
 * //         },
 * //         sort: [ 15.069404, "python313Packages.kaitaistruct", "0.10" ],
 * //         matched_queries: [ "multi_match_kaitai", "filter_packages" ]
 * //       },
 * //       {
 * //         _index: "nixos-43-25.05-d179d77c139e0a3f5c416477f7747e9d6b7ec315",
 * //         _type: "_doc",
 * //         _id: "sphKL5kBwGFDkYUD2Xnr",
 * //         _score: 15.069404,
 * //         _source: {
 * //           type: "package",
 * //           package_attr_name: "python312Packages.kaitaistruct",
 * //           package_attr_set: "python312Packages",
 * //           package_pname: "python3.12-kaitaistruct",
 * //           package_pversion: "0.10",
 * //           package_platforms: [Array],
 * //           package_outputs: [Array],
 * //           package_default_output: "out",
 * //           package_programs: [],
 * //           package_license: [Array],
 * //           package_license_set: [Array],
 * //           package_maintainers: [],
 * //           package_maintainers_set: [],
 * //           package_teams: [],
 * //           package_teams_set: [],
 * //           package_description: "Kaitai Struct: runtime library for Python",
 * //           package_longDescription: null,
 * //           package_hydra: null,
 * //           package_system: "x86_64-linux",
 * //           package_homepage: [Array],
 * //           package_position: "pkgs/development/python-modules/kaitaistruct/default.nix:49"
 * //         },
 * //         sort: [ 15.069404, "python312Packages.kaitaistruct", "0.10" ],
 * //         matched_queries: [ "multi_match_kaitai", "filter_packages" ]
 * //       }
 * //     ]
 * //   },
 * //   aggregations: {
 * //     all: {
 * //       doc_count: 151457,
 * //       package_attr_set: {
 * //         doc_count_error_upper_bound: 0,
 * //         sum_other_doc_count: 8694,
 * //         buckets: [
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object]
 * //         ]
 * //       },
 * //       package_teams_set: {
 * //         doc_count_error_upper_bound: 0,
 * //         sum_other_doc_count: 1155,
 * //         buckets: [
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object]
 * //         ]
 * //       },
 * //       package_maintainers_set: {
 * //         doc_count_error_upper_bound: 0,
 * //         sum_other_doc_count: 55729,
 * //         buckets: [
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object]
 * //         ]
 * //       },
 * //       package_platforms: {
 * //         doc_count_error_upper_bound: 0,
 * //         sum_other_doc_count: 4440695,
 * //         buckets: [
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object]
 * //         ]
 * //       },
 * //       package_license_set: {
 * //         doc_count_error_upper_bound: 0,
 * //         sum_other_doc_count: 12833,
 * //         buckets: [
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object], [Object],
 * //           [Object], [Object]
 * //         ]
 * //       }
 * //     },
 * //     package_attr_set: {
 * //       doc_count_error_upper_bound: 0,
 * //       sum_other_doc_count: 0,
 * //       buckets: [
 * //         { key: "No package set", doc_count: 1 },
 * //         { key: "python312Packages", doc_count: 1 },
 * //         { key: "python313Packages", doc_count: 1 }
 * //       ]
 * //     },
 * //     package_teams_set: {
 * //       doc_count_error_upper_bound: 0,
 * //       sum_other_doc_count: 0,
 * //       buckets: []
 * //     },
 * //     package_maintainers_set: {
 * //       doc_count_error_upper_bound: 0,
 * //       sum_other_doc_count: 0,
 * //       buckets: [ { key: "Luis Hebendanz", doc_count: 1 } ]
 * //     },
 * //     package_platforms: {
 * //       doc_count_error_upper_bound: 0,
 * //       sum_other_doc_count: 45,
 * //       buckets: [
 * //         { key: "aarch64-darwin", doc_count: 3 },
 * //         { key: "aarch64-freebsd", doc_count: 3 },
 * //         { key: "aarch64-linux", doc_count: 3 },
 * //         { key: "armv5tel-linux", doc_count: 3 },
 * //         { key: "armv6l-linux", doc_count: 3 },
 * //         { key: "armv7a-linux", doc_count: 3 },
 * //         { key: "armv7l-linux", doc_count: 3 },
 * //         { key: "i686-cygwin", doc_count: 3 },
 * //         { key: "i686-freebsd", doc_count: 3 },
 * //         { key: "i686-linux", doc_count: 3 },
 * //         { key: "loongarch64-linux", doc_count: 3 },
 * //         { key: "m68k-linux", doc_count: 3 },
 * //         { key: "microblaze-linux", doc_count: 3 },
 * //         { key: "microblazeel-linux", doc_count: 3 },
 * //         { key: "mips-linux", doc_count: 3 },
 * //         { key: "mips64-linux", doc_count: 3 },
 * //         { key: "mips64el-linux", doc_count: 3 },
 * //         { key: "mipsel-linux", doc_count: 3 },
 * //         { key: "powerpc64-linux", doc_count: 3 },
 * //         { key: "powerpc64le-linux", doc_count: 3 }
 * //       ]
 * //     },
 * //     package_license_set: {
 * //       doc_count_error_upper_bound: 0,
 * //       sum_other_doc_count: 0,
 * //       buckets: [
 * //         { key: "MIT License", doc_count: 2 },
 * //         { key: "GNU General Public License v3.0 only", doc_count: 1 }
 * //       ]
 * //     }
 * //   },
 * //   channel: "nixos-25.05"
 * // }
 * ```
 */
export async function searchNixpkgs(query, { channel=null, channelPrefix=null, localStorageKey=undefined, fallbackIncrementAttempts=10, localStorage=globalThis.localStorage}={}) {
    if (localStorageKey === undefined) {
        console.warn(`searchNixpkgs was called without a localStorageKey argument. Without localStorage this function is likely to fail or become very slow within a year or two. This is because the search URL changes over time. This function detects the new URL, but that new URL can only be cached if this function has access to localStorage. Set localStorageKey to null to simply ignore the problem and disable this message.`)
    }
    // 
    // mitigating the fact that "latest-44-nixos-25.05" url that is probably going to change over time
    //
    const noChannelGiven = !channel
    if (!channelPrefix) {
        if (channelPrefixCache) {
            channelPrefix = channelPrefixCache
        } else if (localStorageKey && typeof localStorage !== "undefined") {
            try {
                var { channelPrefix } = JSON.parse(localStorage.getItem(localStorageKey))
                // set runtime cache based on localStorage cache
                channelPrefixCache = channelPrefix
            } catch (error) {
                
            }
        }
    }
    if (!channel) {
        if (channelCache) {
            channel = channelCache
        } else if (localStorageKey && typeof localStorage !== "undefined") {
            try {
                var { channel } = JSON.parse(localStorage.getItem(localStorageKey))
                // set runtime cache based on localStorage cache
                channelCache = channel
            } catch (error) {
                
            }
        }
    }
    channel = channel || "nixos-25.05"
    channelPrefix = channelPrefix || "latest-44-"

    const url = `https://search.nixos.org/backend/${channelPrefix}${channel}/_search`
    const body = {
        from: 0,
        size: 50,
        sort: [{ _score: "desc" }, { package_attr_name: "desc" }, { package_pversion: "desc" }],
        aggs: {
            package_attr_set: { terms: { field: "package_attr_set", size: 20 } },
            package_license_set: { terms: { field: "package_license_set", size: 20 } },
            package_maintainers_set: { terms: { field: "package_maintainers_set", size: 20 } },
            package_teams_set: { terms: { field: "package_teams_set", size: 20 } },
            package_platforms: { terms: { field: "package_platforms", size: 20 } },
            all: {
                global: {},
                aggregations: {
                    package_attr_set: { terms: { field: "package_attr_set", size: 20 } },
                    package_license_set: { terms: { field: "package_license_set", size: 20 } },
                    package_maintainers_set: { terms: { field: "package_maintainers_set", size: 20 } },
                    package_teams_set: { terms: { field: "package_teams_set", size: 20 } },
                    package_platforms: { terms: { field: "package_platforms", size: 20 } },
                },
            },
        },
        query: {
            bool: {
                filter: [
                    { term: { type: { value: "package", _name: "filter_packages" } } },
                    {
                        bool: {
                            must: [{ bool: { should: [] } }, { bool: { should: [] } }, { bool: { should: [] } }, { bool: { should: [] } }, { bool: { should: [] } }],
                        },
                    },
                ],
                must_not: [],
                must: [
                    {
                        dis_max: {
                            tie_breaker: 0.7,
                            queries: [
                                {
                                    multi_match: {
                                        type: "cross_fields",
                                        query,
                                        analyzer: "whitespace",
                                        auto_generate_synonyms_phrase_query: false,
                                        operator: "and",
                                        _name: `multi_match_${query}`,
                                        fields: ["package_attr_name^9", "package_attr_name.*^5.4", "package_programs^9", "package_programs.*^5.4", "package_pname^6", "package_pname.*^3.6", "package_description^1.3", "package_description.*^0.78", "package_longDescription^1", "package_longDescription.*^0.6", "flake_name^0.5", "flake_name.*^0.3"],
                                    },
                                },
                                {
                                    wildcard: {
                                        package_attr_name: {
                                            value: `*${query}*`,
                                            case_insensitive: true,
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    }

    const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0",
            Accept: "*/*",
            "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
            Authorization: "Basic YVdWU0FMWHBadjpYOGdQSG56TDUyd0ZFZWt1eHNmUTljU2g=",
            "Content-Type": "application/json",
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        if (fallbackIncrementAttempts > 0) {
            console.warn(`default nix search url failed, checking if it is due to the url needing an increment`,fallbackIncrementAttempts)
            // 
            // failure could be due to "latest-44-nixos-25.05" changing over time, try incrementing it
            // 
            let latestAttemptCount = fallbackIncrementAttempts
            while (latestAttemptCount > 0) {
                latestAttemptCount--
                // increment the "latest-44-" part
                channelPrefix = channelPrefix.split(/(\d+)/).map(each=>{
                    if (each.match(/^\d+$/)) {
                        return (each-0)+1
                    }
                    return each
                }).join("")

                try {
                    const result = await searchNixpkgs(query, { channelPrefix, fallbackIncrementAttempts: 0, channel, localStorageKey: null })
                    console.warn(`new url worked: ${`https://search.nixos.org/backend/${channelPrefix}${channel}/_search`}`,fallbackIncrementAttempts)
                    // if it works, cache it for next time
                    channelPrefixCache = channelPrefix
                    if (localStorageKey && typeof localStorage !== "undefined") {
                        console.warn(`caching new url to localStorage for future runs`)
                        localStorage.setItem(localStorageKey, JSON.stringify({ channelPrefix, channel }))
                    }
                    return result
                } catch (error) {
                    console.warn(`url ${(fallbackIncrementAttempts-latestAttemptCount)+1} failed ${`https://search.nixos.org/backend/${channelPrefix}${channel}/_search`}`)
                    if (noChannelGiven) {
                        const channelBefore = channel
                        let latestVersionAttemptCount = fallbackIncrementAttempts
                        while (latestVersionAttemptCount > 0) {
                            latestVersionAttemptCount--
                            // try incrementing channel number if it exists
                            // 25.05 -> 25.11
                            // 25.11 -> 26.05
                            // 26.05 -> 26.11
                            // etc
                            let match
                            if (match=channel.match(/(\d+)\.(\d+)/)) {
                                let shouldIncrementSmall = (match[2] == "05")
                                let shouldIncrementNext = !shouldIncrementSmall
                                channel = channel.split(/(\d+)/).map(each=>{
                                    if (each.match(/^\d+$/)) {
                                        if (shouldIncrementNext) {
                                            shouldIncrementNext = false
                                            return (each-0)+1
                                        } else if (shouldIncrementSmall && each == "05") {
                                            shouldIncrementSmall = false
                                            return "11"
                                        }
                                    }
                                    return each
                                }).join("")
                            }

                            try {
                                const result = await searchNixpkgs(query, { channelPrefix, fallbackIncrementAttempts: 0, channel, localStorageKey: null })
                                console.warn(`new url worked: ${`https://search.nixos.org/backend/${channelPrefix}${channel}/_search`}`,fallbackIncrementAttempts)
                                // if it works, cache it for next time
                                channelCache = channel
                                if (localStorageKey && typeof localStorage !== "undefined") {
                                    console.warn(`caching new url to localStorage for future runs`)
                                    localStorage.setItem(localStorageKey, JSON.stringify({ channelPrefix, channel }))
                                }
                                return result
                            } catch (error) {
                            }
                        }
                        channel = channelBefore
                    }
                }
            }
        }
        throw new Error(`NixOS search failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    data.channel = channel
    return data
}