import { LocalizationText, OptionName, SearchToggleOption } from 'sonolus-core'

export type SearchToggleOptionInfo = {
    name: LocalizationText
    type: 'toggle'
    def: 0 | 1
}

export function toSearchToggleOption(
    localize: (text: LocalizationText) => string,
    query: string,
    info: SearchToggleOptionInfo
): SearchToggleOption {
    return {
        query,
        name: localize(info.name) as OptionName,
        type: 'toggle',
        def: info.def,
    }
}
