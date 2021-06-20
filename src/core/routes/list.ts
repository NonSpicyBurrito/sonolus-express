import { Request, Response } from 'express'
import { toList } from '../../api/list'
import { DB } from '../../jtd/db'
import { LocalizationText } from '../../jtd/localization-text'
import { Promisable } from '../../utils/types'
import { Sonolus } from '../sonolus'

const perPage = 20

export type ListHandler<T> = (
    sonolus: Sonolus,
    keywords: string | undefined,
    page: number
) => Promisable<{
    pageCount: number
    infos: T[]
}>

export function defaultListHandler<T>(
    infos: T[],
    props: (keyof T)[],
    keywords: string | undefined,
    page: number
): {
    pageCount: number
    infos: T[]
} {
    const filteredInfos = filterInfos(infos, props, keywords)

    return {
        pageCount: Math.ceil(filteredInfos.length / perPage),
        infos: filteredInfos.slice(page * perPage, (page + 1) * perPage),
    }
}

export async function listRouteHandler<T, U>(
    sonolus: Sonolus,
    handler: ListHandler<T>,
    toItem: (
        db: DB,
        localize: (text: LocalizationText) => string,
        info: T
    ) => U,
    req: Request<
        unknown,
        unknown,
        unknown,
        { keywords?: string; page?: string }
    >,
    res: Response
): Promise<void> {
    res.json(
        toList(
            await handler(sonolus, req.query.keywords, +(req.query.page || 0)),
            (info) => toItem(sonolus.db, req.localize, info)
        )
    )
}

function filterInfos<T>(
    infos: T[],
    props: (keyof T)[],
    keywords: string | undefined
) {
    if (!keywords) return infos

    const terms = keywords.trim().toLowerCase().split(' ')
    if (terms.length === 0) return infos

    return infos
        .map((info) => ({
            info,
            results: terms.map((term) => matchTerm(info, props, term)),
        }))
        .filter(({ results }) => results.every((result) => result > 0))
        .map(({ info, results }) => ({
            info,
            sum: results.reduce((sum, result) => sum + result, 0),
        }))
        .sort((a, b) => b.sum - a.sum)
        .map(({ info }) => info)
}

function matchTerm<T>(info: T, keywordProps: (keyof T)[], term: string) {
    let result = 0
    for (const prop of keywordProps) {
        const value = info[prop]

        let texts: string[]
        switch (typeof value) {
            case 'number':
                texts = [value.toString()]
                break
            case 'string':
                texts = [value.toLowerCase()]
                break
            case 'object':
                texts = Object.values(value).map((text) => text.toLowerCase())
                break
            default:
                continue
        }

        for (const text of texts) {
            if (text === term) {
                result = 2
                break
            } else if (text.includes(term)) {
                result = 1
            }
        }
    }
    return result
}
