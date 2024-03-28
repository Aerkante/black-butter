export function urlBuilder(
    base: string,
    query: Record<string, unknown> = {},
    param: string | number = ''
) {
    let url = base
    if (param) url = `${url}/${param}`

    const queryString = Object.keys(query)
        .map(key => {
            const value = query[key] as string
            return `${key}=${value}`
        })
        .join('&')

    if (queryString.length) url = `${url}?${queryString}`

    return url
}
