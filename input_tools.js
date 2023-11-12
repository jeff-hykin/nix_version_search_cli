import { Command, EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts"
import { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts"
import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"

import { Input } from "../deno-cliffy/prompt/input.ts"
// import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/input.ts"
import { stripColor } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/deps.ts"
import { distance } from "https://deno.land/x/cliffy@v1.0.0-rc.3/_utils/distance.ts"
import { search } from "./search_tools.js"

function selectOne({ message, showList, showInfo, options, optionDescriptions }) {
    let optionStrings
    if (options instanceof Array) {
        optionStrings = options
        options = Object.fromEntries(optionStrings.map(each=>[each,each]))
    } else {
        optionStrings = Object.keys(options)
    }
    const { rows, columns } = Deno.consoleSize()
    const maxOptionWidth = columns-3
    const longest = Math.min(columns-3, Math.max(...optionStrings.map(each=>each.length)))
    const suggestions = optionStrings
    const suggestionDescriptions = []
    for (let [suggestion, description] of zip(suggestions, optionDescriptions)) {
        suggestionDescriptions.push(
            stripColor(suggestion.padEnd(longest," ")+": "+description).slice(0,maxOptionWidth).slice(suggestion.length+2)
        )
    }
    
    return Input.prompt({
        message,
        list: showList,
        info: showInfo,
        suggestions,
        suggestionDescriptions,
    }).then((answer)=>{
        if (optionStrings.includes(answer)) {
            return options[answer]
        } else {
            // Note: this sort NEEDs to exactly match https://github.com/c4spar/deno-cliffy/blob/aa1311f8d0891f535805395b0fb7d99de0b01b74/prompt/_generic_suggestions.ts#L242
            //       in order for it to work
            //       (this is why we pin versions)
            optionStrings = optionStrings.filter((value) =>
                stripColor(value.toString())
                .toLowerCase()
                .startsWith(answer)
            ).sort((a, b) =>
                distance((a || a).toString(), answer) -
                distance((b || b).toString(), answer)
            )
            // return closest match
            return options[optionStrings[0]]
        }
    })
}