import { zip, enumerate, count, permute, combinations, wrapAroundGet } from "https://deno.land/x/good@1.5.1.0/array.js"

export const versionToList = version=>`${version}`.split(".").map(each=>each.split(/(?<=\d)(?=\D)|(?<=\D)(?=\d)/)).flat(1).map(each=>each.match(/^\d+$/)?each-0:each)

export const versionSort = ({array, elementToVersion})=>{
    return [...array].sort(
        (a, b) => {
            for (let [numberForA, numberForB ] of zip(versionToList(elementToVersion(a)), versionToList(elementToVersion(b)))) {
                if (numberForA != numberForB) {
                    if (typeof numberForB == "number" && typeof numberForB == "number") {
                        return numberForB - numberForA
                    } else if (typeof numberForB == "number") {
                        return numberForB
                    } else if (typeof numberForA == "number") {
                        return - numberForA
                    } else {
                        return `${numberForB}`.localeCompare(numberForA)
                    }
                }
            }
            return 0
        }
    )
}